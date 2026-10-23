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

test("runPerf logs in, fills {userId}, sends the Bearer and stores status, size and time", async () => {
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

  const res = await perf.runPerf(projectId, "endpoint");
  expect(res.ok).toBe(true);
  expect(seen.find((s) => s.path === "/x/u1")?.auth).toBe("Bearer t0k");

  const rows = db
    .prepare("SELECT label, status, bytes, ms FROM perf_results WHERE run_id = ? ORDER BY label")
    .all((res as { runId: number }).runId) as { label: string; status: number; bytes: number; ms: number }[];
  expect(rows.map((r) => [r.label, r.status, r.bytes])).toEqual([
    ["GET /missing", 404, 4],
    ["GET /x/{userId}", 200, 1234],
  ]);
  expect(rows.every((r) => r.ms > 0)).toBe(true);

  const run = db.prepare("SELECT failed, total_bytes FROM perf_runs WHERE id = ?").get((res as { runId: number }).runId) as {
    failed: number;
    total_bytes: number;
  };
  expect(run).toEqual({ failed: 1, total_bytes: 1238 });
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
