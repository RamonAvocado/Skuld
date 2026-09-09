import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";

// ponytail: node:sqlite (stdlib, Node 22+) instead of a native better-sqlite3 build.
const DB_PATH = process.env.SKULD_DB || join(process.cwd(), "skuld.db");

const g = globalThis as unknown as { __skuldDb?: DatabaseSync };

function open(): DatabaseSync {
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      coverage_repo_dir TEXT DEFAULT '',
      git_push INTEGER DEFAULT 1
    );
    INSERT OR IGNORE INTO settings (id) VALUES (1);

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      root_dir TEXT NOT NULL,
      test_command TEXT NOT NULL,
      junit_path TEXT NOT NULL DEFAULT '.skuld/junit.xml',
      coverage_xml_path TEXT NOT NULL DEFAULT '.skuld/coverage.xml',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS areas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sort INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS planned_tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      area_id INTEGER NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      layer TEXT NOT NULL DEFAULT 'unit',
      status TEXT NOT NULL DEFAULT 'todo',
      discovered_test_key TEXT,
      notes TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      started_at TEXT NOT NULL,
      finished_at TEXT NOT NULL,
      exit_code INTEGER NOT NULL,
      total INTEGER NOT NULL DEFAULT 0,
      passed INTEGER NOT NULL DEFAULT 0,
      failed INTEGER NOT NULL DEFAULT 0,
      skipped INTEGER NOT NULL DEFAULT 0,
      line_rate REAL NOT NULL DEFAULT 0,
      branch_rate REAL NOT NULL DEFAULT 0,
      git_status TEXT NOT NULL DEFAULT 'skipped',
      log TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS discovered_tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      file TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL DEFAULT '',
      classname TEXT NOT NULL DEFAULT '',
      outcome TEXT NOT NULL DEFAULT 'passed',
      duration_ms INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS coverage_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
      path TEXT NOT NULL,
      line_rate REAL NOT NULL DEFAULT 0,
      lines_covered INTEGER NOT NULL DEFAULT 0,
      lines_valid INTEGER NOT NULL DEFAULT 0
    );
  `);
  return db;
}

export const db: DatabaseSync = g.__skuldDb ?? (g.__skuldDb = open());

// --- read helpers -----------------------------------------------------------

export type Project = {
  id: number;
  name: string;
  root_dir: string;
  test_command: string;
  junit_path: string;
  coverage_xml_path: string;
  created_at: string;
};

export type RunRow = {
  id: number;
  project_id: number;
  started_at: string;
  finished_at: string;
  exit_code: number;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  line_rate: number;
  branch_rate: number;
  git_status: string;
  log: string;
};

export function getSettings() {
  return db.prepare("SELECT coverage_repo_dir, git_push FROM settings WHERE id = 1").get() as {
    coverage_repo_dir: string;
    git_push: number;
  };
}

export function listProjects(): Project[] {
  return db.prepare("SELECT * FROM projects ORDER BY name").all() as Project[];
}

export function getProject(id: number): Project | undefined {
  return db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as Project | undefined;
}

export function latestRun(projectId: number): RunRow | undefined {
  return db
    .prepare("SELECT * FROM runs WHERE project_id = ? ORDER BY id DESC LIMIT 1")
    .get(projectId) as RunRow | undefined;
}

export function listRuns(projectId: number): RunRow[] {
  return db
    .prepare("SELECT * FROM runs WHERE project_id = ? ORDER BY id DESC")
    .all(projectId) as RunRow[];
}

export function runSeries(projectId: number) {
  // node:sqlite rows have a null prototype — spread to plain objects so they can
  // cross the server→client component boundary (EvolutionChart).
  return (
    db
      .prepare(
        "SELECT id, finished_at, total, passed, failed, skipped, line_rate FROM runs WHERE project_id = ? ORDER BY id",
      )
      .all(projectId) as Record<string, unknown>[]
  ).map((r) => ({ ...r })) as {
    id: number;
    finished_at: string;
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    line_rate: number;
  }[];
}

export function discoveredForRun(runId: number) {
  return db
    .prepare("SELECT * FROM discovered_tests WHERE run_id = ? ORDER BY classname, name")
    .all(runId) as {
    id: number;
    key: string;
    file: string;
    name: string;
    classname: string;
    outcome: string;
    duration_ms: number;
  }[];
}

export function coverageForRun(runId: number) {
  return db
    .prepare("SELECT * FROM coverage_files WHERE run_id = ? ORDER BY path")
    .all(runId) as { id: number; path: string; line_rate: number; lines_covered: number; lines_valid: number }[];
}

export type Area = { id: number; project_id: number; name: string; sort: number };
export type PlannedTest = {
  id: number;
  area_id: number;
  title: string;
  layer: string;
  status: string;
  discovered_test_key: string | null;
  notes: string;
};

export function listAreas(projectId: number): Area[] {
  return db
    .prepare("SELECT * FROM areas WHERE project_id = ? ORDER BY sort, name")
    .all(projectId) as Area[];
}

export function plannedForArea(areaId: number): PlannedTest[] {
  return db
    .prepare("SELECT * FROM planned_tests WHERE area_id = ? ORDER BY id")
    .all(areaId) as PlannedTest[];
}

export function roadmap(projectId: number) {
  return db
    .prepare(
      `SELECT p.*, a.name AS area_name
       FROM planned_tests p JOIN areas a ON a.id = p.area_id
       WHERE a.project_id = ? AND p.status = 'todo'
       ORDER BY a.sort, a.name, p.id`,
    )
    .all(projectId) as (PlannedTest & { area_name: string })[];
}
