import { test, expect } from "bun:test";
import { parseJUnit, parseCobertura } from "./parse";

const JUNIT = `<?xml version="1.0"?>
<testsuites>
  <testsuite name="pytest" tests="3">
    <testcase classname="tests.test_auth" name="test_login" file="tests/test_auth.py" time="0.012"/>
    <testcase classname="tests.test_auth" name="test_logout" file="tests/test_auth.py" time="0.003">
      <failure message="boom">AssertionError</failure>
    </testcase>
    <testcase classname="tests.test_list" name="test_empty" file="tests/test_list.py" time="0.001">
      <skipped/>
    </testcase>
  </testsuite>
</testsuites>`;

const COBERTURA = `<?xml version="1.0"?>
<coverage line-rate="0.75" branch-rate="0.5">
  <packages>
    <package name="app">
      <classes>
        <class filename="app/auth.py" line-rate="0.5">
          <lines>
            <line number="1" hits="1"/>
            <line number="2" hits="0"/>
          </lines>
        </class>
        <class filename="app/list.py" line-rate="1.0">
          <lines><line number="1" hits="3"/></lines>
        </class>
      </classes>
    </package>
  </packages>
</coverage>`;

test("parseJUnit counts outcomes and builds keys", () => {
  const r = parseJUnit(JUNIT);
  expect(r.total).toBe(3);
  expect(r.passed).toBe(1);
  expect(r.failed).toBe(1);
  expect(r.skipped).toBe(1);
  expect(r.tests[0]!.key).toBe("tests.test_auth::test_login");
  expect(r.tests[0]!.duration_ms).toBe(12);
});

test("parseJUnit handles a bare <testsuite> root", () => {
  const bare = JUNIT.replace('<testsuites>', "").replace("</testsuites>", "");
  const r = parseJUnit(bare);
  expect(r.total).toBe(3);
});

test("parseCobertura reads totals and per-file lines", () => {
  const r = parseCobertura(COBERTURA);
  expect(r.lineRate).toBe(0.75);
  expect(r.files).toHaveLength(2);
  const auth = r.files.find((f) => f.path === "app/auth.py")!;
  expect(auth.lines_valid).toBe(2);
  expect(auth.lines_covered).toBe(1);
});
