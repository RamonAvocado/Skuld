import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { join, isAbsolute } from "node:path";
import { db, getProject, type Project } from "./db";
import { parseJUnit, parseCobertura } from "./parse";

const pexec = promisify(execFile);

type Sh = { code: number; out: string };

async function sh(cmd: string, cwd: string): Promise<Sh> {
  try {
    const { stdout, stderr } = await pexec("/bin/sh", ["-c", cmd], {
      cwd,
      maxBuffer: 20 * 1024 * 1024,
      timeout: 20 * 60 * 1000, // ponytail: blocking 20-min ceiling; add a job queue if suites outgrow it
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

export async function runProject(projectId: number): Promise<RunResult> {
  const project = getProject(projectId);
  if (!project) return { ok: false, error: "project not found" };

  const started_at = new Date().toISOString();
  const shell = await sh(project.test_command, project.root_dir);
  const finished_at = new Date().toISOString();

  const junitPath = resolveIn(project.root_dir, project.junit_path);
  let junitXml: string;
  try {
    junitXml = await readFile(junitPath, "utf8");
  } catch {
    return {
      ok: false,
      error: `test command exited ${shell.code} and no JUnit report at ${junitPath}\n\n${shell.out.slice(-4000)}`,
    };
  }
  const junit = parseJUnit(junitXml);

  let coverageXml = "";
  let coverage = { lineRate: 0, branchRate: 0, files: [] as ReturnType<typeof parseCobertura>["files"] };
  const covPath = resolveIn(project.root_dir, project.coverage_xml_path);
  try {
    coverageXml = await readFile(covPath, "utf8");
    coverage = parseCobertura(coverageXml);
  } catch {
    /* coverage optional */
  }

  const runId = insertRun(project, {
    started_at,
    finished_at,
    exit_code: shell.code,
    junit,
    coverage,
    log: shell.out.slice(-20000),
  });

  const gitStatus = await snapshotToGit(project, runId, {
    started_at,
    junit,
    coverage,
    junitXml,
    coverageXml,
  });
  db.prepare("UPDATE runs SET git_status = ? WHERE id = ?").run(gitStatus, runId);

  return { ok: true, runId };
}

function insertRun(
  project: Project,
  d: {
    started_at: string;
    finished_at: string;
    exit_code: number;
    junit: ReturnType<typeof parseJUnit>;
    coverage: { lineRate: number; branchRate: number; files: { path: string; line_rate: number; lines_covered: number; lines_valid: number }[] };
    log: string;
  },
): number {
  const tx = db.prepare(`
    INSERT INTO runs (project_id, started_at, finished_at, exit_code, total, passed, failed, skipped, line_rate, branch_rate, git_status, log)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'skipped', ?)
  `);
  const info = tx.run(
    project.id,
    d.started_at,
    d.finished_at,
    d.exit_code,
    d.junit.total,
    d.junit.passed,
    d.junit.failed,
    d.junit.skipped,
    d.coverage.lineRate,
    d.coverage.branchRate,
    d.log,
  );
  const runId = Number(info.lastInsertRowid);

  const dt = db.prepare(
    "INSERT INTO discovered_tests (run_id, project_id, key, file, name, classname, outcome, duration_ms) VALUES (?,?,?,?,?,?,?,?)",
  );
  for (const t of d.junit.tests) {
    dt.run(runId, project.id, t.key, t.file, t.name, t.classname, t.outcome, t.duration_ms);
  }

  const cf = db.prepare(
    "INSERT INTO coverage_files (run_id, path, line_rate, lines_covered, lines_valid) VALUES (?,?,?,?,?)",
  );
  for (const f of d.coverage.files) {
    cf.run(runId, f.path, f.line_rate, f.lines_covered, f.lines_valid);
  }
  return runId;
}

async function snapshotToGit(
  project: Project,
  runId: number,
  d: {
    started_at: string;
    junit: ReturnType<typeof parseJUnit>;
    coverage: ReturnType<typeof parseCobertura>;
    junitXml: string;
    coverageXml: string;
  },
): Promise<string> {
  const root = project.root_dir;
  const isRepo = await git(root, ["rev-parse", "--is-inside-work-tree"]);
  if (isRepo.code !== 0) return "not-a-repo";

  const stamp = d.started_at.replace(/[:.]/g, "-");
  const dir = join(root, ".skuld", "history");
  try {
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, `${stamp}.json`),
      JSON.stringify(
        {
          run_id: runId,
          project: project.name,
          at: d.started_at,
          total: d.junit.total,
          passed: d.junit.passed,
          failed: d.junit.failed,
          skipped: d.junit.skipped,
          line_rate: d.coverage.lineRate,
          branch_rate: d.coverage.branchRate,
          files: d.coverage.files,
        },
        null,
        2,
      ),
    );
    await writeFile(join(dir, `${stamp}.junit.xml`), d.junitXml);
    if (d.coverageXml) await writeFile(join(dir, `${stamp}.coverage.xml`), d.coverageXml);
  } catch (e) {
    return "failed";
  }

  // scoped to .skuld only — never -A, so unrelated uncommitted work in the
  // project's own repo is never swept into a Skuld snapshot commit.
  const add = await git(root, ["add", "--", ".skuld"]);
  if (add.code !== 0) return "failed";
  const commit = await git(root, [
    "commit",
    "-m",
    `skuld: ${d.started_at} (${d.junit.passed}/${d.junit.total} pass, ${(d.coverage.lineRate * 100).toFixed(1)}% lines)`,
  ]);
  if (commit.code !== 0 && !/nothing to commit/i.test(commit.out)) return "failed";

  if (project.git_push) {
    const push = await git(root, ["push"]);
    return push.code === 0 ? "pushed" : "failed";
  }
  return "committed";
}
