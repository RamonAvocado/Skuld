"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "./db";
import { runProject } from "./run";

function str(fd: FormData, k: string): string {
  return String(fd.get(k) ?? "").trim();
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

  const info = db
    .prepare(
      `INSERT INTO projects (name, root_dir, test_command, junit_path, coverage_xml_path, legacy_migrated)
       VALUES (?, ?, ?, ?, ?, 1)`,
    )
    .run(name, root_dir, test_command, junit_path, coverage_xml_path || ".skuld/coverage.xml");
  const projectId = Number(info.lastInsertRowid);

  db.prepare(
    `INSERT INTO suites (project_id, name, language, framework, layer, test_command, junit_path, coverage_xml_path, sort)
     VALUES (?, 'default', ?, ?, ?, ?, ?, ?, 0)`,
  ).run(projectId, language, framework, layer, test_command, junit_path, coverage_xml_path);

  revalidatePath("/");
  redirect(`/projects/${projectId}`);
}

export async function updateProject(fd: FormData) {
  const id = int(fd, "id");
  db.prepare(`UPDATE projects SET name = ?, root_dir = ?, git_push = ? WHERE id = ?`).run(
    str(fd, "name"),
    str(fd, "root_dir"),
    fd.get("git_push") ? 1 : 0,
    id,
  );
  revalidatePath(`/projects/${id}`);
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
  revalidatePath(`/projects/${project_id}`);
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
  revalidatePath(`/projects/${project_id}`);
}

export async function deleteSuite(fd: FormData) {
  const project_id = int(fd, "project_id");
  db.prepare("DELETE FROM suites WHERE id = ?").run(int(fd, "id"));
  revalidatePath(`/projects/${project_id}`);
}

export async function deleteProject(fd: FormData) {
  db.prepare("DELETE FROM projects WHERE id = ?").run(int(fd, "id"));
  revalidatePath("/");
  redirect("/");
}

export async function runProjectAction(fd: FormData): Promise<void> {
  const id = int(fd, "id");
  const res = await runProject(id);
  revalidatePath(`/projects/${id}`);
  revalidatePath("/");
  if (!res.ok) {
    // surface via query param the page can toast
    redirect(`/projects/${id}?err=${encodeURIComponent(res.error.slice(0, 300))}`);
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
  revalidatePath(`/projects/${project_id}`);
}

export async function deleteArea(fd: FormData) {
  const project_id = int(fd, "project_id");
  db.prepare("DELETE FROM areas WHERE id = ?").run(int(fd, "id"));
  revalidatePath(`/projects/${project_id}`);
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
  revalidatePath(`/projects/${project_id}`);
}

export async function togglePlannedStatus(fd: FormData) {
  const project_id = int(fd, "project_id");
  db.prepare(
    "UPDATE planned_tests SET status = CASE status WHEN 'done' THEN 'todo' ELSE 'done' END WHERE id = ?",
  ).run(int(fd, "id"));
  revalidatePath(`/projects/${project_id}`);
}

export async function linkPlannedToDiscovered(fd: FormData) {
  const project_id = int(fd, "project_id");
  const key = str(fd, "discovered_test_key");
  const id = int(fd, "id");
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
  revalidatePath(`/projects/${project_id}`);
}

export async function deletePlannedTest(fd: FormData) {
  const project_id = int(fd, "project_id");
  db.prepare("DELETE FROM planned_tests WHERE id = ?").run(int(fd, "id"));
  revalidatePath(`/projects/${project_id}`);
}
