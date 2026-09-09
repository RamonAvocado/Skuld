import Link from "next/link";
import { listProjects, latestRun, getSettings } from "@/lib/db";
import { AddProjectDialog } from "@/components/add-project-dialog";
import { RunButton } from "@/components/run-button";
import { saveSettings } from "@/lib/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

export default function Home() {
  const projects = listProjects();
  const settings = getSettings();

  return (
    <div className="grid gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Projects</h1>
        <AddProjectDialog />
      </div>

      {projects.length === 0 ? (
        <p className="text-sm text-muted-foreground">No projects yet. Add one to get started.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {projects.map((p) => {
            const r = latestRun(p.id);
            return (
              <Card key={p.id}>
                <CardHeader>
                  <CardTitle>
                    <Link href={`/projects/${p.id}`} className="hover:underline">
                      {p.name}
                    </Link>
                  </CardTitle>
                  <CardDescription className="truncate">{p.root_dir}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {r ? (
                      <>
                        <span className="text-foreground font-medium">{pct(r.line_rate)}</span> lines ·{" "}
                        {r.passed}/{r.total} pass
                        {r.failed > 0 && <span className="text-destructive"> · {r.failed} failing</span>}
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Coverage repo</CardTitle>
          <CardDescription>
            Every run writes a snapshot here, commits it, and (optionally) pushes — version history of your
            tests. Pre-clone the repo with a working <code>origin</code> and credentials.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={saveSettings} className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="coverage_repo_dir">Repo directory (absolute)</Label>
              <Input
                id="coverage_repo_dir"
                name="coverage_repo_dir"
                defaultValue={settings.coverage_repo_dir}
                placeholder="/home/me/repos/coverage-history"
                className="w-96 max-w-full"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="git_push"
                defaultChecked={settings.git_push === 1}
                className="size-4"
              />
              git push after commit
            </label>
            <Button type="submit" variant="secondary">
              Save
            </Button>
          </form>
          {settings.coverage_repo_dir ? (
            <Badge variant="secondary" className="mt-3">
              snapshots → {settings.coverage_repo_dir}
            </Badge>
          ) : (
            <Badge variant="outline" className="mt-3">
              not configured — runs skip git
            </Badge>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
