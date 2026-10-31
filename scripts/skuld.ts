/**
 * Skuld CLI: list and categorize planned tests and performance entries
 * straight in the SQLite db (same SKULD_DB as the app). Refresh the page to see changes.
 *
 *   bun run skuld help
 */
import { parseArgs } from "node:util";
import { db, latestRun, discoveredForRun, type Project } from "../lib/db";

const USAGE = `skuld <command>   (<project> = uuid or name; ids come from the list commands)

  projects
  areas <project>
  area add <project> <name>...
  area rename <area-id> <name>
  area rm <area-id>...
  tests <project> [--area A] [--todo]
  tests add <project> <area> [--layer unit|integration|e2e|...] <title>...   (creates the area if missing)
  tests move <area> <test-id>...                                             (creates the area if missing)
  tests done|todo|rm <test-id>...
  tests link <test-id> <discovered-key>
  discovered <project> [--unlinked]
  perf <project> [endpoint|page] [--area A]
  perf add <project> endpoint|page [--area A] <path>...   (endpoints are GET only: runs never write)
  perf area <area> <entry-id>...
  perf rm <entry-id>...`;

const { values: opt, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    area: { type: "string" },
    layer: { type: "string", default: "unit" },
    todo: { type: "boolean" },
    unlinked: { type: "boolean" },
  },
});

function die(msg: string): never {
  console.error(msg);
  process.exit(1);
}

function print(rows: unknown[][]) {
  for (const r of rows) console.log(r.map((v) => v ?? "").join("\t"));
}

function project(ref: string | undefined): Project {
  if (!ref) die(USAGE);
  const p = db.prepare("SELECT * FROM projects WHERE uuid = ? OR name = ?").get(ref, ref) as Project | undefined;
  return p ?? die(`no project "${ref}"`);
}

function ids(list: string[]): number[] {
  if (list.length === 0) die("no ids given");
  return list.map((s) => Number(s) || die(`bad id "${s}"`));
}

function areaId(projectId: number, name: string): number {
  const row = db.prepare("SELECT id FROM areas WHERE project_id = ? AND name = ?").get(projectId, name) as
    | { id: number }
    | undefined;
  if (row) return row.id;
  return Number(db.prepare("INSERT INTO areas (project_id, name) VALUES (?, ?)").run(projectId, name).lastInsertRowid);
}

function projectOfTest(id: number): number {
  const row = db
    .prepare("SELECT a.project_id FROM planned_tests p JOIN areas a ON a.id = p.area_id WHERE p.id = ?")
    .get(id) as { project_id: number } | undefined;
  return row?.project_id ?? die(`no test ${id}`);
}

const [cmd, sub, ...rest] = positionals;

switch (cmd) {
  case "projects":
    print(
      (db.prepare("SELECT uuid, name, enable_tests, enable_perf FROM projects ORDER BY name").all() as Record<string, unknown>[]).map(
        (p) => [p.uuid, p.name, p.enable_tests ? "tests" : "", p.enable_perf ? "perf" : ""],
      ),
    );
    break;

  case "areas": {
    const p = project(sub);
    print(
      db
        .prepare(
          `SELECT a.id, a.name, SUM(t.status = 'done') AS done, COUNT(t.id) AS total
           FROM areas a LEFT JOIN planned_tests t ON t.area_id = a.id
           WHERE a.project_id = ? GROUP BY a.id ORDER BY a.sort, a.name`,
        )
        .all(p.id)
        .map((r: any) => [r.id, r.name, `${r.done ?? 0}/${r.total}`]),
    );
    break;
  }

  case "area": {
    if (sub === "add") {
      const p = project(rest[0]);
      for (const name of rest.slice(1)) console.log(areaId(p.id, name), name);
    } else if (sub === "rename") {
      db.prepare("UPDATE areas SET name = ? WHERE id = ?").run(rest[1] ?? die(USAGE), ids([rest[0]!])[0]!);
    } else if (sub === "rm") {
      for (const id of ids(rest)) db.prepare("DELETE FROM areas WHERE id = ?").run(id);
    } else die(USAGE);
    break;
  }

  case "tests": {
    if (sub === "add") {
      const p = project(rest[0]);
      const area = areaId(p.id, rest[1] ?? die(USAGE));
      const insert = db.prepare("INSERT INTO planned_tests (area_id, title, layer, status) VALUES (?, ?, ?, 'todo')");
      for (const title of rest.slice(2)) console.log(insert.run(area, title, opt.layer!).lastInsertRowid, title);
    } else if (sub === "move") {
      const name = rest[0] ?? die(USAGE);
      for (const id of ids(rest.slice(1))) {
        db.prepare("UPDATE planned_tests SET area_id = ? WHERE id = ?").run(areaId(projectOfTest(id), name), id);
      }
    } else if (sub === "done" || sub === "todo") {
      for (const id of ids(rest)) db.prepare("UPDATE planned_tests SET status = ? WHERE id = ?").run(sub, id);
    } else if (sub === "rm") {
      for (const id of ids(rest)) db.prepare("DELETE FROM planned_tests WHERE id = ?").run(id);
    } else if (sub === "link") {
      const [id] = ids([rest[0]!]);
      const key = rest[1] ?? die(USAGE);
      // Same as linkPlannedToDiscovered in lib/actions.ts: drop the auto-imported duplicate.
      db.prepare("UPDATE planned_tests SET discovered_test_key = ?, status = 'done' WHERE id = ?").run(key, id!);
      db.prepare(
        `DELETE FROM planned_tests WHERE discovered_test_key = ? AND id != ?
           AND area_id IN (SELECT id FROM areas WHERE project_id = ? AND is_auto = 1)`,
      ).run(key, id!, projectOfTest(id!));
    } else {
      const p = project(sub);
      print(
        db
          .prepare(
            `SELECT t.id, a.name AS area, t.layer, t.status, t.discovered_test_key, t.title
             FROM planned_tests t JOIN areas a ON a.id = t.area_id
             WHERE a.project_id = ? AND (? IS NULL OR a.name = ?) AND (? = 0 OR t.status = 'todo')
             ORDER BY a.sort, a.name, t.id`,
          )
          .all(p.id, opt.area ?? null, opt.area ?? null, opt.todo ? 1 : 0)
          .map((r: any) => [r.id, r.area, r.layer, r.status, r.discovered_test_key, r.title]),
      );
    }
    break;
  }

  case "discovered": {
    const p = project(sub);
    const run = latestRun(p.id);
    if (!run) die("no runs yet");
    const linked = new Set(
      (
        db
          .prepare(
            `SELECT t.discovered_test_key AS k FROM planned_tests t JOIN areas a ON a.id = t.area_id
             WHERE a.project_id = ? AND a.is_auto = 0 AND t.discovered_test_key IS NOT NULL`,
          )
          .all(p.id) as { k: string }[]
      ).map((r) => r.k),
    );
    print(
      discoveredForRun(run.id)
        .filter((d) => !opt.unlinked || !linked.has(d.key))
        .map((d) => [d.outcome, linked.has(d.key) ? "linked" : "", d.key]),
    );
    break;
  }

  case "perf": {
    if (sub === "add") {
      const p = project(rest[0]);
      const kind = rest[1];
      if (kind !== "endpoint" && kind !== "page") die(USAGE);
      const insert = db.prepare(
        "INSERT INTO perf_entries (project_id, kind, method, path, area) VALUES (?, ?, 'GET', ?, ?)",
      );
      for (const path of rest.slice(2)) {
        console.log(insert.run(p.id, kind, path, opt.area ?? "").lastInsertRowid, path);
      }
    } else if (sub === "area") {
      const name = rest[0] ?? die(USAGE);
      for (const id of ids(rest.slice(1))) db.prepare("UPDATE perf_entries SET area = ? WHERE id = ?").run(name, id);
    } else if (sub === "rm") {
      for (const id of ids(rest)) db.prepare("DELETE FROM perf_entries WHERE id = ?").run(id);
    } else {
      const p = project(sub);
      const kind = rest[0] ?? null;
      print(
        db
          .prepare(
            `SELECT id, kind, area, method, path FROM perf_entries
             WHERE project_id = ? AND (? IS NULL OR kind = ?) AND (? IS NULL OR area = ?)
             ORDER BY kind, area, path, id`,
          )
          .all(p.id, kind, kind, opt.area ?? null, opt.area ?? null)
          .map((r: any) => [r.id, r.kind, r.area, r.kind === "page" ? "" : r.method, r.path]),
      );
    }
    break;
  }

  default:
    console.log(USAGE);
}
