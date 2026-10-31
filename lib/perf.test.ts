/**
 * Same isolation as lib/db.test.ts: SKULD_DB points at a temp file before lib/db loads.
 * The endpoint runner is checked against a Bun.serve stub standing in for the backend.
 */
import { test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let db: typeof import("./db").db;
let perf: typeof import("./perf");
let server: ReturnType<typeof Bun.serve>;
const seen: { path: string; auth: string | null }[] = [];

beforeAll(async () => {
  process.env.SKULD_DB = join(mkdtempSync(join(tmpdir(), "skuld-perf-test-")), "test.db");
  ({ db } = await import("./db"));
  perf = await import("./perf");
  server = Bun.serve({
    port: 0,
    async fetch(req) {
      const { pathname } = new URL(req.url);
      seen.push({ path: pathname, auth: req.headers.get("authorization") });
      if (pathname === "/login") return Response.json({ id: "u1", token: "t0k" });
      if (pathname === "/x/u1") return new Response("x".repeat(1234));
      return new Response("nope", { status: 404 });
    },
  });
});

afterAll(() => server.stop());

test("runPerf logs in, fills {userId}, times each GET 10x (+1 warm-up) and never sends a write", async () => {
  const p = db
    .prepare(
      `INSERT INTO projects (name, root_dir, test_command, enable_perf, api_base_url, login_path, login_email, login_password)
       VALUES ('p', '/tmp', 'true', 1, ?, '/login', 'a@b', 'pw')`,
    )
    .run(`http://localhost:${server.port}/`);
  const projectId = Number(p.lastInsertRowid);
  const add = db.prepare("INSERT INTO perf_entries (project_id, kind, method, path) VALUES (?, 'endpoint', 'GET', ?)");
  add.run(projectId, "/x/{userId}");
  add.run(projectId, "/missing");
  db.prepare("INSERT INTO perf_entries (project_id, kind, method, path) VALUES (?, 'endpoint', 'DELETE', '/x/{userId}')").run(projectId);

  const res = await perf.runPerf(projectId, "endpoint");
  expect(res.ok).toBe(true);
  expect(seen.find((s) => s.path === "/x/u1")?.auth).toBe("Bearer t0k");
  expect(seen.filter((s) => s.path === "/x/u1").length).toBe(11); // the DELETE never went out
  expect(seen.filter((s) => s.path === "/missing").length).toBe(1); // an error answer is not repeated

  const rows = db
    .prepare("SELECT label, status, bytes, ms, p95, error FROM perf_results WHERE run_id = ? ORDER BY label")
    .all((res as { runId: number }).runId) as { label: string; status: number; bytes: number; ms: number; p95: number; error: string }[];
  expect(rows.map((r) => [r.label, r.status, r.bytes, r.error])).toEqual([
    ["DELETE /x/{userId}", 0, 0, "only GET endpoints are measured"],
    ["GET /missing", 404, 4, ""],
    ["GET /x/{userId}", 200, 1234, ""],
  ]);
  const ok = rows[2]!;
  expect(ok.ms > 0 && ok.p95 >= ok.ms).toBe(true);

  const run = db.prepare("SELECT failed, total_bytes FROM perf_runs WHERE id = ?").get((res as { runId: number }).runId) as {
    failed: number;
    total_bytes: number;
  };
  expect(run).toEqual({ failed: 2, total_bytes: 1238 });
});

test("percentile is nearest-rank", () => {
  const xs = [5, 1, 4, 2, 3, 10, 9, 8, 7, 6];
  expect(perf.percentile(xs, 95)).toBe(10);
  expect(perf.percentile(xs, 50)).toBe(5);
  expect(perf.percentile([], 95)).toBe(0);
});

test("parseHar takes the median of sitespeed.io's runs per URL", () => {
  const page = (id: string, n: number, onLoad: number) => ({
    id,
    title: `http://s/a run ${n}`,
    _url: "http://s/a",
    pageTimings: { onLoad, _firstContentfulPaint: onLoad / 2, _largestContentfulPaint: onLoad },
    _googleWebVitals: { ttfb: 10 * n },
  });
  const entry = (pageref: string, bytes: number) => ({ pageref, response: { status: 200, _transferSize: bytes } });
  const [m] = perf.parseHar({
    log: {
      pages: [page("p1", 1, 100), page("p2", 2, 300), page("p3", 3, 200)],
      entries: [entry("p1", 10), entry("p1", 20), entry("p2", 40), entry("p3", 30), entry("p3", 30)],
    },
  });
  expect(m).toEqual({ url: "http://s/a", status: 200, ms: 200, ttfb: 20, bytes: 40, requests: 2, fcp: 100, lcp: 200 });
});
