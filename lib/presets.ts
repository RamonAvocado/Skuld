// Pure data/lookups for the suite picker UI — no Node imports, safe to
// import from client components.

export type Language = "python" | "typescript" | "other";

export type Preset = {
  language: Language;
  framework: string;
  label: string;
  command: string;
  junitPath: string;
  coveragePath: string; // "" = unset/optional
};

export const PRESETS: Preset[] = [
  {
    language: "python",
    framework: "pytest",
    label: "pytest",
    command: "pytest --junitxml=.skuld/pytest-junit.xml --cov --cov-report=xml:.skuld/pytest-coverage.xml",
    junitPath: ".skuld/pytest-junit.xml",
    coveragePath: ".skuld/pytest-coverage.xml",
  },
  {
    language: "typescript",
    framework: "bun-test",
    label: "Bun test",
    // --reporter=junit requires --reporter-outfile; coverage is lcov (Bun has no Cobertura).
    // Bun only covers files the tests import, so untested files don't count against the rate.
    command:
      "bun test --reporter=junit --reporter-outfile=.skuld/bun-junit.xml --coverage --coverage-reporter=lcov --coverage-dir=.skuld/bun-coverage",
    junitPath: ".skuld/bun-junit.xml",
    coveragePath: ".skuld/bun-coverage/lcov.info",
  },
  {
    language: "typescript",
    framework: "playwright",
    label: "Playwright (e2e)",
    // Best-effort: Playwright's JUnit reporter is normally configured in
    // playwright.config.ts, not via one clean CLI flag like pytest/Bun.
    // This combines --reporter=junit with the PLAYWRIGHT_JUNIT_OUTPUT_NAME
    // env var it reads for the output path — check it against your own
    // playwright.config and adjust in the Advanced box if you already
    // configure a reporter there.
    command: "PLAYWRIGHT_JUNIT_OUTPUT_NAME=.skuld/playwright-junit.xml npx playwright test --reporter=junit",
    junitPath: ".skuld/playwright-junit.xml",
    // Playwright doesn't emit line coverage on its own, so it stays unset.
    coveragePath: "",
  },
];

export const FRAMEWORKS_BY_LANGUAGE: Record<Language, { value: string; label: string }[]> = {
  python: [
    { value: "pytest", label: "pytest" },
    { value: "other", label: "Other / custom" },
  ],
  typescript: [
    { value: "bun-test", label: "Bun test" },
    { value: "playwright", label: "Playwright (e2e)" },
    { value: "other", label: "Other / custom" },
  ],
  other: [{ value: "other", label: "Other / custom" }],
};

export const LANGUAGES: { value: Language; label: string }[] = [
  { value: "python", label: "Python" },
  { value: "typescript", label: "TypeScript" },
  { value: "other", label: "Other" },
];

export function findPreset(language: string, framework: string): Preset | undefined {
  return PRESETS.find((p) => p.language === language && p.framework === framework);
}

export const LAYERS = ["unit", "integration", "e2e", "other"] as const;

// The command Skuld runs for page entries when a project sets none. It runs in a
// folder holding urls.txt and must leave its report in report/.
// sitespeed.io is a Skuld dependency (on PATH via node_modules/.bin) driving the system
// Chromium, so its chromedriver always matches; video is off because it needs ffmpeg.
export const DEFAULT_SITESPEED_COMMAND =
  "sitespeed.io urls.txt -n 3 --outputFolder report --browsertime.headless true --browsertime.chrome.binaryPath /usr/bin/chromium --browsertime.chrome.chromedriverPath /usr/bin/chromedriver --browsertime.chrome.args no-sandbox --video false --visualMetrics false";

// Group colors when the user hasn't picked one.
export const AREA_PALETTE = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

export function areaColor(area: { color: string }, index: number): string {
  return area.color || AREA_PALETTE[index % AREA_PALETTE.length]!;
}
