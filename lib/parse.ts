import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (name) =>
    ["testsuite", "testcase", "package", "class", "line"].includes(name),
});

export type DiscoveredTest = {
  key: string;
  file: string;
  name: string;
  classname: string;
  outcome: "passed" | "failed" | "error" | "skipped";
  duration_ms: number;
};

export type JUnitResult = {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  tests: DiscoveredTest[];
};

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

export function parseJUnit(xml: string): JUnitResult {
  const doc = parser.parse(xml);
  const suites = doc.testsuites
    ? asArray(doc.testsuites.testsuite)
    : asArray(doc.testsuite);

  const tests: DiscoveredTest[] = [];
  for (const suite of suites) {
    for (const tc of asArray(suite?.testcase)) {
      const classname = String(tc["@_classname"] ?? "");
      const name = String(tc["@_name"] ?? "");
      let outcome: DiscoveredTest["outcome"] = "passed";
      if ("failure" in tc) outcome = "failed";
      else if ("error" in tc) outcome = "error";
      else if ("skipped" in tc) outcome = "skipped";
      tests.push({
        key: `${classname}::${name}`,
        file: String(tc["@_file"] ?? ""),
        name,
        classname,
        outcome,
        duration_ms: Math.round(parseFloat(tc["@_time"] ?? "0") * 1000),
      });
    }
  }

  return {
    total: tests.length,
    passed: tests.filter((t) => t.outcome === "passed").length,
    failed: tests.filter((t) => t.outcome === "failed" || t.outcome === "error").length,
    skipped: tests.filter((t) => t.outcome === "skipped").length,
    tests,
  };
}

export type CoverageFile = {
  path: string;
  line_rate: number;
  lines_covered: number;
  lines_valid: number;
};

export type CoberturaResult = {
  lineRate: number;
  branchRate: number;
  files: CoverageFile[];
};

export function parseCobertura(xml: string): CoberturaResult {
  const doc = parser.parse(xml);
  const cov = doc.coverage ?? {};
  const files: CoverageFile[] = [];

  for (const pkg of asArray(cov.packages?.package)) {
    for (const cls of asArray(pkg?.classes?.class)) {
      const lines = asArray(cls?.lines?.line);
      const valid = lines.length;
      const covered = lines.filter((l) => Number(l["@_hits"] ?? 0) > 0).length;
      files.push({
        path: String(cls["@_filename"] ?? ""),
        line_rate: parseFloat(cls["@_line-rate"] ?? "0"),
        lines_covered: covered,
        lines_valid: valid,
      });
    }
  }

  return {
    lineRate: parseFloat(cov["@_line-rate"] ?? "0"),
    branchRate: parseFloat(cov["@_branch-rate"] ?? "0"),
    files,
  };
}
