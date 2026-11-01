import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  db,
  getProject,
  listPerfEntries,
  REPORTS_DIR,
  type PerfEntry,
  type PerfKind,
  type Project,
} from "./db";
import { sh, type RunResult } from "./run";
import { DEFAULT_SITESPEED_COMMAND } from "./presets";

const REQUEST_TIMEOUT_MS = 30_000;
// Timed calls per endpoint, after one untimed warm-up call.
const SAMPLES = 10;

type Result = {
  entry: PerfEntry;
  status: number;
  ms: number;
  p95: number;
  ttfb: number;
  bytes: number;
  requests: number;
  fcp: number;
  lcp: number;
  error: string;
  reportPath: string;
};

type Measured = { results: Result[]; reportDir: string; log: string } | { error: string };

export function joinUrl(base: string, path: string): string {
  return base.replace(/\/+$/, "") + (path.startsWith("/") ? path : `/${path}`);
}

/** The {placeholder} names in an endpoint path. */
export function pathVars(path: string): string[] {
  return [...path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!);
}

/** Fills every {name} from vars; empty values count as missing. */
export function fillPath(path: string, vars: Record<string, string>): { path: string } | { missing: string[] } {
  const missing = pathVars(path).filter((v) => !vars[v]);
  if (missing.length) return { missing };
  return { path: path.replace(/\{(\w+)\}/g, (_, v: string) => encodeURIComponent(vars[v]!)) };
}

/** The stored perf_vars as strings; anything unparseable reads as no variables. */
export function parseVars(json: string): Record<string, string> {
  try {
    const o = JSON.parse(json || "{}");
    if (!o || typeof o !== "object" || Array.isArray(o)) return {};
    return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v == null ? "" : String(v)]));
  } catch {
    return {};
  }
}

export async function runPerf(projectId: number, kind: PerfKind): Promise<RunResult> {
  const project = getProject(projectId);
  if (!project) return { ok: false, error: "project not found" };
  const entries = listPerfEntries(projectId, kind);
  if (entries.length === 0) return { ok: false, error: `no ${kind}s to measure yet — add one first` };

  const started_at = new Date().toISOString();
  const out = kind === "endpoint" ? await measureEndpoints(project, entries) : await measurePages(project, entries, started_at);
  if ("error" in out) return { ok: false, error: out.error };

  const runId = insertPerfRun(project.id, kind, started_at, out.results, out.reportDir, out.log);
  return { ok: true, runId };
}

// --- endpoints: Skuld calls the backend itself ------------------------------------

async function login(project: Project): Promise<{ token: string; userId: string } | { error: string }> {
  if (!project.login_email) return { token: "", userId: "" };
  try {
    const res = await fetch(joinUrl(project.api_base_url, project.login_path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: project.login_email, password: project.login_password }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) return { error: `login answered ${res.status}: ${(await res.text()).slice(0, 300)}` };
    const body = (await res.json()) as Record<string, unknown>;
    // ponytail: Mimird's login shape ({id, token}); add a field-mapping setting for other backends.
    const token = String(body.token ?? body.access_token ?? "");
    if (!token) return { error: "login response has no token" };
    return { token, userId: String(body.id ?? body.user_id ?? "") };
  } catch (e) {
    return { error: `login failed: ${(e as Error).message}` };
  }
}

async function measureEndpoints(project: Project, entries: PerfEntry[]): Promise<Measured> {
  if (!project.api_base_url) return { error: "set the API base URL in Run settings" };
  const auth = await login(project);
  if ("error" in auth) return auth;

  // Values from the JSON win, so {userId} can be pinned to another user.
  const vars = { userId: auth.userId, ...parseVars(project.perf_vars) };
  const headers: Record<string, string> = auth.token ? { Authorization: `Bearer ${auth.token}` } : {};
  const results: Result[] = [];
  // One request at a time, so they don't slow each other down.
  for (const entry of entries) {
    const r: Result = { entry, status: 0, ms: 0, p95: 0, ttfb: 0, bytes: 0, requests: 1, fcp: 0, lcp: 0, error: "", reportPath: "" };
    results.push(r);
    // Reads only: a run must never change the backend's data.
    if (entry.method !== "GET") {
      r.error = "only GET endpoints are measured";
      continue;
    }
    const filled = fillPath(entry.path, vars);
    if ("missing" in filled) {
      r.error = `no value for ${filled.missing.map((v) => `{${v}}`).join(", ")}`;
      continue;
    }
    const url = joinUrl(project.api_base_url, filled.path);
    const times: number[] = [];
    const ttfbs: number[] = [];
    try {
      for (let i = 0; i <= SAMPLES; i++) {
        const t0 = performance.now();
        const res = await fetch(url, { headers, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
        const ttfb = performance.now() - t0;
        r.bytes = (await res.arrayBuffer()).byteLength;
        r.status = res.status;
        if (i > 0) {
          times.push(performance.now() - t0);
          ttfbs.push(ttfb);
        }
        if (!res.ok) break; // an error answer isn't worth timing ten times
      }
    } catch (e) {
      r.error = (e as Error).message;
    }
    r.ms = median(times);
    r.p95 = percentile(times, 95);
    r.ttfb = median(ttfbs);
  }
  return { results, reportDir: "", log: "" };
}

// --- pages: sitespeed.io loads them in a real browser ------------------------------

function shellQuote(s: string): string {
  return `'${s.replaceAll("'", `'\\''`)}'`;
}

async function measurePages(project: Project, entries: PerfEntry[], started_at: string): Promise<Measured> {
  if (!project.site_url) return { error: "set the site URL in Settings → Performance" };
  const reportDir = `${project.id}-${started_at.replace(/[:.]/g, "-")}`;
  const cwd = join(REPORTS_DIR, reportDir);
  await mkdir(cwd, { recursive: true });
  await writeFile(join(cwd, "urls.txt"), entries.map((e) => joinUrl(project.site_url, e.path)).join("\n") + "\n");

  let cmd = project.sitespeed_command || DEFAULT_SITESPEED_COMMAND;
  if (project.site_cookie) cmd += ` --cookie ${shellQuote(project.site_cookie)}`;
  // Skuld's own node_modules/.bin first, so the bundled sitespeed.io is found.
  const PATH = `${join(process.cwd(), "node_modules", ".bin")}:${process.env.PATH ?? ""}`;
  const shell = await sh(cmd, cwd, { ...process.env, PATH });

  const pages = new Map<string, PageMetrics & { reportPath: string }>();
  try {
    const files = (await readdir(cwd, { recursive: true })).filter((f) => f.endsWith("browsertime.har"));
    for (const f of files) {
      // sitespeed.io writes each page's report one level above its data/browsertime.har.
      const reportPath = join(reportDir, dirname(dirname(f)), "index.html");
      for (const p of parseHar(JSON.parse(await readFile(join(cwd, f), "utf8")))) pages.set(p.url, { ...p, reportPath });
    }
  } catch {
    /* no report: every entry is reported as failed below */
  }
  if (pages.size === 0) return { error: `sitespeed.io exited ${shell.code} without a report\n${shell.out.slice(-2000)}` };

  const results: Result[] = entries.map((entry) => {
    const url = joinUrl(project.site_url, entry.path);
    const p = pages.get(url) ?? pages.get(url.replace(/\/$/, "")) ?? pages.get(`${url}/`);
    return p
      ? { entry, status: p.status, ms: p.ms, p95: 0, ttfb: p.ttfb, bytes: p.bytes, requests: p.requests, fcp: p.fcp, lcp: p.lcp, error: "", reportPath: p.reportPath }
      : { entry, status: 0, ms: 0, p95: 0, ttfb: 0, bytes: 0, requests: 0, fcp: 0, lcp: 0, error: "missing from the sitespeed.io report", reportPath: "" };
  });
  return { results, reportDir, log: shell.out.slice(-20000) };
}

export type PageMetrics = {
  url: string;
  status: number;
  ms: number;
  ttfb: number;
  bytes: number;
  requests: number;
  fcp: number;
  lcp: number;
};

/** Nearest-rank percentile; with 10 samples p95 is the slowest one. */
export function percentile(xs: number[], p: number): number {
  const s = [...xs].sort((a, b) => a - b);
  return s.length === 0 ? 0 : s[Math.ceil((p / 100) * s.length) - 1]!;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length === 0 ? 0 : s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

type Har = {
  log: {
    pages: {
      id: string;
      title?: string;
      _url?: string;
      pageTimings?: Record<string, unknown>;
      _googleWebVitals?: { ttfb?: number };
    }[];
    entries: {
      pageref?: string;
      response: { status: number; bodySize?: number; _transferSize?: number };
      timings?: { wait?: number };
    }[];
  };
};

/** One row per URL: the median of every run sitespeed.io made of it. */
export function parseHar(har: Har): PageMetrics[] {
  const runs = new Map<string, Omit<PageMetrics, "url">[]>();
  for (const page of har.log.pages) {
    const url = page._url ?? (page.title ?? "").replace(/ run \d+$/, "");
    const reqs = har.log.entries.filter((e) => e.pageref === page.id);
    const t = page.pageTimings ?? {};
    const num = (v: unknown) => (typeof v === "number" ? v : 0);
    const list = runs.get(url) ?? [];
    list.push({
      status: reqs[0]?.response.status ?? 0,
      ms: num(t.onLoad),
      ttfb: page._googleWebVitals?.ttfb ?? reqs[0]?.timings?.wait ?? 0,
      bytes: reqs.reduce((n, e) => n + Math.max(e.response._transferSize || e.response.bodySize || 0, 0), 0),
      requests: reqs.length,
      fcp: num(t._firstContentfulPaint),
      lcp: num(t._largestContentfulPaint),
    });
    runs.set(url, list);
  }
  return [...runs].map(([url, list]) => ({
    url,
    status: list[0]!.status,
    ms: median(list.map((r) => r.ms)),
    ttfb: median(list.map((r) => r.ttfb)),
    bytes: Math.round(median(list.map((r) => r.bytes))),
    requests: Math.round(median(list.map((r) => r.requests))),
    fcp: median(list.map((r) => r.fcp)),
    lcp: median(list.map((r) => r.lcp)),
  }));
}

// --- storage --------------------------------------------------------------------

function insertPerfRun(
  projectId: number,
  kind: PerfKind,
  started_at: string,
  results: Result[],
  reportDir: string,
  log: string,
): number {
  const failed = results.filter((r) => r.error || r.status === 0 || r.status >= 400).length;
  db.exec("BEGIN");
  try {
    const info = db
      .prepare(
        `INSERT INTO perf_runs (project_id, kind, started_at, finished_at, failed, total_ms, total_bytes, report_dir, log)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        projectId,
        kind,
        started_at,
        new Date().toISOString(),
        failed,
        results.reduce((n, r) => n + r.ms, 0),
        results.reduce((n, r) => n + r.bytes, 0),
        reportDir,
        log,
      );
    const runId = Number(info.lastInsertRowid);
    const ins = db.prepare(
      `INSERT INTO perf_results (run_id, entry_id, label, area, status, ms, p95, ttfb, bytes, requests, fcp, lcp, error, report_path)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const r of results) {
      const label = kind === "endpoint" ? `${r.entry.method} ${r.entry.path}` : r.entry.path;
      ins.run(runId, r.entry.id, label, r.entry.area, r.status, r.ms, r.p95, r.ttfb, r.bytes, r.requests, r.fcp, r.lcp, r.error, r.reportPath);
    }
    db.exec("COMMIT");
    return runId;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
