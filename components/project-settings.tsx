"use client";

import * as React from "react";
import { Hint } from "@mimird/ui/components/tooltip";
import { FlaskConicalIcon, GaugeIcon, SettingsIcon } from "lucide-react";
import { Modal } from "@mimird/ui/components/modal";
import { Separator } from "@mimird/ui/components/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@mimird/ui/components/tabs";
import {
  updateProject,
  deleteProject,
  createSuite,
  updateSuite,
  deleteSuite,
  updatePageSettings,
  createArea,
} from "@/lib/actions";
import type { Suite } from "@/lib/db";
import { DEFAULT_SITESPEED_COMMAND } from "@/lib/presets";
import { setHash, useHash } from "@/lib/use-hash";
import { SuiteFields } from "@/components/suite-fields";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { Chevron, detailsCls, summaryCls } from "@/components/disclosure";
import { Button } from "@mimird/ui/components/button";
import { Input } from "@mimird/ui/components/input";
import { Label } from "@mimird/ui/components/label";
import { Badge } from "@mimird/ui/components/badge";
import { Switch } from "@mimird/ui/components/switch";

// Each value is the URL fragment that opens it, as in Mimird-Web's settings.
const SECTIONS = [
  { value: "settings/general", label: "General", icon: SettingsIcon },
  { value: "settings/suites", label: "Tests", icon: FlaskConicalIcon },
  { value: "settings/performance", label: "Performance", icon: GaugeIcon },
] as const;

export type SettingsProject = {
  id: number;
  name: string;
  root_dir: string;
  enable_tests: number;
  enable_perf: number;
  site_url: string;
  site_cookie: string;
  sitespeed_command: string;
};

// The scroll container clips anything outside it, so -m-1 p-1 leaves room for
// the 3px focus ring of controls that touch its edge without moving them.
const PANEL_CLASS = "-m-1 flex min-h-0 flex-col gap-4 overflow-y-auto p-1";

export function ProjectSettings({
  project,
  suites,
}: {
  project: SettingsProject;
  suites: Suite[];
}) {
  // The fragment is the state: #settings/general, #settings/suites.
  const hash = useHash();
  const open = hash.startsWith("settings");
  const projectId = project.id;

  return (
    <>
      <Hint label="Project Settings">
        <Button type="button" variant="ghost" size="icon" aria-label="Project settings" onClick={() => setHash("settings/general")}>
          <SettingsIcon aria-hidden />
        </Button>
      </Hint>
      <Modal
        open={open}
        onOpenChange={(o) => setHash(o ? "settings/general" : "")}
        title="Project settings"
        className="h-[36rem] max-w-4xl"
      >
        <Tabs
          orientation="vertical"
          value={(SECTIONS.find((s) => hash === s.value) ?? SECTIONS[0]).value}
          onValueChange={setHash}
          className="min-h-0 flex-1 flex-col gap-4 sm:flex-row sm:gap-6"
        >
          <TabsList
            variant="line"
            className="w-full shrink-0 items-stretch justify-start sm:w-48 sm:border-r sm:border-border/70 sm:pr-3"
          >
            {SECTIONS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className="h-8 flex-none px-2.5">
                <Icon aria-hidden="true" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="settings/general" className={PANEL_CLASS}>
            <form action={updateProject} className="flex max-w-md flex-col gap-3">
              <input type="hidden" name="id" value={projectId} />
              <Field name="name" label="Name" defaultValue={project.name} />
              <Field name="root_dir" label="Project directory" defaultValue={project.root_dir} mono />
              <fieldset className="grid gap-2">
                <legend className="mb-1.5 text-sm font-medium">Parts</legend>
                <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
                  <Switch name="enable_tests" defaultChecked={project.enable_tests === 1} />
                  Tests
                </label>
                <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
                  <Switch name="enable_perf" defaultChecked={project.enable_perf === 1} />
                  Performance
                </label>
              </fieldset>
              <Button type="submit" size="sm" className="w-fit">
                Save
              </Button>
            </form>

            <Separator />

            <div className="mt-auto flex flex-col gap-3 rounded-lg border border-destructive/40 p-4">
              <div className="flex flex-col gap-1">
                <h4 className="font-medium text-destructive">Danger zone</h4>
                <p className="text-muted-foreground">
                  Deleting the project removes all its runs and planned tests. This can&apos;t be undone.
                </p>
              </div>
              <form action={deleteProject}>
                <input type="hidden" name="id" value={projectId} />
                <ConfirmSubmitButton
                  variant="destructive"
                  size="sm"
                  confirmTitle={`Delete project "${project.name}"?`}
                  confirmMessage="All runs and planned tests will be lost. This can't be undone."
                >
                  Delete Project
                </ConfirmSubmitButton>
              </form>
            </div>
          </TabsContent>

          <TabsContent value="settings/suites" className={PANEL_CLASS}>
            <form action={createArea} className="flex items-end gap-2">
              <input type="hidden" name="project_id" value={projectId} />
              <div className="grid gap-1.5">
                <Label htmlFor="area-name">New group</Label>
                <Input id="area-name" name="name" placeholder="Auth, Listing, Billing…" className="w-64" required />
              </div>
              <Button type="submit" size="sm" variant="outline">
                Add Group
              </Button>
            </form>

            <Separator />

            <h4 className="font-medium">Suites</h4>
            {suites.length === 0 && <p className="text-muted-foreground">No suites yet.</p>}
            {suites.map((suite) => (
              <details key={suite.id} className={detailsCls}>
                <summary className={summaryCls}>
                  <Chevron />
                  <span className="font-medium">{suite.name || `${suite.language}/${suite.framework}`}</span>
                  <Badge variant="secondary">{suite.language}</Badge>
                  <Badge variant="secondary">{suite.framework}</Badge>
                  <Badge variant="outline">{suite.layer}</Badge>
                </summary>
                <div className="mt-3 grid gap-3">
                  <form action={updateSuite} className="grid gap-3">
                    <input type="hidden" name="id" value={suite.id} />
                    <input type="hidden" name="project_id" value={projectId} />
                    <SuiteFields
                      defaultName={suite.name}
                      defaultLanguage={suite.language}
                      defaultFramework={suite.framework}
                      defaultLayer={suite.layer}
                      defaultCommand={suite.test_command}
                      defaultJunitPath={suite.junit_path}
                      defaultCoveragePath={suite.coverage_xml_path}
                    />
                    <Button type="submit" size="sm" variant="outline" className="w-fit">
                      Save Suite
                    </Button>
                  </form>
                  <form action={deleteSuite}>
                    <input type="hidden" name="id" value={suite.id} />
                    <input type="hidden" name="project_id" value={projectId} />
                    <ConfirmSubmitButton
                      size="sm"
                      variant="ghost"
                      confirmTitle={`Delete suite "${suite.name || suite.framework}"?`}
                      confirmMessage="Past results stay in run history."
                    >
                      Delete Suite
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </details>
            ))}

            <details className={detailsCls}>
              <summary className={summaryCls + " font-medium"}>
                <Chevron />
                Add suite
              </summary>
              <form action={createSuite} className="mt-3 grid gap-3">
                <input type="hidden" name="project_id" value={projectId} />
                <SuiteFields defaultLanguage="other" defaultFramework="other" defaultLayer="unit" />
                <Button type="submit" size="sm" variant="outline" className="w-fit">
                  Add Suite
                </Button>
              </form>
            </details>
          </TabsContent>
          <TabsContent value="settings/performance" className={PANEL_CLASS}>
            <form action={updatePageSettings} className="flex max-w-md flex-col gap-3">
              <input type="hidden" name="id" value={projectId} />
              <p className="text-xs text-muted-foreground">Endpoint login and variables live on the Endpoints tab.</p>
              <h4 className="font-medium">Pages</h4>
              <Field name="site_url" label="Site URL" defaultValue={project.site_url} placeholder="http://localhost:3000" mono />
              <Field name="site_cookie" label="Cookie (optional)" defaultValue={project.site_cookie} placeholder="session=…" mono />
              <Field
                name="sitespeed_command"
                label="sitespeed.io command"
                defaultValue={project.sitespeed_command}
                placeholder={DEFAULT_SITESPEED_COMMAND}
                mono
              />
              <p className="-mt-2 text-xs text-muted-foreground">
                Runs in a fresh folder holding <code>urls.txt</code> and must write its report to{" "}
                <code>report/</code>. Empty uses the bundled sitespeed.io with the system Chromium; add{" "}
                <code>--video true</code> for filmstrips if ffmpeg is installed.
              </p>
              <Button type="submit" size="sm" className="w-fit">
                Save
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </Modal>
    </>
  );
}

export function Field({
  name,
  label,
  defaultValue,
  mono,
  type,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue: string;
  mono?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={`project-${name}`}>{label}</Label>
      {/* key: a save re-renders with the stored value; remount instead of changing an uncontrolled default */}
      <Input
        key={defaultValue}
        id={`project-${name}`}
        name={name}
        defaultValue={defaultValue}
        type={type}
        placeholder={placeholder}
        autoComplete={type === "password" ? "new-password" : "off"}
        spellCheck={false}
        className={mono ? "font-mono text-sm" : undefined}
      />
    </div>
  );
}
