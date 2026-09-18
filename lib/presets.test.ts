import { test, expect } from "bun:test";
import { findPreset, FRAMEWORKS_BY_LANGUAGE } from "./presets";

test("findPreset returns the pytest preset with expected command/junitPath", () => {
  const preset = findPreset("python", "pytest");
  expect(preset).toBeDefined();
  expect(preset!.command).toContain("pytest");
  expect(preset!.junitPath).toBe(".skuld/pytest-junit.xml");
});

test("findPreset returns the Bun test preset with no coverage path", () => {
  const preset = findPreset("typescript", "bun-test");
  expect(preset).toBeDefined();
  expect(preset!.command).toContain("bun test");
  expect(preset!.coveragePath).toBe("");
});

test("findPreset returns undefined for an unknown combination", () => {
  expect(findPreset("python", "unittest")).toBeUndefined();
});

test("FRAMEWORKS_BY_LANGUAGE.other only offers the custom escape hatch", () => {
  expect(FRAMEWORKS_BY_LANGUAGE.other).toEqual([{ value: "other", label: "Other / custom" }]);
});
