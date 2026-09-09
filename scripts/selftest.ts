/**
 * Integration check for the run + git-snapshot pipeline (no pytest needed).
 * Seeds a temp project whose "test command" just emits JUnit + Cobertura XML,
 * runs it through runProject(), and asserts a run row + a commit in the repo.
 *
 *   bun scripts/selftest.ts
 */
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import assert from "node:assert";

const work = mkdtempSync(join(tmpdir(), "skuld-selftest-"));
process.env.SKULD_DB = join(work, "test.db");

const proj = join(work, "sample");
const repo = join(work, "history");
mkdirSync(proj);
mkdirSync(repo);
execFileSync("git", ["-C", repo, "init", "-q"]);
execFileSync("git", ["-C", repo, "config", "user.email", "t@t"]);
execFileSync("git", ["-C", repo, "config", "user.name", "t"]);

const JUNIT = `<testsuites><testsuite name="s" tests="2">
<testcase classname="tests.test_auth" name="test_login" time="0.01"/>
<testcase classname="tests.test_auth" name="test_logout" time="0.02"><failure/></testcase>
</testsuite></testsuites>`;
const COV = `<coverage line-rate="0.5" branch-rate="0"><packages><package name="p"><classes>
<class filename="app/auth.py" line-rate="0.5"><lines><line number="1" hits="1"/><line number="2" hits="0"/></lines></class>
</classes></package></packages></coverage>`;

writeFileSync(
  join(proj, "gen.sh"),
  `#!/bin/sh
mkdir -p .skuld
cat > .skuld/junit.xml <<'EOF'
${JUNIT}
EOF
cat > .skuld/coverage.xml <<'EOF'
${COV}
EOF
exit 1
`,
);

const { db } = await import("../lib/db");
const { runProject } = await import("../lib/run");

db.prepare("UPDATE settings SET coverage_repo_dir = ?, git_push = 0 WHERE id = 1").run(repo);
const info = db
  .prepare(
    "INSERT INTO projects (name, root_dir, test_command, junit_path, coverage_xml_path) VALUES (?,?,?,?,?)",
  )
  .run("sample", proj, "sh gen.sh", ".skuld/junit.xml", ".skuld/coverage.xml");
const projectId = Number(info.lastInsertRowid);

const res = await runProject(projectId);
assert.ok(res.ok, `runProject failed: ${JSON.stringify(res)}`);

const run = db.prepare("SELECT * FROM runs WHERE id = ?").get((res as { runId: number }).runId) as any;
assert.equal(run.total, 2, "total tests");
assert.equal(run.passed, 1, "passed");
assert.equal(run.failed, 1, "failed");
assert.equal(run.line_rate, 0.5, "line rate");
assert.equal(run.git_status, "committed", "git status");

const tests = db.prepare("SELECT COUNT(*) c FROM discovered_tests WHERE run_id = ?").get(run.id) as any;
assert.equal(tests.c, 2, "discovered rows");

const log = execFileSync("git", ["-C", repo, "log", "--oneline"], { encoding: "utf8" });
assert.match(log, /coverage: sample/, "commit message");

rmSync(work, { recursive: true, force: true });
console.log("selftest OK — run recorded, snapshot committed");
