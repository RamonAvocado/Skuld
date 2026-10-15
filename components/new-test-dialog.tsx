"use client";

import { PlusIcon } from "lucide-react";
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
import { createPlannedTest } from "@/lib/actions";
import { LAYERS } from "@/lib/presets";
import { FormSelect } from "@/components/form-select";

export function NewTestDialog({
  projectId,
  areas,
}: {
  projectId: number;
  areas: { id: number; name: string }[];
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={<Button size="sm" variant="outline" disabled={areas.length === 0} title={areas.length === 0 ? "Add an area first" : undefined} />}
      >
        <PlusIcon aria-hidden />
        New test
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New test</DialogTitle>
          <DialogDescription>A test you want to add. It starts as TODO; drag it to another area anytime.</DialogDescription>
        </DialogHeader>
        <form action={createPlannedTest} className="grid gap-3">
          <input type="hidden" name="project_id" value={projectId} />
          <div className="grid gap-1.5">
            <Label htmlFor="new-test-title">Name</Label>
            <Input id="new-test-title" name="title" placeholder="e.g. rejects expired token…" required />
          </div>
          <div className="grid gap-1.5">
            <Label>Type</Label>
            <FormSelect name="layer" aria-label="Type" defaultValue="unit" options={LAYERS.map((l) => ({ value: l, label: l }))} />
          </div>
          <div className="grid gap-1.5">
            <Label>Area</Label>
            <FormSelect name="area_id" aria-label="Area" options={areas.map((a) => ({ value: String(a.id), label: a.name }))} />
          </div>
          <Button type="submit" className="w-fit">
            Add test
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
