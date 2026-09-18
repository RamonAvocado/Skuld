import Link from "next/link";
import { notFound } from "next/navigation";
import { cn, selectCls as inputCls } from "@/lib/utils";
import { XIcon } from "lucide-react";
import {
  getProject,
  latestRun,
  listRuns,
  runSeries,
  discoveredForRun,
  coverageForRun,
  listAreas,
  plannedForArea,
  roadmap,
  listSuites,
  languageBreakdown,
} from "@/lib/db";
import {
  createArea,
  deleteArea,
  createPlannedTest,
  togglePlannedStatus,
  linkPlannedToDiscovered,
  deletePlannedTest,
  updateProject,
  deleteProject,
  createSuite,
  updateSuite,
  deleteSuite,
} from "@/lib/actions";
import { LanguageBar } from "@/components/language-bar";
import { SuiteFields } from "@/components/suite-fields";
import { EditPlannedTestDialog } from "@/components/edit-planned-test-dialog";
import { LAYERS } from "@/lib/presets";
import { RunButton } from "@/components/run-button";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { EvolutionChart } from "@/components/evolution-chart";
import { ErrToast } from "@/components/err-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ err?: string }>;
}) {
  const { id } = await params;
  const { err } = await searchParams;
  const projectId = Number(id);
  const project = getProject(projectId);
  if (!project) notFound();

  const last = latestRun(projectId);
  const series = runSeries(projectId);
  const runs = listRuns(projectId);
  const areas = listAreas(projectId);
  const todo = roadmap(projectId);
  const discovered = last ? discoveredForRun(last.id) : [];
  const suites = listSuites(projectId);
  const langData = last ? languageBreakdown(last.id) : [];
  // node:sqlite rows have a null prototype — plain-object them before
  // crossing the server→client boundary into EditPlannedTestDialog.
  const areaOptions = areas.map((a) => ({ id: a.id, name: a.name }));

  return (
    <div className="grid gap-6">
      <ErrToast message={err} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link href="/" className="text-sm text-muted-foreground hover:underline">
            ← projects
          </Link>
          <h1 className="truncate text-xl font-semibold">{project.name}</h1>
          <p className="truncate text-sm text-muted-foreground" title={project.root_dir}>
            {project.root_dir}
          </p>
        </div>
        <RunButton projectId={projectId} />
      </div>

      <Tabs defaultValue="overview">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="roadmap">Areas &amp; roadmap</TabsTrigger>
            <TabsTrigger value="runs">Runs ({runs.length})</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
        </div>

        {/* -------- Overview -------- */}
        <TabsContent value="overview" className="grid gap-4 pt-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Tile label="Line coverage" value={last ? pct(last.line_rate) : "—"} />
            <Tile label="Tests" value={last ? String(last.total) : "—"} />
            <Tile
              label="Passing"
              value={last ? `${last.passed}/${last.total}` : "—"}
              tone={last && last.failed > 0 ? "bad" : "ok"}
            />
            <Tile label="Roadmap left" value={String(todo.length)} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Test composition</CardTitle>
            </CardHeader>
            <CardContent>
              <LanguageBar data={langData} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Evolution</CardTitle>
            </CardHeader>
            <CardContent>
              <EvolutionChart data={series} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* -------- Areas & roadmap -------- */}
        <TabsContent value="roadmap" className="grid gap-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Roadmap — {todo.length} tests left to add</CardTitle>
            </CardHeader>
            <CardContent>
              {todo.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing outstanding.</p>
              ) : (
                <ul className="grid gap-1 text-sm">
                  {todo.map((t) => (
                    <li key={t.id} className="flex items-start gap-2">
                      <Badge variant="outline" className="shrink-0">
                        {t.area_name}
                      </Badge>
                      <Badge variant="secondary" className="shrink-0">
                        {t.layer}
                      </Badge>
                      <span className="min-w-0 break-words">{t.title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {areas.map((area) => {
            const planned = plannedForArea(area.id);
            const done = planned.filter((p) => p.status === "done").length;
            return (
              <Card key={area.id}>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle>
                    {area.name}{" "}
                    {area.is_auto === 1 && (
                      <Badge variant="outline" className="align-middle">
                        auto
                      </Badge>
                    )}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      {done}/{planned.length} done · {planned.length - done} left
                    </span>
                  </CardTitle>
                  <form action={deleteArea}>
                    <input type="hidden" name="id" value={area.id} />
                    <input type="hidden" name="project_id" value={projectId} />
                    <ConfirmSubmitButton
                      variant="ghost"
                      size="sm"
                      type="submit"
                      confirmMessage={
                        area.is_auto === 1
                          ? `Delete "${area.name}"? It will be recreated automatically on the next run.`
                          : `Delete area "${area.name}" and its planned tests? This can't be undone.`
                      }
                    >
                      delete area
                    </ConfirmSubmitButton>
                  </form>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {planned.length > 0 && (
                    <details open={!(area.is_auto === 1 && planned.length > 0)}>
                      <summary className="cursor-pointer text-sm font-medium marker:text-muted-foreground hover:text-foreground">
                        {planned.length} test{planned.length === 1 ? "" : "s"} · {done} done
                      </summary>
                      <Table className="mt-3">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-8" />
                            <TableHead>Test</TableHead>
                            <TableHead>Layer</TableHead>
                            <TableHead>Linked to discovered test</TableHead>
                            <TableHead className="w-8" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {planned.map((p) => (
                            <TableRow key={p.id}>
                              <TableCell>
                                <form action={togglePlannedStatus}>
                                  <input type="hidden" name="id" value={p.id} />
                                  <input type="hidden" name="project_id" value={projectId} />
                                  <button
                                    type="submit"
                                    aria-label={p.status === "done" ? "Mark as not done" : "Mark as done"}
                                    aria-pressed={p.status === "done"}
                                    title="Toggle done"
                                    className="flex size-5 items-center justify-center rounded border text-xs leading-none transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                                  >
                                    {p.status === "done" ? "✓" : ""}
                                  </button>
                                </form>
                              </TableCell>
                              <TableCell className={p.status === "done" ? "line-through text-muted-foreground" : ""}>
                                <EditPlannedTestDialog
                                  id={p.id}
                                  projectId={projectId}
                                  title={p.title}
                                  areaId={p.area_id}
                                  areas={areaOptions}
                                />
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">{p.layer}</Badge>
                              </TableCell>
                              <TableCell>
                                <form action={linkPlannedToDiscovered} className="flex">
                                  <input type="hidden" name="id" value={p.id} />
                                  <input type="hidden" name="project_id" value={projectId} />
                                  <select
                                    name="discovered_test_key"
                                    aria-label={`Link "${p.title}" to a discovered test`}
                                    defaultValue={p.discovered_test_key ?? ""}
                                    className={inputCls + " max-w-72"}
                                  >
                                    <option value="">— none —</option>
                                    {p.discovered_test_key &&
                                      !discovered.some((d) => d.key === p.discovered_test_key) && (
                                        <option value={p.discovered_test_key}>
                                          {p.discovered_test_key} (not in last run)
                                        </option>
                                      )}
                                    {discovered.map((d) => (
                                      <option key={d.key} value={d.key}>
                                        {d.key}
                                      </option>
                                    ))}
                                  </select>
                                  <Button type="submit" size="sm" variant="ghost">
                                    link
                                  </Button>
                                </form>
                              </TableCell>
                              <TableCell>
                                <form action={deletePlannedTest}>
                                  <input type="hidden" name="id" value={p.id} />
                                  <input type="hidden" name="project_id" value={projectId} />
                                  <Button type="submit" size="icon-sm" variant="ghost" aria-label={`Delete "${p.title}"`}>
                                    <XIcon />
                                  </Button>
                                </form>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </details>
                  )}

                  <form action={createPlannedTest} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="project_id" value={projectId} />
                    <input type="hidden" name="area_id" value={area.id} />
                    <Input
                      name="title"
                      aria-label="New test title"
                      placeholder="e.g. rejects expired token…"
                      className="w-64"
                      required
                    />
                    <select name="layer" aria-label="Layer" defaultValue="unit" className={inputCls}>
                      {LAYERS.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                    <Button type="submit" size="sm" variant="secondary">
                      add test
                    </Button>
                  </form>
                </CardContent>
              </Card>
            );
          })}

          <form action={createArea} className="flex items-end gap-2">
            <input type="hidden" name="project_id" value={projectId} />
            <div className="grid gap-1.5">
              <Label htmlFor="area-name">New area</Label>
              <Input id="area-name" name="name" placeholder="Auth, Listing, Billing…" className="w-64" required />
            </div>
            <Button type="submit" variant="secondary">
              add area
            </Button>
          </form>
        </TabsContent>

        {/* -------- Runs -------- */}
        <TabsContent value="runs" className="grid gap-3 pt-4">
          {runs.length === 0 && <p className="text-sm text-muted-foreground">No runs yet.</p>}
          {runs.map((r) => {
            const tests = discoveredForRun(r.id);
            const cov = coverageForRun(r.id);
            return (
              <details key={r.id} className="group rounded-lg border p-3 open:bg-muted/20">
                <summary className="cursor-pointer text-sm marker:text-muted-foreground hover:text-foreground">
                  <span className="font-medium tabular-nums">
                    {new Date(r.finished_at).toLocaleString()}
                  </span>{" "}
                  · <span className="tabular-nums">{pct(r.line_rate)}</span> lines ·{" "}
                  <span className="tabular-nums">
                    {r.passed}/{r.total}
                  </span>{" "}
                  pass
                  {r.failed > 0 && <span className="text-destructive"> · {r.failed} failing</span>} ·{" "}
                  <Badge variant="outline">git {r.git_status}</Badge> · exit {r.exit_code}
                </summary>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <div className="min-w-0">
                    <h4 className="mb-1 text-sm font-medium">Tests ({tests.length})</h4>
                    <ul className="max-h-64 overflow-auto text-xs">
                      {tests.map((t) => (
                        <li
                          key={t.id}
                          className={cn("break-all", t.outcome !== "passed" && "text-destructive")}
                        >
                          {t.outcome === "passed" ? "·" : t.outcome[0]!.toUpperCase()} {t.key}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="min-w-0">
                    <h4 className="mb-1 text-sm font-medium">Coverage by file</h4>
                    <ul className="max-h-64 overflow-auto text-xs">
                      {cov.map((c) => (
                        <li key={c.id} className="break-all">
                          <span className="tabular-nums">{pct(c.line_rate)}</span> — {c.path} (
                          {c.lines_covered}/{c.lines_valid})
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                {r.log && (
                  <pre className="mt-3 max-h-48 overflow-auto rounded bg-muted p-2 text-xs whitespace-pre-wrap">
                    {r.log}
                  </pre>
                )}
              </details>
            );
          })}
        </TabsContent>

        {/* -------- Settings -------- */}
        <TabsContent value="settings" className="grid gap-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Project settings</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={updateProject} className="grid gap-3">
                <input type="hidden" name="id" value={projectId} />
                <Field name="name" label="Name" defaultValue={project.name} />
                <Field name="root_dir" label="Project directory" defaultValue={project.root_dir} mono />
                <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
                  <Checkbox name="git_push" defaultChecked={project.git_push === 1} />
                  Git push after commit
                </label>
                <p className="-mt-2 text-xs text-muted-foreground">
                  Every run commits a snapshot to <code>.skuld/history/</code> in this project&apos;s own
                  repo. Enable this to also push after each commit.
                </p>
                <Button type="submit" className="w-full sm:w-fit">
                  Save settings
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Test suites</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {suites.length === 0 ? (
                <p className="text-sm text-muted-foreground">No suites configured — add one below to enable Run.</p>
              ) : (
                suites.map((suite) => (
                  <details key={suite.id} className="rounded-lg border p-3">
                    <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-sm">
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
                        <Button type="submit" size="sm" variant="secondary" className="w-fit">
                          Save suite
                        </Button>
                      </form>
                      <form action={deleteSuite}>
                        <input type="hidden" name="id" value={suite.id} />
                        <input type="hidden" name="project_id" value={projectId} />
                        <ConfirmSubmitButton
                          type="submit"
                          size="sm"
                          variant="ghost"
                          confirmMessage={`Delete suite "${suite.name || suite.framework}"? Past results stay in run history.`}
                        >
                          Delete suite
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </details>
                ))
              )}

              <details className="rounded-lg border border-dashed p-3">
                <summary className="cursor-pointer text-sm font-medium">Add suite</summary>
                <form action={createSuite} className="mt-3 grid gap-3">
                  <input type="hidden" name="project_id" value={projectId} />
                  <SuiteFields defaultLanguage="other" defaultFramework="other" defaultLayer="unit" />
                  <Button type="submit" size="sm" variant="secondary" className="w-fit">
                    Add suite
                  </Button>
                </form>
              </details>
            </CardContent>
          </Card>

          <form action={deleteProject}>
            <input type="hidden" name="id" value={projectId} />
            <ConfirmSubmitButton
              type="submit"
              variant="destructive"
              size="sm"
              confirmMessage={`Delete project "${project.name}"? All runs and roadmap data will be lost. This can't be undone.`}
            >
              Delete project
            </ConfirmSubmitButton>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: "ok" | "bad" }) {
  return (
    <div className="rounded-lg border p-3 transition-colors">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          "text-lg font-semibold tabular-nums",
          tone === "bad" ? "text-destructive" : "text-foreground"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue,
  mono,
}: {
  name: string;
  label: string;
  defaultValue: string;
  mono?: boolean;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        defaultValue={defaultValue}
        autoComplete="off"
        spellCheck={false}
        className={mono ? "font-mono text-sm" : undefined}
      />
    </div>
  );
}
