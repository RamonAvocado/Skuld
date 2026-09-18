import Link from "next/link";
import { listProjects, latestRun, languageBreakdown } from "@/lib/db";
import { AddProjectDialog } from "@/components/add-project-dialog";
import { RunButton } from "@/components/run-button";
import { LanguageBar } from "@/components/language-bar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

export default function Home() {
  const projects = listProjects();

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-balance">Projects</h1>
        <AddProjectDialog />
      </div>

      {projects.length === 0 ? (
        <div className="grid place-items-center gap-2 rounded-xl border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">No projects yet. Add one to get started.</p>
          <AddProjectDialog />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {projects.map((p) => {
            const r = latestRun(p.id);
            return (
              <Card
                key={p.id}
                className="transition-shadow hover:shadow-md focus-within:shadow-md"
              >
                <CardHeader>
                  <CardTitle className="min-w-0">
                    <Link
                      href={`/projects/${p.id}`}
                      className="rounded-sm underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none"
                    >
                      {p.name}
                    </Link>
                  </CardTitle>
                  <CardDescription className="truncate" title={p.root_dir}>
                    {p.root_dir}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 text-sm text-muted-foreground">
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
                          <br />
                          <span className="text-xs">
                            {new Date(r.finished_at).toLocaleString()} · git {r.git_status}
                          </span>
                        </>
                      ) : (
                        "never run"
                      )}
                    </div>
                    <RunButton projectId={p.id} label="Run" />
                  </div>
                  {r && <LanguageBar data={languageBreakdown(r.id)} compact />}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
