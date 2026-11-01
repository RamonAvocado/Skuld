import { Hint } from "@mimird/ui/components/tooltip";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "@/lib/utils";
import { ArrowLeftIcon, CheckIcon, CircleXIcon, GripVerticalIcon, Link2Icon, XIcon } from "lucide-react";
import {
  getProjectByUuid,
  listPerfEntries,
  listPerfRuns,
  latestRun,
  listRuns,
  runSeries,
  discoveredForRun,
  coverageForRun,
  listAreas,
  plannedForArea,
  roadmap,
  languageBreakdown,
  areaSeries,
  listSuites,
} from "@/lib/db";
import {
  togglePlannedStatus,
  deletePlannedTest,
} from "@/lib/actions";
import { LanguageBar } from "@/components/language-bar";
import { EditPlannedTestDialog } from "@/components/edit-planned-test-dialog";
import { NewTestDialog } from "@/components/new-test-dialog";
import { AreaDropZone, DraggableRow } from "@/components/dnd";
import { areaColor } from "@/lib/presets";
import { ProjectSettings } from "@/components/project-settings";
import { AreaMenu } from "@/components/area-menu";
import { RunButton } from "@/components/run-button";
import { Chevron, detailsCls, summaryCls } from "@/components/disclosure";
import { EvolutionChart, GroupEvolutionChart } from "@/components/evolution-chart";
import { ErrToast } from "@/components/err-toast";
import { PerfPanel, ms, delta } from "@/components/perf-panel";
import { UrlTabs } from "@/components/url-tabs";
import { TabsContent, TabsList, TabsTrigger } from "@mimird/ui/components/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@mimird/ui/components/card";
import { Button } from "@mimird/ui/components/button";
import { Badge } from "@mimird/ui/components/badge";

export const dynamic = "force-dynamic";

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ err?: string; tab?: string }>;
}) {
  const { id } = await params;
  const { err, tab } = await searchParams;
  const project = getProjectByUuid(id);
  if (!project) notFound();
  const projectId = project.id;

  const last = latestRun(projectId);
  const series = runSeries(projectId);
  const runs = listRuns(projectId);
  const areas = listAreas(projectId);
  const todo = roadmap(projectId);
  const discovered = last ? discoveredForRun(last.id) : [];
  const langData = last ? languageBreakdown(last.id) : [];
  // node:sqlite rows have a null prototype — plain-object them before
  // crossing the server→client boundary into EditPlannedTestDialog.
  const groups = areas.filter((a) => a.is_auto !== 1);
  const areaOptions = groups.map((a) => ({ id: a.id, name: a.name }));
  const discoveredKeys = discovered.map((d) => d.key);
  // Each linked test's time in the latest run vs the run before it.
  const duration = new Map(discovered.map((d) => [d.key, d.duration_ms]));
  const outcome = new Map(discovered.map((d) => [d.key, d.outcome]));
  const colorOf = new Map(areas.map((a, i) => [a.id, areaColor(a, i)]));
  const prevDuration = new Map(runs[1] ? discoveredForRun(runs[1].id).map((d) => [d.key, d.duration_ms]) : []);
  const suites = listSuites(projectId).map((s) => ({ ...s }));
  const tests = project.enable_tests === 1;
  const perf = project.enable_perf === 1;
  const activeTab =
    tab === "test" && tests
      ? "test"
      : (tab === "endpoints" || tab === "performance") && perf
        ? "endpoints"
        : tab === "pages" && perf
          ? "pages"
          : "overview";

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
          <ProjectSettings
            project={{
              id: project.id,
              name: project.name,
              root_dir: project.root_dir,
              enable_tests: project.enable_tests,
              enable_perf: project.enable_perf,
              sitespeed_command: project.sitespeed_command,
            }}
            suites={suites}
          />
        </div>
      </div>

      <UrlTabs defaultValue={activeTab}>
        <div className="-mx-4 overflow-x-auto overflow-y-hidden px-4 sm:mx-0 sm:px-0">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {tests && <TabsTrigger value="test">Tests</TabsTrigger>}
            {perf && <TabsTrigger value="endpoints">Endpoints</TabsTrigger>}
            {perf && <TabsTrigger value="pages">Pages</TabsTrigger>}
          </TabsList>
        </div>

        {/* -------- Performance -------- */}
        {perf && (
          <>
            <TabsContent value="endpoints" className="pt-4">
              <PerfPanel projectId={projectId} kind="endpoint" />
            </TabsContent>
            <TabsContent value="pages" className="pt-4">
              <PerfPanel projectId={projectId} kind="page" />
            </TabsContent>
          </>
        )}

        {/* -------- Overview -------- */}
        <TabsContent value="overview" className="grid gap-4 pt-4">
          {!tests && !perf && (
            <p className="text-sm text-muted-foreground">Turn on tests or performance in the project settings.</p>
          )}
          {tests && (
            <section className="grid gap-3">
              <h2 className="font-medium">Tests</h2>
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
            </section>
          )}
          {perf && (
            <section className="grid gap-3">
              <h2 className="font-medium">Performance</h2>
              {(["endpoint", "page"] as const).map((kind) => {
                const count = listPerfEntries(projectId, kind).length;
                const [lastPerf] = listPerfRuns(projectId, kind);
                return (
                  <div key={kind} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Tile label={kind === "page" ? "Pages" : "Endpoints"} value={String(count)} />
                    <Tile label="Last run" value={lastPerf ? new Date(lastPerf.finished_at).toLocaleDateString() : "—"} />
                    <Tile
                      label="Failing"
                      value={lastPerf ? String(lastPerf.failed) : "—"}
                      tone={lastPerf && lastPerf.failed > 0 ? "bad" : "ok"}
                    />
                    <Tile label="Total time" value={lastPerf ? ms(lastPerf.total_ms) : "—"} />
                  </div>
                );
              })}
            </section>
          )}
        </TabsContent>

        {/* -------- Tests -------- */}
        <TabsContent value="test" className="grid gap-3 pt-4">
          <div className="flex justify-end">
            <RunButton projectId={projectId} />
          </div>
          <details className={detailsCls} suppressHydrationWarning>
            <summary className={summaryCls}>
              <Chevron />
              <span className="font-medium">TODO</span>
              <span className="text-muted-foreground">{todo.length === 0 ? "nothing outstanding" : `${todo.length} left`}</span>
              <span className="ml-auto">
                <NewTestDialog projectId={projectId} areas={areaOptions} />
              </span>
            </summary>
            {todo.length > 0 && (
              <ul className="mt-2 grid text-sm">
                {todo.map((t) => (
                  <DraggableRow key={t.id} id={t.id} className="group/row flex h-7 min-w-0 items-center gap-2 rounded-md px-1 hover:bg-muted/50">
                    <Grip />
                    <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: colorOf.get(t.area_id) }} />
                    <span className="shrink-0 text-muted-foreground">{t.area_name}</span>
                    <span className="truncate">{t.title}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">{t.layer}</span>
                  </DraggableRow>
                ))}
              </ul>
            )}
          </details>

          {areas.map((area) => {
            const planned = plannedForArea(area.id);
            // The auto area only shows up while it holds newly discovered tests to sort.
            if (area.is_auto === 1 && planned.length === 0) return null;
            const done = planned.filter((p) => p.status === "done").length;
            const linked = planned.flatMap((p) => (p.discovered_test_key && outcome.has(p.discovered_test_key) ? [p.discovered_test_key] : []));
            const failing = linked.filter((k) => outcome.get(k) !== "passed").length;
            const totalMs = linked.reduce((n, k) => n + (duration.get(k) ?? 0), 0);
            const color = colorOf.get(area.id)!;
            return (
              <AreaDropZone key={area.id} areaId={area.id} projectId={projectId}>
                <details className={detailsCls} suppressHydrationWarning>
                  <summary className={summaryCls + " flex-nowrap"}>
                    <Chevron />
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                    <span className="truncate font-medium">{area.name}</span>
                    {area.is_auto === 1 && <Badge variant="outline">auto</Badge>}
                    <span
                      role="img"
                      aria-label={`${done} of ${planned.length} done`}
                      className="hidden h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-muted sm:block"
                    >
                      <span
                        className="block h-full"
                        style={{ width: `${planned.length ? (done / planned.length) * 100 : 0}%`, backgroundColor: color }}
                      />
                    </span>
                    <span className="shrink-0 text-muted-foreground tabular-nums">
                      {done}/{planned.length}
                      {failing > 0 && <span className="text-destructive"> · {failing} failing</span>}
                      {totalMs > 0 && <span className="hidden sm:inline"> · {ms(totalMs)}</span>}
                    </span>
                    <span className="ml-auto shrink-0">
                      <AreaMenu id={area.id} projectId={projectId} name={area.name} color={color} isAuto={area.is_auto === 1} />
                    </span>
                  </summary>
                  <ul className="mt-2 grid text-sm">
                    {planned.map((p) => {
                      const key = p.discovered_test_key;
                      const result = key ? outcome.get(key) : undefined;
                      return (
                        <DraggableRow
                          key={p.id}
                          id={p.id}
                          className="group/row flex h-8 min-w-0 items-center gap-2 rounded-md px-1 hover:bg-muted/50"
                        >
                          <Grip />
                          <form action={togglePlannedStatus} className="flex">
                            <input type="hidden" name="id" value={p.id} />
                            <input type="hidden" name="project_id" value={projectId} />
                            <Hint label={p.status === "done" ? "Mark as not done" : "Mark as done"}>
                              <button
                                type="submit"
                                aria-label={p.status === "done" ? "Mark as not done" : "Mark as done"}
                                aria-pressed={p.status === "done"}
                                className={cn(
                                  "flex size-4 items-center justify-center rounded-[4px] border border-input transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
                                  p.status === "done" && "border-primary bg-primary text-primary-foreground dark:bg-primary"
                                )}
                              >
                                {p.status === "done" && <CheckIcon className="size-3.5" />}
                              </button>
                            </Hint>
                          </form>
                          <span className={cn("truncate", p.status === "done" && "text-muted-foreground")} title={p.title}>
                            {p.title}
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">{p.layer}</span>
                          {key && (
                            <Hint label={result ? `${key} · ${result}` : `${key} · not in last run`}>
                              <span className="flex shrink-0" aria-label={`Linked to ${key}`}>
                                {result && result !== "passed" ? (
                                  <CircleXIcon className="size-3.5 text-destructive" />
                                ) : (
                                  <Link2Icon className={cn("size-3.5", result ? "text-muted-foreground" : "text-muted-foreground/40")} />
                                )}
                              </span>
                            </Hint>
                          )}
                          <span className="ml-auto shrink-0 text-xs tabular-nums whitespace-nowrap">
                            {key && duration.has(key) && (
                              <>
                                {ms(duration.get(key)!)}{" "}
                                <span className="text-muted-foreground">{delta(duration.get(key)!, prevDuration.get(key))}</span>
                              </>
                            )}
                          </span>
                          <span className="flex shrink-0 opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100">
                            <EditPlannedTestDialog
                              id={p.id}
                              projectId={projectId}
                              title={p.title}
                              areaId={p.area_id}
                              layer={p.layer}
                              linked={key}
                              keys={discoveredKeys}
                              areas={areaOptions}
                            />
                            <form action={deletePlannedTest}>
                              <input type="hidden" name="id" value={p.id} />
                              <input type="hidden" name="project_id" value={projectId} />
                              <Hint label="Delete Test">
                                <Button type="submit" size="icon-sm" variant="ghost" aria-label={`Delete "${p.title}"`}>
                                  <XIcon />
                                </Button>
                              </Hint>
                            </form>
                          </span>
                        </DraggableRow>
                      );
                    })}
                  </ul>
                </details>
              </AreaDropZone>
            );
          })}

          <Card>
            <CardHeader>
              <CardTitle>Evolution by group</CardTitle>
            </CardHeader>
            <CardContent>
              <GroupEvolutionChart
                data={areaSeries(projectId)}
                groups={groups.map((a) => ({ id: a.id, name: a.name, color: colorOf.get(a.id)! }))}
              />
            </CardContent>
          </Card>
          <details className={detailsCls} suppressHydrationWarning>
            <summary className={summaryCls}>
              <Chevron />
              <span className="font-medium">Runs</span>
              <span className="text-muted-foreground tabular-nums">{runs.length}</span>
            </summary>
            <div className="mt-3 grid gap-2">
              {runs.length === 0 && <p className="text-sm text-muted-foreground">No runs yet.</p>}
              {runs.map((r) => {
                const tests = discoveredForRun(r.id);
                const cov = coverageForRun(r.id);
                return (
                  <details key={r.id} className={detailsCls} suppressHydrationWarning>
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
            </div>
          </details>
        </TabsContent>
      </UrlTabs>
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

// Drag affordance; the whole row is draggable, this just shows it.
function Grip() {
  return (
    <GripVerticalIcon
      aria-hidden
      className="-ml-1 size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/row:opacity-100"
    />
  );
}
