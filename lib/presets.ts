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
    // Confirmed against `bun test --help` (Bun 1.4.2): --reporter=junit
    // requires --reporter-outfile. Coverage isn't included: Bun's
    // --coverage-reporter only supports text/lcov, never Cobertura, and
    // parseCobertura can't read either of those — so coverage stays unset
    // (already a supported, silently-skipped-when-missing path in run.ts).
    command: "bun test --reporter=junit --reporter-outfile=.skuld/bun-junit.xml",
    junitPath: ".skuld/bun-junit.xml",
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
