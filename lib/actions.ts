"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, getProject } from "./db";
import { runProject } from "./run";
import { perfStatus, runPerf } from "./perf";
import type { PerfKind } from "./db";

function str(fd: FormData, k: string): string {
  return String(fd.get(k) ?? "").trim();
}
// Every project page; the URL segment is the project's uuid.
const PROJECT_PAGE = "/projects/[id]";

function projectUrl(id: number): string {
  return `/projects/${getProject(id)?.uuid ?? ""}`;
}

function int(fd: FormData, k: string): number {
  return Number(fd.get(k) ?? 0);
}

export async function createProject(fd: FormData) {
  const name = str(fd, "name");
  const root_dir = str(fd, "root_dir");
  const test_command = str(fd, "test_command");
  if (!name || !root_dir || !test_command) return;
  const junit_path = str(fd, "junit_path") || ".skuld/junit.xml";
  const coverage_xml_path = str(fd, "coverage_xml_path");
  const language = str(fd, "language") || "other";
  const framework = str(fd, "framework") || "other";
  const layer = str(fd, "layer") || "unit";
  const uuid = crypto.randomUUID();

  const info = db
    .prepare(
      `INSERT INTO projects (uuid, name, root_dir, test_command, junit_path, coverage_xml_path, legacy_migrated)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
    )
    .run(uuid, name, root_dir, test_command, junit_path, coverage_xml_path || ".skuld/coverage.xml");
  const projectId = Number(info.lastInsertRowid);

  db.prepare(
    `INSERT INTO suites (project_id, name, language, framework, layer, test_command, junit_path, coverage_xml_path, sort)
     VALUES (?, 'default', ?, ?, ?, ?, ?, ?, 0)`,
  ).run(projectId, language, framework, layer, test_command, junit_path, coverage_xml_path);

  revalidatePath("/", "layout");
  redirect(`/projects/${uuid}`);
}

export async function updateProject(fd: FormData) {
  const id = int(fd, "id");
  db.prepare(
    `UPDATE projects SET name = ?, root_dir = ?, enable_tests = ?, enable_perf = ? WHERE id = ?`,
  ).run(
    str(fd, "name"),
    str(fd, "root_dir"),
    fd.get("enable_tests") ? 1 : 0,
    fd.get("enable_perf") ? 1 : 0,
    id,
  );
  revalidatePath("/", "layout");
}

export async function createSuite(fd: FormData) {
  const project_id = int(fd, "project_id");
  const test_command = str(fd, "test_command");
  if (!test_command) return;
  const language = str(fd, "language") || "other";
  const framework = str(fd, "framework") || "other";
  db.prepare(
    `INSERT INTO suites (project_id, name, language, framework, layer, test_command, junit_path, coverage_xml_path, sort)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    project_id,
    str(fd, "name") || `${language}/${framework}`,
    language,
    framework,
    str(fd, "layer") || "unit",
    test_command,
    str(fd, "junit_path") || ".skuld/junit.xml",
    str(fd, "coverage_xml_path"),
    int(fd, "sort"),
  );
  revalidatePath(PROJECT_PAGE, "page");
}

export async function updateSuite(fd: FormData) {
  const project_id = int(fd, "project_id");
  const test_command = str(fd, "test_command");
  if (!test_command) return;
  db.prepare(
    `UPDATE suites SET name = ?, language = ?, framework = ?, layer = ?, test_command = ?, junit_path = ?, coverage_xml_path = ? WHERE id = ?`,
  ).run(
    str(fd, "name"),
    str(fd, "language") || "other",
    str(fd, "framework") || "other",
    str(fd, "layer") || "unit",
    test_command,
    str(fd, "junit_path") || ".skuld/junit.xml",
    str(fd, "coverage_xml_path"),
    int(fd, "id"),
  );
  revalidatePath(PROJECT_PAGE, "page");
}

export async function deleteSuite(fd: FormData) {
  const project_id = int(fd, "project_id");
  db.prepare("DELETE FROM suites WHERE id = ?").run(int(fd, "id"));
  revalidatePath(PROJECT_PAGE, "page");
}

export async function deleteProject(fd: FormData) {
  db.prepare("DELETE FROM projects WHERE id = ?").run(int(fd, "id"));
  revalidatePath("/", "layout");
  redirect("/");
}

export async function runProjectAction(fd: FormData): Promise<void> {
  const id = int(fd, "id");
  const res = await runProject(id);
  revalidatePath(PROJECT_PAGE, "page");
  revalidatePath("/");
  if (!res.ok) {
    // surface via query param the page can toast
    redirect(`${projectUrl(id)}?tab=test&err=${encodeURIComponent(res.error.slice(0, 300))}`);
  }
}

export async function createArea(fd: FormData) {
  const project_id = int(fd, "project_id");
  const name = str(fd, "name");
  if (name) {
    db.prepare("INSERT INTO areas (project_id, name, sort) VALUES (?, ?, ?)").run(
      project_id,
      name,
      int(fd, "sort"),
    );
  }
  revalidatePath(PROJECT_PAGE, "page");
}

export async function deleteArea(fd: FormData) {
  const project_id = int(fd, "project_id");
  db.prepare("DELETE FROM areas WHERE id = ?").run(int(fd, "id"));
  revalidatePath(PROJECT_PAGE, "page");
}

export async function createPlannedTest(fd: FormData) {
  const project_id = int(fd, "project_id");
  const area_id = int(fd, "area_id");
  const title = str(fd, "title");
  if (title) {
    db.prepare(
      "INSERT INTO planned_tests (area_id, title, layer, status, notes) VALUES (?, ?, ?, 'todo', ?)",
    ).run(area_id, title, str(fd, "layer") || "unit", str(fd, "notes"));
  }
  revalidatePath(PROJECT_PAGE, "page");
}

export async function updateArea(fd: FormData) {
  const name = str(fd, "name");
  const color = str(fd, "color");
  db.prepare("UPDATE areas SET name = COALESCE(NULLIF(?, ''), name), color = ? WHERE id = ?").run(
    name,
    /^#[0-9a-f]{6}$/i.test(color) ? color : "",
    int(fd, "id"),
  );
  revalidatePath(PROJECT_PAGE, "page");
}

export async function updatePlannedTest(fd: FormData) {
  const project_id = int(fd, "project_id");
  const title = str(fd, "title");
  const id = int(fd, "id");
  if (!title) return;
  db.prepare("UPDATE planned_tests SET title = ?, area_id = ?, layer = COALESCE(NULLIF(?, ''), layer) WHERE id = ?").run(
    title,
    int(fd, "area_id"),
    str(fd, "layer"),
    id,
  );
  const key = str(fd, "discovered_test_key");
  const current = db.prepare("SELECT discovered_test_key AS k FROM planned_tests WHERE id = ?").get(id) as
    | { k: string | null }
    | undefined;
  if (fd.has("discovered_test_key") && key !== (current?.k ?? "")) link(id, project_id, key);
  revalidatePath(PROJECT_PAGE, "page");
}

export async function togglePlannedStatus(fd: FormData) {
  const project_id = int(fd, "project_id");
  db.prepare(
    "UPDATE planned_tests SET status = CASE status WHEN 'done' THEN 'todo' ELSE 'done' END WHERE id = ?",
  ).run(int(fd, "id"));
  revalidatePath(PROJECT_PAGE, "page");
}

function link(id: number, project_id: number, key: string) {
  db.prepare("UPDATE planned_tests SET discovered_test_key = ?, status = ? WHERE id = ?").run(
    key || null,
    key ? "done" : "todo",
    id,
  );
  if (key) {
    // Absorb any auto-imported placeholder for the same key so linking a
    // hand-written roadmap item never leaves a duplicate "done" row behind.
    db.prepare(
      `DELETE FROM planned_tests
       WHERE discovered_test_key = ? AND id != ?
         AND area_id IN (SELECT id FROM areas WHERE project_id = ? AND is_auto = 1)`,
    ).run(key, id, project_id);
  }
}

export async function deletePlannedTest(fd: FormData) {
  const project_id = int(fd, "project_id");
  db.prepare("DELETE FROM planned_tests WHERE id = ?").run(int(fd, "id"));
  revalidatePath(PROJECT_PAGE, "page");
}

// Plain args, not FormData: called from a drop handler, not a <form>.
export async function movePlannedTest(id: number, areaId: number, projectId: number) {
  db.prepare("UPDATE planned_tests SET area_id = ? WHERE id = ?").run(areaId, id);
  revalidatePath(PROJECT_PAGE, "page");
}

// --- performance ----------------------------------------------------------------

function perfKind(fd: FormData): PerfKind {
  return str(fd, "kind") === "page" ? "page" : "endpoint";
}

/** The project tab that lists this kind of entry. */
function perfTab(fd: FormData): string {
  return perfKind(fd) === "page" ? "pages" : "endpoints";
}

export async function updatePerfSettings(fd: FormData) {
  const id = int(fd, "id");
  const tab = perfTab(fd);
  let vars: unknown;
  try {
    vars = JSON.parse(str(fd, "perf_vars") || "{}");
  } catch (e) {
    redirect(`${projectUrl(id)}?tab=${tab}&err=${encodeURIComponent(`Variables aren't valid JSON: ${(e as Error).message}`)}`);
  }
  const ok =
    vars && typeof vars === "object" && !Array.isArray(vars) &&
    Object.values(vars).every((v) => typeof v === "string" || typeof v === "number");
  if (!ok) redirect(`${projectUrl(id)}?tab=${tab}&err=${encodeURIComponent('Variables must be a JSON object of strings or numbers, like {"strategy_id": "42"}')}`);
  db.prepare(
    `UPDATE projects SET api_base_url = ?, login_path = ?, site_url = ?, site_login_path = ?, login_email = ?, perf_vars = ? WHERE id = ?`,
  ).run(
    str(fd, "api_base_url"),
    str(fd, "login_path") || "/api/v1/auth/login",
    str(fd, "site_url"),
    str(fd, "site_login_path") || "/login",
    str(fd, "login_email"),
    JSON.stringify(vars, null, 2),
    id,
  );
  // An empty password field keeps the stored one, so it never has to be sent back to the page.
  const password = String(fd.get("login_password") ?? "");
  if (password) db.prepare("UPDATE projects SET login_password = ? WHERE id = ?").run(password, id);
  revalidatePath(PROJECT_PAGE, "page");
}

export async function updatePageSettings(fd: FormData) {
  db.prepare(`UPDATE projects SET sitespeed_command = ? WHERE id = ?`).run(
    str(fd, "sitespeed_command"),
    int(fd, "id"),
  );
  revalidatePath(PROJECT_PAGE, "page");
}

export async function createPerfEntry(fd: FormData) {
  const project_id = int(fd, "project_id");
  const path = str(fd, "path");
  if (!path) return;
  db.prepare("INSERT INTO perf_entries (project_id, kind, method, path, body, area, login) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
    project_id,
    perfKind(fd),
    (str(fd, "method") || "GET").toUpperCase(),
    path,
    str(fd, "body"),
    str(fd, "area"),
    fd.get("login") ? 1 : 0,
  );
  revalidatePath(PROJECT_PAGE, "page");
}

export async function updatePerfEntry(fd: FormData) {
  const path = str(fd, "path");
  if (!path) return;
  db.prepare("UPDATE perf_entries SET path = ?, area = ?, login = ? WHERE id = ?").run(
    path,
    str(fd, "area"),
    // Endpoints have no login checkbox; they always send the token.
    perfKind(fd) === "endpoint" || fd.get("login") ? 1 : 0,
    int(fd, "id"),
  );
  revalidatePath(PROJECT_PAGE, "page");
}

export async function deletePerfEntry(fd: FormData) {
  const project_id = int(fd, "project_id");
  db.prepare("DELETE FROM perf_entries WHERE id = ?").run(int(fd, "id"));
  revalidatePath(PROJECT_PAGE, "page");
}

// Starts the run and returns at once; the page polls perfStatus for progress and the outcome.
// runPerf's checks run before its first await, so a run that couldn't start has no progress yet.
export async function runPerfAction(fd: FormData): Promise<void> {
  const id = int(fd, "id");
  const kind = perfKind(fd);
  const run = runPerf(id, kind);
  if (perfStatus(id, kind).progress) {
    run.catch(() => {}); // failures are kept in perfStatus().error
    revalidatePath(PROJECT_PAGE, "page");
    return;
  }
  const res = await run;
  revalidatePath(PROJECT_PAGE, "page");
  if (!res.ok) redirect(`${projectUrl(id)}?tab=${perfTab(fd)}&err=${encodeURIComponent(res.error.slice(0, 300))}`);
}
