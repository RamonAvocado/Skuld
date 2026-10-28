"use client";

import { Button } from "@mimird/ui/components/button";
import { Input } from "@mimird/ui/components/input";
import { Label } from "@mimird/ui/components/label";
import { PlusIcon } from "lucide-react";
import { createProject } from "@/lib/actions";
import { SuiteFields } from "@/components/suite-fields";
import { FormDialog } from "@/components/form-dialog";

export function AddProjectDialog() {
  return (
    <FormDialog
      title="Add a project"
      description="Point Skuld at a local checkout, and pick how its first test suite runs. You can add more suites later in Settings."
      trigger={(open) => (
        <Button size="sm" onClick={open}>
          <PlusIcon /> Add Project
        </Button>
      )}
    >
        <form action={createProject} className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="my-api…" autoComplete="off" required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="root_dir">Project directory (absolute)</Label>
            <Input
              id="root_dir"
              name="root_dir"
              placeholder="/home/me/repos/my-api…"
              autoComplete="off"
              spellCheck={false}
              required
            />
          </div>
          <SuiteFields defaultLanguage="python" defaultFramework="pytest" defaultLayer="unit" />
          <Button type="submit" className="mt-1 w-full sm:w-fit">
            Create Project
          </Button>
        </form>
    </FormDialog>
  );
}
