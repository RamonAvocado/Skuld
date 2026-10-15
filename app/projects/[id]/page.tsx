import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "@/lib/utils";
import { ArrowLeftIcon, CheckIcon, XIcon } from "lucide-react";
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
  languageBreakdown,
  listSuites,
} from "@/lib/db";
import {
  createArea,
  createPlannedTest,
  togglePlannedStatus,
  deletePlannedTest,
} from "@/lib/actions";
import { LanguageBar } from "@/components/language-bar";
import { EditPlannedTestDialog } from "@/components/edit-planned-test-dialog";
import { NewTestDialog } from "@/components/new-test-dialog";
import { AreaDropZone, DraggableRow } from "@/components/dnd";
import { LAYERS } from "@/lib/presets";
import { FormSelect } from "@/components/form-select";
import { LinkTestSelect } from "@/components/link-test-select";
import { ProjectSettings } from "@/components/project-settings";
import { AreaMenu } from "@/components/area-menu";

const layerOptions = LAYERS.map((l) => ({ value: l, label: l }));
import { RunButton } from "@/components/run-button";
import { Chevron, detailsCls, summaryCls } from "@/components/disclosure";
import { EvolutionChart } from "@/components/evolution-chart";
import { ErrToast } from "@/components/err-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  const langData = last ? languageBreakdown(last.id) : [];
  // node:sqlite rows have a null prototype — plain-object them before
  // crossing the server→client boundary into EditPlannedTestDialog.
  const areaOptions = areas.map((a) => ({ id: a.id, name: a.name }));
  const discoveredKeys = discovered.map((d) => d.key);
  const suites = listSuites(projectId).map((s) => ({ ...s }));

  return (
    <div className="grid gap-6">
      <ErrToast message={err} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/"
            className="link-subtle inline-flex w-fit items-center gap-1.5 text-sm"
          >
            <ArrowLeftIcon className="size-4" aria-hidden />
            Projects
          </Link>
          <h1 className="truncate text-xl font-semibold">{project.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <RunButton projectId={projectId} />
          <ProjectSettings
            project={{ id: project.id, name: project.name, root_dir: project.root_dir, git_push: project.git_push }}
            suites={suites}
          />
        </div>
      </div>

      <Tabs defaultValue="overview">
        <div className="-mx-4 overflow-x-auto overflow-y-hidden px-4 sm:mx-0 sm:px-0">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="roadmap">Tests</TabsTrigger>
            <TabsTrigger value="runs">Runs ({runs.length})</TabsTrigger>
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
            <Tile label="TODO left" value={String(todo.length)} />
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

        {/* -------- Tests -------- */}
        <TabsContent value="roadmap" className="grid gap-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>TODO — {todo.length} tests left to add</CardTitle>
              <CardAction><NewTestDialog projectId={projectId} areas={areas.filter((a) => a.is_auto !== 1).map((a) => ({ id: a.id, name: a.name }))} /></CardAction>
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
              <AreaDropZone key={area.id} areaId={area.id} projectId={projectId}>
              <Card>
                <CardHeader>
                  <CardTitle>
                    {area.name}{" "}
                    {area.is_auto === 1 && (
                      <Badge variant="outline" className="align-middle">
                        auto
                      </Badge>
                    )}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      {done}/{planned.length} done{planned.length > done && ` · ${planned.length - done} left`}
                    </span>
                  </CardTitle>
                  <CardAction>
                    <AreaMenu id={area.id} projectId={projectId} name={area.name} isAuto={area.is_auto === 1} />
                  </CardAction>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {planned.length > 0 && (
                    <details className="group" open>
                      <summary className={summaryCls + " font-medium text-muted-foreground"}>
                        <Chevron />
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
                            <DraggableRow key={p.id} id={p.id}>
                              <TableCell>
                                <form action={togglePlannedStatus}>
                                  <input type="hidden" name="id" value={p.id} />
                                  <input type="hidden" name="project_id" value={projectId} />
                                  <button
                                    type="submit"
                                    aria-label={p.status === "done" ? "Mark as not done" : "Mark as done"}
                                    aria-pressed={p.status === "done"}
                                    title="Toggle done"
                                    className={cn(
                                      "flex size-4 items-center justify-center rounded-[4px] border border-input transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
                                      p.status === "done" &&
                                        "border-primary bg-primary text-primary-foreground dark:bg-primary"
                                    )}
                                  >
                                    {p.status === "done" && <CheckIcon className="size-3.5" />}
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
                                <LinkTestSelect
                                  id={p.id}
                                  projectId={projectId}
                                  title={p.title}
                                  current={p.discovered_test_key}
                                  keys={discoveredKeys}
                                />
                              </TableCell>
                              <TableCell>
                                <form action={deletePlannedTest}>
                                  <input type="hidden" name="id" value={p.id} />
                                  <input type="hidden" name="project_id" value={projectId} />
                                  <Button
                                    type="submit"
                                    size="icon-sm"
                                    variant="ghost"
                                    title="Delete test"
                                    aria-label={`Delete "${p.title}"`}
                                  >
                                    <XIcon />
                                  </Button>
                                </form>
                              </TableCell>
                            </DraggableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </details>
                  )}

                  {area.is_auto !== 1 && (
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
                    <FormSelect name="layer" aria-label="Layer" defaultValue="unit" options={layerOptions} />
                    <Button type="submit" variant="outline">
                      Add test
                    </Button>
                  </form>
                  )}
                </CardContent>
              </Card>
              </AreaDropZone>
            );
          })}

          <form action={createArea} className="flex items-end gap-2">
            <input type="hidden" name="project_id" value={projectId} />
            <div className="grid gap-1.5">
              <Label htmlFor="area-name">New area</Label>
              <Input id="area-name" name="name" placeholder="Auth, Listing, Billing…" className="w-64" required />
            </div>
            <Button type="submit" variant="outline">
              Add area
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
              <details key={r.id} className={detailsCls}>
                <summary className={summaryCls}>
                  <Chevron />
                  <span className="font-medium tabular-nums">
                    {new Date(r.finished_at).toLocaleString()}
                  </span>
                  <span className="text-muted-foreground">
                    <span className="tabular-nums">{pct(r.line_rate)}</span> lines ·{" "}
                    <span className="tabular-nums">
                      {r.passed}/{r.total}
                    </span>{" "}
                    pass
                    {r.failed > 0 && <span className="text-destructive"> · {r.failed} failing</span>} · exit{" "}
                    {r.exit_code}
                  </span>
                  <Badge variant="secondary">git {r.git_status}</Badge>
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
                  <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-muted p-2 text-xs whitespace-pre-wrap">
                    {r.log}
                  </pre>
                )}
              </details>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: "ok" | "bad" }) {
  return (
    <Card size="sm">
      <CardContent>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={cn("text-lg font-semibold tabular-nums", tone === "bad" && "text-destructive")}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
