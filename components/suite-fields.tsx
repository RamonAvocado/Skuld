"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { LANGUAGES, FRAMEWORKS_BY_LANGUAGE, LAYERS, findPreset, type Language } from "@/lib/presets";

const inputCls =
  "h-9 rounded-md border bg-background px-3 py-1 text-sm text-foreground shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30";

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
          <Label htmlFor="suite-language">Language</Label>
          <select
            id="suite-language"
            name="language"
            aria-label="Language"
            className={inputCls}
            value={language}
            onChange={(e) => onLanguageChange(e.target.value as Language)}
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="suite-framework">Framework</Label>
          <select
            id="suite-framework"
            name="framework"
            aria-label="Framework"
            className={inputCls}
            value={framework}
            onChange={(e) => onFrameworkChange(e.target.value)}
          >
            {FRAMEWORKS_BY_LANGUAGE[language].map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="suite-layer">Layer</Label>
          <select
            id="suite-layer"
            name="layer"
            aria-label="Layer"
            className={inputCls}
            value={layer}
            onChange={(e) => setLayer(e.target.value)}
          >
            {LAYERS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Accordion keepMounted defaultValue={[]}>
        <AccordionItem value="advanced">
          <AccordionTrigger>Advanced: command &amp; paths</AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-3 pt-1">
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
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
