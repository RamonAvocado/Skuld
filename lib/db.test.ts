/**
 * Uses scripts/selftest.ts's pattern: point SKULD_DB at a temp file *before*
 * dynamically importing lib/db, so each test file gets an isolated database.
 * Only lib/db.ts functions are exercised here — lib/actions.ts functions call
 * next/cache's revalidatePath, which requires a live Next.js request context
 * and isn't safe to call from a bare `bun test` run.
 */
import { test, expect, beforeAll } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let db: typeof import("./db").db;
let getProject: typeof import("./db").getProject;
let listSuites: typeof import("./db").listSuites;
let listAreas: typeof import("./db").listAreas;
let plannedForArea: typeof import("./db").plannedForArea;
let autoImportDiscoveredTests: typeof import("./db").autoImportDiscoveredTests;

beforeAll(async () => {
  const work = mkdtempSync(join(tmpdir(), "skuld-db-test-"));
  process.env.SKULD_DB = join(work, "test.db");
  ({ db, getProject, listSuites, listAreas, plannedForArea, autoImportDiscoveredTests } = await import("./db"));
});

function insertLegacyProject(): number {
  const info = db
    .prepare(
      "INSERT INTO projects (name, root_dir, test_command, junit_path, coverage_xml_path) VALUES (?,?,?,?,?)",
    )
    .run("legacy", "/tmp/legacy", "uv run pytest --junitxml=.skuld/junit.xml", ".skuld/junit.xml", ".skuld/coverage.xml");
  return Number(info.lastInsertRowid);
}

test("listSuites lazily migrates a legacy project's single command into one suite", () => {
  const projectId = insertLegacyProject();
  expect(getProject(projectId)!.legacy_migrated).toBe(0);

  const suites = listSuites(projectId);
  expect(suites.length).toBe(1);
  expect(suites[0].test_command).toBe("uv run pytest --junitxml=.skuld/junit.xml");
  expect(suites[0].junit_path).toBe(".skuld/junit.xml");
  expect(suites[0].language).toBe("other");
  expect(getProject(projectId)!.legacy_migrated).toBe(1);

  // second call is a no-op, doesn't create a second suite
  expect(listSuites(projectId).length).toBe(1);
});

test("listSuites does not resurrect a suite the user deleted after migration", () => {
  const projectId = insertLegacyProject();
  listSuites(projectId); // triggers migration, latches legacy_migrated
  const suiteId = listSuites(projectId)[0].id;
  db.prepare("DELETE FROM suites WHERE id = ?").run(suiteId);

  expect(listSuites(projectId).length).toBe(0);
});

function insertRunWithSuite(projectId: number, suiteId: number, keys: string[]) {
  const runInfo = db
    .prepare(
      `INSERT INTO runs (project_id, started_at, finished_at, exit_code, total, passed, failed, skipped, line_rate, branch_rate, git_status, log)
       VALUES (?, 'now', 'now', 0, ?, ?, 0, 0, 1, 1, 'skipped', '')`,
    )
    .run(projectId, keys.length, keys.length);
  const runId = Number(runInfo.lastInsertRowid);
  const dt = db.prepare(
    "INSERT INTO discovered_tests (run_id, project_id, suite_id, key, file, name, classname, outcome, duration_ms) VALUES (?,?,?,?,?,?,?,?,?)",
  );
  for (const key of keys) {
    const [classname, name] = key.split("::");
    dt.run(runId, projectId, suiteId, key, "", name, classname, "passed", 0);
  }
  return runId;
}

test("autoImportDiscoveredTests is idempotent and dedicated to one auto area", () => {
  const projectId = insertLegacyProject();
  const suiteId = listSuites(projectId)[0].id;
  const runId = insertRunWithSuite(projectId, suiteId, ["tests.test_a::test_one", "tests.test_a::test_two"]);

  autoImportDiscoveredTests(projectId, runId);
  const areasAfterFirst = listAreas(projectId).filter((a) => a.is_auto === 1);
  expect(areasAfterFirst.length).toBe(1);
  expect(plannedForArea(areasAfterFirst[0].id).length).toBe(2);
  expect(plannedForArea(areasAfterFirst[0].id).every((p) => p.status === "done")).toBe(true);

  // re-running the same run's import must not duplicate rows
  autoImportDiscoveredTests(projectId, runId);
  const areasAfterSecond = listAreas(projectId).filter((a) => a.is_auto === 1);
  expect(areasAfterSecond.length).toBe(1);
  expect(plannedForArea(areasAfterSecond[0].id).length).toBe(2);
});

test("autoImportDiscoveredTests never creates a second row for a key already tracked elsewhere", () => {
  const projectId = insertLegacyProject();
  const suiteId = listSuites(projectId)[0].id;

  const manualArea = db
    .prepare("INSERT INTO areas (project_id, name, sort, is_auto) VALUES (?, 'Auth', 0, 0)")
    .run(projectId);
  db.prepare(
    "INSERT INTO planned_tests (area_id, title, layer, status, discovered_test_key, notes) VALUES (?, 'rejects bad token', 'unit', 'done', 'tests.test_auth::test_rejects_bad_token', '')",
  ).run(Number(manualArea.lastInsertRowid));

  const runId = insertRunWithSuite(projectId, suiteId, ["tests.test_auth::test_rejects_bad_token"]);
  autoImportDiscoveredTests(projectId, runId);

  const autoArea = listAreas(projectId).find((a) => a.is_auto === 1);
  // no auto area needed to be created for this key, or if one exists it's empty
  expect(autoArea === undefined || plannedForArea(autoArea.id).length === 0).toBe(true);
});
