import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { join, isAbsolute } from "node:path";
import { db, getProject, listSuites, autoImportDiscoveredTests, type Project, type Suite } from "./db";
import { parseJUnit, parseCobertura, type JUnitResult, type CoberturaResult } from "./parse";

const pexec = promisify(execFile);

type Sh = { code: number; out: string };

async function sh(cmd: string, cwd: string): Promise<Sh> {
  try {
    const { stdout, stderr } = await pexec("/bin/sh", ["-c", cmd], {
      cwd,
      maxBuffer: 20 * 1024 * 1024,
      timeout: 20 * 60 * 1000, // ponytail: blocking 20-min ceiling per suite; add a job queue if suites outgrow it
    });
    return { code: 0, out: stdout + stderr };
  } catch (e) {
    const err = e as { code?: number; stdout?: string; stderr?: string; message?: string };
    return { code: err.code ?? 1, out: (err.stdout ?? "") + (err.stderr ?? "") + (err.message ?? "") };
  }
}

async function git(repo: string, args: string[]): Promise<Sh> {
  try {
    const { stdout, stderr } = await pexec("git", ["-C", repo, ...args], { maxBuffer: 8 * 1024 * 1024 });
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
  junitXml: string;
  coverage: CoberturaResult;
  coverageXml: string;
};
type SuiteFail = { ok: false; suite: Suite; shellCode: number; shellOut: string; error: string };
type SuiteRunResult = SuiteOk | SuiteFail;

async function runSuite(project: Project, suite: Suite): Promise<SuiteRunResult> {
  const shell = await sh(suite.test_command, project.root_dir);
  const junitPath = resolveIn(project.root_dir, suite.junit_path);
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

  let coverageXml = "";
  let coverage: CoberturaResult = { lineRate: 0, branchRate: 0, files: [] };
  if (suite.coverage_xml_path) {
    try {
      coverageXml = await readFile(resolveIn(project.root_dir, suite.coverage_xml_path), "utf8");
      coverage = parseCobertura(coverageXml);
    } catch {
      /* coverage optional */
    }
  }
  return { ok: true, suite, shellCode: shell.code, shellOut: shell.out, junit, junitXml, coverage, coverageXml };
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

  const gitStatus = await snapshotToGit(project, runId, { started_at, results });
  db.prepare("UPDATE runs SET git_status = ? WHERE id = ?").run(gitStatus, runId);

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

async function snapshotToGit(
  project: Project,
  runId: number,
  d: { started_at: string; results: SuiteRunResult[] },
): Promise<string> {
  const root = project.root_dir;
  const isRepo = await git(root, ["rev-parse", "--is-inside-work-tree"]);
  if (isRepo.code !== 0) return "not-a-repo";

  const stamp = d.started_at.replace(/[:.]/g, "-");
  const dir = join(root, ".skuld", "history");
  const ok = d.results.filter((r): r is SuiteOk => r.ok);

  try {
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, `${stamp}.json`),
      JSON.stringify(
        {
          run_id: runId,
          project: project.name,
          at: d.started_at,
          suites: ok.map((r) => ({
            id: r.suite.id,
            name: r.suite.name,
            language: r.suite.language,
            framework: r.suite.framework,
            layer: r.suite.layer,
            total: r.junit.total,
            passed: r.junit.passed,
            failed: r.junit.failed,
            skipped: r.junit.skipped,
            line_rate: r.coverage.lineRate,
            branch_rate: r.coverage.branchRate,
            files: r.coverage.files,
          })),
        },
        null,
        2,
      ),
    );
    for (const r of ok) {
      const suffix = `suite-${r.suite.id}-${r.suite.name || r.suite.framework}`.replace(/[^a-zA-Z0-9._-]/g, "_");
      await writeFile(join(dir, `${stamp}.${suffix}.junit.xml`), r.junitXml);
      if (r.coverageXml) await writeFile(join(dir, `${stamp}.${suffix}.coverage.xml`), r.coverageXml);
    }
  } catch {
    return "failed";
  }

  // scoped to .skuld only — never -A, so unrelated uncommitted work in the
  // project's own repo is never swept into a Skuld snapshot commit.
  const add = await git(root, ["add", "--", ".skuld"]);
  if (add.code !== 0) return "failed";
  const total = ok.reduce((n, r) => n + r.junit.total, 0);
  const passed = ok.reduce((n, r) => n + r.junit.passed, 0);
  const files = ok.flatMap((r) => r.coverage.files);
  const validSum = files.reduce((n, f) => n + f.lines_valid, 0);
  const coveredSum = files.reduce((n, f) => n + f.lines_covered, 0);
  const line_rate = validSum > 0 ? coveredSum / validSum : 0;
  const commit = await git(root, [
    "commit",
    "-m",
    `skuld: ${d.started_at} (${passed}/${total} pass, ${(line_rate * 100).toFixed(1)}% lines)`,
  ]);
  if (commit.code !== 0 && !/nothing to commit/i.test(commit.out)) return "failed";

  if (project.git_push) {
    const push = await git(root, ["push"]);
    return push.code === 0 ? "pushed" : "failed";
  }
  return "committed";
}
