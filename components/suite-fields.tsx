"use client";

import * as React from "react";
import { Input } from "@mimird/ui/components/input";
import { Label } from "@mimird/ui/components/label";
import { Chevron, summaryCls } from "@/components/disclosure";
import { LANGUAGES, FRAMEWORKS_BY_LANGUAGE, LAYERS, findPreset, type Language } from "@/lib/presets";
import { FormSelect } from "@/components/form-select";

export function SuiteFields({
  defaultName = "",
  defaultLanguage = "other",
  defaultFramework = "other",
  defaultLayer = "unit",
  defaultCommand = "",
  defaultJunitPath = "",
  defaultCoveragePath = "",
}: {
  defaultName?: string;
  defaultLanguage?: string;
  defaultFramework?: string;
  defaultLayer?: string;
  defaultCommand?: string;
  defaultJunitPath?: string;
  defaultCoveragePath?: string;
}) {
  const [language, setLanguage] = React.useState<Language>((defaultLanguage as Language) || "other");
  const [framework, setFramework] = React.useState(defaultFramework);
  const [layer, setLayer] = React.useState(defaultLayer);
  const initialPreset = findPreset(defaultLanguage, defaultFramework);
  const [command, setCommand] = React.useState(defaultCommand || initialPreset?.command || "");
  const [junitPath, setJunitPath] = React.useState(defaultJunitPath || initialPreset?.junitPath || "");
  const [coveragePath, setCoveragePath] = React.useState(defaultCoveragePath || initialPreset?.coveragePath || "");
  const [advancedTouched, setAdvancedTouched] = React.useState(false);

  function applyPreset(nextLanguage: Language, nextFramework: string) {
    if (advancedTouched) return;
    const preset = findPreset(nextLanguage, nextFramework);
    setCommand(preset?.command ?? "");
    setJunitPath(preset?.junitPath ?? ".skuld/junit.xml");
    setCoveragePath(preset?.coveragePath ?? "");
  }

  function onLanguageChange(next: Language) {
    setLanguage(next);
    const first = FRAMEWORKS_BY_LANGUAGE[next][0].value;
    setFramework(first);
    applyPreset(next, first);
  }

  function onFrameworkChange(next: string) {
    setFramework(next);
    applyPreset(language, next);
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="suite-name">Suite name</Label>
        <Input
          id="suite-name"
          name="name"
          placeholder={`${language}/${framework}…`}
          defaultValue={defaultName}
          autoComplete="off"
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="grid gap-1.5">
          <Label>Language</Label>
          <FormSelect
            name="language"
            aria-label="Language"
            value={language}
            onValueChange={(v) => onLanguageChange(v as Language)}
            options={LANGUAGES}
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Framework</Label>
          <FormSelect
            name="framework"
            aria-label="Framework"
            value={framework}
            onValueChange={onFrameworkChange}
            options={FRAMEWORKS_BY_LANGUAGE[language]}
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Layer</Label>
          <FormSelect
            name="layer"
            aria-label="Layer"
            value={layer}
            onValueChange={setLayer}
            options={LAYERS.map((l) => ({ value: l, label: l }))}
          />
        </div>
      </div>

      {/* native <details>: closed fields stay mounted, so they still submit */}
      <details className="group">
        <summary className={`${summaryCls} font-medium`}>
          <Chevron />
          Advanced: command &amp; paths
        </summary>
            <div className="grid gap-3 pt-3">
              <div className="grid gap-1.5">
                <Label htmlFor="suite-command">Test command</Label>
                <Input
                  id="suite-command"
                  name="test_command"
                  className="font-mono text-sm"
                  autoComplete="off"
                  spellCheck={false}
                  value={command}
                  onChange={(e) => {
                    setAdvancedTouched(true);
                    setCommand(e.target.value);
                  }}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="suite-junit-path">JUnit XML path</Label>
                  <Input
                    id="suite-junit-path"
                    name="junit_path"
                    className="font-mono text-sm"
                    autoComplete="off"
                    spellCheck={false}
                    value={junitPath}
                    onChange={(e) => {
                      setAdvancedTouched(true);
                      setJunitPath(e.target.value);
                    }}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="suite-coverage-path">Coverage XML path (optional)</Label>
                  <Input
                    id="suite-coverage-path"
                    name="coverage_xml_path"
                    className="font-mono text-sm"
                    autoComplete="off"
                    spellCheck={false}
                    value={coveragePath}
                    onChange={(e) => {
                      setAdvancedTouched(true);
                      setCoveragePath(e.target.value);
                    }}
                  />
                </div>
              </div>
            </div>
      </details>
    </div>
  );
}
