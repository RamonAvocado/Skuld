import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, mkdir } from "node:fs/promises";
import { join, isAbsolute, dirname } from "node:path";
import { db, getProject, listSuites, autoImportDiscoveredTests, type Project, type Suite } from "./db";
import { parseJUnit, parseCobertura, parseLcov, type JUnitResult, type CoberturaResult } from "./parse";

const pexec = promisify(execFile);

type Sh = { code: number; out: string };

export async function sh(cmd: string, cwd: string, env?: NodeJS.ProcessEnv): Promise<Sh> {
  try {
    const { stdout, stderr } = await pexec("/bin/sh", ["-c", cmd], {
      cwd,
      env,
      maxBuffer: 20 * 1024 * 1024,
      timeout: 20 * 60 * 1000, // ponytail: blocking 20-min ceiling per suite; add a job queue if suites outgrow it
    });
    return { code: 0, out: stdout + stderr };
  } catch (e) {
    const err = e as { code?: number; stdout?: string; stderr?: string; message?: string };
    return { code: err.code ?? 1, out: (err.stdout ?? "") + (err.stderr ?? "") + (err.message ?? "") };
  }
}

function resolveIn(root: string, p: string): string {
  return isAbsolute(p) ? p : join(root, p);
}

export type RunResult = { ok: true; runId: number } | { ok: false; error: string };

type SuiteOk = {
  ok: true;
  suite: Suite;
  shellCode: number;
  shellOut: string;
  junit: JUnitResult;
  coverage: CoberturaResult;
};
type SuiteFail = { ok: false; suite: Suite; shellCode: number; shellOut: string; error: string };
type SuiteRunResult = SuiteOk | SuiteFail;

async function runSuite(project: Project, suite: Suite): Promise<SuiteRunResult> {
  const junitPath = resolveIn(project.root_dir, suite.junit_path);
  // Some reporters (bun test) don't create the report's folder themselves.
  await mkdir(dirname(junitPath), { recursive: true });
  const shell = await sh(suite.test_command, project.root_dir);
  let junitXml: string;
  try {
    junitXml = await readFile(junitPath, "utf8");
  } catch {
    return {
      ok: false,
      suite,
      shellCode: shell.code,
      shellOut: shell.out,
      error: `exited ${shell.code}, no JUnit report at ${junitPath}\n${shell.out.slice(-2000)}`,
    };
  }
  const junit = parseJUnit(junitXml);

  let coverage: CoberturaResult = { lineRate: 0, branchRate: 0, files: [] };
  if (suite.coverage_xml_path) {
    try {
      const text = await readFile(resolveIn(project.root_dir, suite.coverage_xml_path), "utf8");
      coverage = suite.coverage_xml_path.endsWith(".xml") ? parseCobertura(text) : parseLcov(text);
    } catch {
      /* coverage optional */
    }
  }
  return { ok: true, suite, shellCode: shell.code, shellOut: shell.out, junit, coverage };
}

export async function runProject(projectId: number): Promise<RunResult> {
  const project = getProject(projectId);
  if (!project) return { ok: false, error: "project not found" };

  const suites = listSuites(projectId);
  if (suites.length === 0) {
    return { ok: false, error: "project has no test suites configured — add one in Settings" };
  }

  const started_at = new Date().toISOString();
  const results: SuiteRunResult[] = [];
  for (const suite of suites) results.push(await runSuite(project, suite));
  const finished_at = new Date().toISOString();

  if (!results.some((r) => r.ok)) {
    const combined = results
      .map((r) => `===== ${r.suite.name || r.suite.framework} =====\n${(r as SuiteFail).error}`)
      .join("\n\n");
    return { ok: false, error: combined.slice(-4000) };
  }

  const exit_code = results.some((r) => !r.ok || r.shellCode !== 0) ? 1 : 0;
  const log = results
    .map((r) =>
      r.ok
        ? `===== suite: ${r.suite.name} (${r.suite.language}/${r.suite.framework}) — exit ${r.shellCode} =====\n${r.shellOut}`
        : `===== suite: ${r.suite.name} (${r.suite.language}/${r.suite.framework}) — FAILED =====\n${r.error}`,
    )
    .join("\n\n");

  const runId = insertRun(project, { started_at, finished_at, exit_code, results, log: log.slice(-20000) });
  autoImportDiscoveredTests(projectId, runId);

  return { ok: true, runId };
}

function insertRun(
  project: Project,
  d: { started_at: string; finished_at: string; exit_code: number; results: SuiteRunResult[]; log: string },
): number {
  const ok = d.results.filter((r): r is SuiteOk => r.ok);
  const total = ok.reduce((n, r) => n + r.junit.total, 0);
  const passed = ok.reduce((n, r) => n + r.junit.passed, 0);
  const failed = ok.reduce((n, r) => n + r.junit.failed, 0);
  const skipped = ok.reduce((n, r) => n + r.junit.skipped, 0);

  const files = ok.flatMap((r) => r.coverage.files);
  const validSum = files.reduce((n, f) => n + f.lines_valid, 0);
  const coveredSum = files.reduce((n, f) => n + f.lines_covered, 0);
  const line_rate = validSum > 0 ? coveredSum / validSum : 0;

  // No per-file branch counts exist to weight by (matches today's
  // already-approximate single-suite behavior) — unweighted mean across
  // suites that reported any coverage.
  const reporting = ok.filter((r) => r.coverage.files.length > 0);
  const branch_rate = reporting.length
    ? reporting.reduce((n, r) => n + r.coverage.branchRate, 0) / reporting.length
    : 0;

  const info = db
    .prepare(
      `INSERT INTO runs (project_id, started_at, finished_at, exit_code, total, passed, failed, skipped, line_rate, branch_rate, git_status, log)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'skipped', ?)`,
    )
    .run(project.id, d.started_at, d.finished_at, d.exit_code, total, passed, failed, skipped, line_rate, branch_rate, d.log);
  const runId = Number(info.lastInsertRowid);

  const dt = db.prepare(
    "INSERT INTO discovered_tests (run_id, project_id, suite_id, key, file, name, classname, outcome, duration_ms) VALUES (?,?,?,?,?,?,?,?,?)",
  );
  for (const r of ok) {
    for (const t of r.junit.tests) {
      dt.run(runId, project.id, r.suite.id, t.key, t.file, t.name, t.classname, t.outcome, t.duration_ms);
    }
  }

  const cf = db.prepare(
    "INSERT INTO coverage_files (run_id, suite_id, path, line_rate, lines_covered, lines_valid) VALUES (?,?,?,?,?,?)",
  );
  for (const r of ok) {
    for (const f of r.coverage.files) {
      cf.run(runId, r.suite.id, f.path, f.line_rate, f.lines_covered, f.lines_valid);
    }
  }

  return runId;
}
