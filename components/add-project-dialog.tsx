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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a project</DialogTitle>
          <DialogDescription>
            Point Skuld at a local checkout and give it the command that writes JUnit + Cobertura reports.
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
          <div className="grid gap-1.5">
            <Label htmlFor="test_command">Test command</Label>
            <Input
              id="test_command"
              name="test_command"
              defaultValue="pytest --junitxml=.skuld/junit.xml --cov --cov-report=xml:.skuld/coverage.xml"
              autoComplete="off"
              spellCheck={false}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="junit_path">JUnit XML path</Label>
              <Input
                id="junit_path"
                name="junit_path"
                defaultValue=".skuld/junit.xml"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="coverage_xml_path">Coverage XML path</Label>
              <Input
                id="coverage_xml_path"
                name="coverage_xml_path"
                defaultValue=".skuld/coverage.xml"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>
          <Button type="submit" className="mt-1 w-full sm:w-fit">
            Create project
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
