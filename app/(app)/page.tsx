import Link from "next/link";
import { listProjects, latestRun, languageBreakdown } from "@/lib/db";
import { AddProjectDialog } from "@/components/add-project-dialog";
import { RunButton } from "@/components/run-button";
import { LanguageBar } from "@/components/language-bar";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@mimird/ui/components/card";

export const dynamic = "force-dynamic";

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

export default function Home() {
  const projects = listProjects();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-balance">Projects</h1>
        <AddProjectDialog />
      </div>

      {projects.length === 0 ? (
        <p className="text-sm text-muted-foreground">No projects yet.</p>
      ) : (
        <div className="grid gap-3">
          {projects.map((p) => {
            const r = latestRun(p.id);
            return (
              <Card key={p.id} className="transition-colors hover:bg-muted/50">
                <CardHeader>
                  <CardTitle className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                    <Link
                      href={`/projects/${p.id}`}
                      className="rounded-sm underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none"
                    >
                      {p.name}
                    </Link>
                    <span className="text-sm font-normal text-muted-foreground">
                      {r ? (
                        <>
                          <span className="font-medium tabular-nums text-foreground">{pct(r.line_rate)}</span>{" "}
                          lines ·{" "}
                          <span className="tabular-nums">
                            {r.passed}/{r.total}
                          </span>{" "}
                          pass
                          {r.failed > 0 && (
                            <span className="text-destructive"> · {r.failed} failing</span>
                          )}
                        </>
                      ) : (
                        "Never run."
                      )}
                    </span>
                  </CardTitle>
                  <CardAction>
                    {p.enable_tests === 1 && <RunButton projectId={p.id} label="Run" variant="outline" />}
                  </CardAction>
                </CardHeader>
                {r && (
                  <CardContent>
                    <LanguageBar data={languageBreakdown(r.id)} compact />
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
