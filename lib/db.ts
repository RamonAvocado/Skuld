import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";

// ponytail: node:sqlite (stdlib, Node 22+) instead of a native better-sqlite3 build.
const DB_PATH = process.env.SKULD_DB || join(process.cwd(), "skuld.db");

const g = globalThis as unknown as { __skuldDb?: DatabaseSync };

function open(): DatabaseSync {
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      root_dir TEXT NOT NULL,
      test_command TEXT NOT NULL,
      junit_path TEXT NOT NULL DEFAULT '.skuld/junit.xml',
      coverage_xml_path TEXT NOT NULL DEFAULT '.skuld/coverage.xml',
      git_push INTEGER NOT NULL DEFAULT 0,
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

    CREATE TABLE IF NOT EXISTS suites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL DEFAULT '',
      language TEXT NOT NULL DEFAULT 'other',
      framework TEXT NOT NULL DEFAULT 'other',
      layer TEXT NOT NULL DEFAULT 'unit',
      test_command TEXT NOT NULL,
      junit_path TEXT NOT NULL DEFAULT '.skuld/junit.xml',
      coverage_xml_path TEXT NOT NULL DEFAULT '',
      sort INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_suites_project ON suites(project_id, sort);
    CREATE INDEX IF NOT EXISTS idx_planned_discovered_key ON planned_tests(discovered_test_key);
  `);
  // ponytail: no migration system — add columns introduced after first boot this way.
  try {
    db.exec("ALTER TABLE projects ADD COLUMN git_push INTEGER NOT NULL DEFAULT 0");
  } catch {
    /* column already exists */
  }
  try {
    db.exec("ALTER TABLE discovered_tests ADD COLUMN suite_id INTEGER REFERENCES suites(id) ON DELETE SET NULL");
  } catch {
    /* column already exists */
  }
  try {
    db.exec("ALTER TABLE coverage_files ADD COLUMN suite_id INTEGER REFERENCES suites(id) ON DELETE SET NULL");
  } catch {
    /* column already exists */
  }
  try {
    db.exec("ALTER TABLE areas ADD COLUMN is_auto INTEGER NOT NULL DEFAULT 0");
  } catch {
    /* column already exists */
  }
  try {
    db.exec("ALTER TABLE projects ADD COLUMN legacy_migrated INTEGER NOT NULL DEFAULT 0");
  } catch {
    /* column already exists */
  }
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
  git_push: number;
  legacy_migrated: number;
  created_at: string;
};

export type Suite = {
  id: number;
  project_id: number;
  name: string;
  language: string;
  framework: string;
  layer: string;
  test_command: string;
  junit_path: string;
  coverage_xml_path: string;
  sort: number;
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

export type Area = { id: number; project_id: number; name: string; sort: number; is_auto: number };
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

// --- suites ------------------------------------------------------------------

// Lazily backfills a suite for projects created before multi-suite support
// existed. Must be lazy (not run once at open()) because scripts/selftest.ts
// inserts a project via raw SQL *after* this module is already imported and
// open() has already run, then calls runProject() immediately — a boot-time
// backfill would never see that project. legacy_migrated latches so this is
// a single cheap SELECT on every call after the first, and so a suite the
// user deliberately deletes is never silently resurrected.
function ensureLegacySuiteMigrated(projectId: number): void {
  const row = db.prepare("SELECT legacy_migrated FROM projects WHERE id = ?").get(projectId) as
    | { legacy_migrated: number }
    | undefined;
  if (!row || row.legacy_migrated) return;

  if (!db.prepare("SELECT 1 FROM suites WHERE project_id = ? LIMIT 1").get(projectId)) {
    const p = getProject(projectId)!;
    const info = db
      .prepare(
        `INSERT INTO suites (project_id, name, language, framework, layer, test_command, junit_path, coverage_xml_path, sort)
         VALUES (?, 'default', 'other', 'other', 'unit', ?, ?, ?, 0)`,
      )
      .run(projectId, p.test_command, p.junit_path, p.coverage_xml_path);
    const suiteId = Number(info.lastInsertRowid);
    db.prepare("UPDATE discovered_tests SET suite_id = ? WHERE project_id = ? AND suite_id IS NULL").run(
      suiteId,
      projectId,
    );
    db.prepare(
      `UPDATE coverage_files SET suite_id = ?
       WHERE suite_id IS NULL AND run_id IN (SELECT id FROM runs WHERE project_id = ?)`,
    ).run(suiteId, projectId);
  }
  db.prepare("UPDATE projects SET legacy_migrated = 1 WHERE id = ?").run(projectId);
}

export function listSuites(projectId: number): Suite[] {
  ensureLegacySuiteMigrated(projectId);
  return db.prepare("SELECT * FROM suites WHERE project_id = ? ORDER BY sort, id").all(projectId) as Suite[];
}

export function getSuite(id: number): Suite | undefined {
  return db.prepare("SELECT * FROM suites WHERE id = ?").get(id) as Suite | undefined;
}

// --- language breakdown -------------------------------------------------------

// Weighted by discovered-test count per suite.language, scoped to the latest
// run — not cumulative history (would lag a just-added/removed suite) and
// not coverage-weighted (coverage is optional; the Bun preset has none by
// design, which would leave TypeScript suites invisible on the bar).
export function languageBreakdown(runId: number): { language: string; n: number }[] {
  return db
    .prepare(
      `SELECT COALESCE(s.language, 'other') AS language, COUNT(*) AS n
       FROM discovered_tests dt
       LEFT JOIN suites s ON s.id = dt.suite_id
       WHERE dt.run_id = ?
       GROUP BY COALESCE(s.language, 'other')
       ORDER BY n DESC`,
    )
    .all(runId) as { language: string; n: number }[];
}

// --- roadmap auto-import ------------------------------------------------------

function findOrCreateAutoArea(projectId: number): Area {
  const existing = db
    .prepare("SELECT * FROM areas WHERE project_id = ? AND is_auto = 1 LIMIT 1")
    .get(projectId) as Area | undefined;
  if (existing) return existing;
  const info = db
    .prepare("INSERT INTO areas (project_id, name, sort, is_auto) VALUES (?, 'Auto-discovered', 9999, 1)")
    .run(projectId);
  return { id: Number(info.lastInsertRowid), project_id: projectId, name: "Auto-discovered", sort: 9999, is_auto: 1 };
}

// Idempotent: never inserts a second row for a discovered_test_key already
// tracked anywhere in the project (whether from a prior auto-import or a
// user's own manual link), so repeated runs never duplicate roadmap rows.
export function autoImportDiscoveredTests(projectId: number, runId: number): void {
  const area = findOrCreateAutoArea(projectId);

  const discovered = db
    .prepare(
      `SELECT dt.key AS key, dt.name AS name, dt.classname AS classname, COALESCE(s.layer, 'unit') AS layer
       FROM discovered_tests dt
       LEFT JOIN suites s ON s.id = dt.suite_id
       WHERE dt.run_id = ?`,
    )
    .all(runId) as { key: string; name: string; classname: string; layer: string }[];

  const existsForProject = db.prepare(
    `SELECT 1 FROM planned_tests p JOIN areas a ON a.id = p.area_id
     WHERE a.project_id = ? AND p.discovered_test_key = ? LIMIT 1`,
  );
  const insert = db.prepare(
    `INSERT INTO planned_tests (area_id, title, layer, status, discovered_test_key, notes)
     VALUES (?, ?, ?, 'done', ?, '')`,
  );

  for (const t of discovered) {
    if (!t.name || existsForProject.get(projectId, t.key)) continue;
    const title = t.classname ? `${t.classname} :: ${t.name}` : t.name;
    insert.run(area.id, title, t.layer, t.key);
  }
}
