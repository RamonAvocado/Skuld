import { ExternalLinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { listPerfEntries, listPerfRuns, perfResultsForRun, perfSeries, type PerfKind, type PerfResult } from "@/lib/db";
import { createPerfEntry, deletePerfEntry, runPerfAction } from "@/lib/actions";
import { RunButton } from "@/components/run-button";
import { PerfChart } from "@/components/perf-chart";
import { FormSelect } from "@/components/form-select";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { Chevron, detailsCls, summaryCls } from "@/components/disclosure";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@mimird/ui/components/card";
import { Button } from "@mimird/ui/components/button";
import { Input } from "@mimird/ui/components/input";
import { Badge } from "@mimird/ui/components/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@mimird/ui/components/table";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => ({ value: m, label: m }));

function ms(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(2)} s` : `${Math.round(n)} ms`;
}

function size(n: number) {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

function delta(now: number, before: number | undefined) {
  if (!before || !now) return "—";
  const d = ((now - before) / before) * 100;
  return `${d >= 0 ? "+" : "−"}${Math.abs(d).toFixed(0)}%`;
}

function failing(r: PerfResult) {
  return Boolean(r.error) || r.status === 0 || r.status >= 400;
}

export function PerfPanel({ projectId, kind }: { projectId: number; kind: PerfKind }) {
  const entries = listPerfEntries(projectId, kind);
  const runs = listPerfRuns(projectId, kind);
  const [last, prev] = runs;
  const results = last ? perfResultsForRun(last.id) : [];
  const before = new Map(prev ? perfResultsForRun(prev.id).map((r) => [r.entry_id, r.ms]) : []);
  const latestByEntry = new Map(results.map((r) => [r.entry_id, r]));
  const series = perfSeries(projectId, kind);
  const isPage = kind === "page";
  const noun = isPage ? "page" : "endpoint";
  const Noun = isPage ? "Page" : "Endpoint";

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>
            Latest run{" "}
            {last && (
              <span className="text-sm font-normal text-muted-foreground tabular-nums">
                {new Date(last.finished_at).toLocaleString()}
              </span>
            )}
          </CardTitle>
          <CardAction className="flex items-center gap-2">
            {last?.report_dir && (
              <Button
                variant="ghost"
                size="sm"
                nativeButton={false}
                render={<a href={`/perf-report/${last.report_dir}/report/index.html`} target="_blank" rel="noreferrer" />}
              >
                <ExternalLinkIcon aria-hidden />
                Full report
              </Button>
            )}
            <RunButton
              projectId={projectId}
              label={isPage ? "Run Pages" : "Run Endpoints"}
              variant="outline"
              action={runPerfAction}
              kind={kind}
            />
          </CardAction>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground">No runs yet.</p>
          ) : (
            <ResultsTable results={results} isPage={isPage} before={before} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {isPage ? "Pages" : "Endpoints"}{" "}
            <span className="text-sm font-normal text-muted-foreground tabular-nums">{entries.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {entries.length === 0 && <p className="text-sm text-muted-foreground">No {noun}s yet.</p>}
          {entries.map((e) => {
            const latest = latestByEntry.get(e.id);
            return (
              <details key={e.id} className={detailsCls}>
                <summary className={summaryCls}>
                  <Chevron />
                  {e.area && <Badge variant="outline">{e.area}</Badge>}
                  <span className="min-w-0 font-mono text-xs break-all">
                    {!isPage && <span className="text-muted-foreground">{e.method} </span>}
                    {e.path}
                    {e.body && <span className="text-muted-foreground"> · body</span>}
                  </span>
                  {latest && (
                    <span className="ml-auto shrink-0 text-muted-foreground tabular-nums">
                      <span className={cn("font-medium", failing(latest) ? "text-destructive" : "text-foreground")}>
                        {ms(latest.ms)}
                      </span>{" "}
                      · {size(latest.bytes)} · {delta(latest.ms, before.get(e.id))}
                    </span>
                  )}
                </summary>
                <div className="mt-3 grid gap-3">
                  <PerfChart data={series.get(e.id) ?? []} isPage={isPage} />
                  <div className="flex items-center gap-3">
                    {latest?.report_path && (
                      <a className="link-subtle text-sm" href={`/perf-report/${latest.report_path}`} target="_blank" rel="noreferrer">
                        Latest report
                      </a>
                    )}
                    <form action={deletePerfEntry} className="ml-auto">
                      <input type="hidden" name="id" value={e.id} />
                      <input type="hidden" name="project_id" value={projectId} />
                      <ConfirmSubmitButton
                        size="sm"
                        variant="ghost"
                        confirmTitle={`Delete ${e.path}?`}
                        confirmMessage="Past results stay in run history."
                      >
                        Delete {Noun}
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </div>
              </details>
            );
          })}

          <form action={createPerfEntry} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="project_id" value={projectId} />
            <input type="hidden" name="kind" value={kind} />
            {!isPage && <FormSelect name="method" aria-label="Method" defaultValue="GET" options={METHODS} />}
            <Input
              name="path"
              aria-label="Path"
              placeholder={isPage ? "/pricing" : "/api/v1/u/{userId}/usage"}
              className="w-72 font-mono text-sm"
              required
            />
            <Input name="area" aria-label="Area" placeholder="Area (optional)" className="w-40" />
            {!isPage && (
              <Input name="body" aria-label="JSON body" placeholder="JSON body (optional)" className="w-48 font-mono text-sm" />
            )}
            <Button type="submit" variant="outline">
              Add {Noun}
            </Button>
          </form>
        </CardContent>
      </Card>

      {runs.length > 1 && (
        <div className="grid gap-3">
          {runs.slice(1).map((r) => (
            <details key={r.id} className={detailsCls}>
              <summary className={summaryCls}>
                <Chevron />
                <span className="font-medium tabular-nums">{new Date(r.finished_at).toLocaleString()}</span>
                <span className="text-muted-foreground tabular-nums">
                  {perfResultsForRun(r.id).length} measured
                  {r.failed > 0 && <span className="text-destructive"> · {r.failed} failing</span>}
                </span>
              </summary>
              <div className="mt-3 grid gap-3">
                <ResultsTable results={perfResultsForRun(r.id)} isPage={isPage} />
                {r.report_dir && (
                  <a className="link-subtle w-fit text-sm" href={`/perf-report/${r.report_dir}/report/index.html`} target="_blank" rel="noreferrer">
                    Full report
                  </a>
                )}
              </div>
            </details>
          ))}
        </div>
      )}

      {last?.log && (
        <details className={detailsCls}>
          <summary className={summaryCls}>
            <Chevron />
            Log of the latest run
          </summary>
          <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-muted p-2 text-xs whitespace-pre-wrap">{last.log}</pre>
        </details>
      )}
    </div>
  );
}

function ResultsTable({
  results,
  isPage,
  before,
}: {
  results: PerfResult[];
  isPage: boolean;
  before?: Map<number | null, number>;
}) {
  const num = "text-right tabular-nums";
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{isPage ? "Page" : "Endpoint"}</TableHead>
          <TableHead className="text-right">Status</TableHead>
          {isPage && <TableHead className="text-right">Requests</TableHead>}
          <TableHead className="text-right">Size</TableHead>
          <TableHead className="text-right">TTFB</TableHead>
          {isPage && <TableHead className="text-right">FCP</TableHead>}
          {isPage && <TableHead className="text-right">LCP</TableHead>}
          <TableHead className="text-right">{isPage ? "Load" : "Time"}</TableHead>
          {before && <TableHead className="text-right">vs last</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {results.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="font-mono text-xs break-all whitespace-normal">
              {r.area && (
                <Badge variant="outline" className="mr-2 font-sans">
                  {r.area}
                </Badge>
              )}
              {r.report_path ? (
                <a className="link-subtle" href={`/perf-report/${r.report_path}`} target="_blank" rel="noreferrer">
                  {r.label}
                </a>
              ) : (
                r.label
              )}
              {r.error && <div className="font-sans text-destructive">{r.error}</div>}
            </TableCell>
            <TableCell className={cn(num, failing(r) && "text-destructive")}>{r.status || "—"}</TableCell>
            {isPage && <TableCell className={num}>{r.requests}</TableCell>}
            <TableCell className={num}>{size(r.bytes)}</TableCell>
            <TableCell className={num}>{ms(r.ttfb)}</TableCell>
            {isPage && <TableCell className={num}>{ms(r.fcp)}</TableCell>}
            {isPage && <TableCell className={num}>{ms(r.lcp)}</TableCell>}
            <TableCell className={cn(num, "font-medium")}>{ms(r.ms)}</TableCell>
            {before && <TableCell className={cn(num, "text-muted-foreground")}>{delta(r.ms, before.get(r.entry_id))}</TableCell>}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
