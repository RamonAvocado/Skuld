"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusIcon } from "lucide-react";
import { createProject } from "@/lib/actions";
import { SuiteFields } from "@/components/suite-fields";

export function AddProjectDialog() {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button size="sm">
            <PlusIcon /> Add project
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a project</DialogTitle>
          <DialogDescription>
            Point Skuld at a local checkout, and pick how its first test suite runs. You can add more suites
            later in Settings.
          </DialogDescription>
        </DialogHeader>
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
            Create project
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
