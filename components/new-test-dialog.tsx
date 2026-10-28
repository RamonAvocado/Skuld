"use client";

import { PlusIcon } from "lucide-react";
import { Hint } from "@mimird/ui/components/tooltip";
import { Button } from "@mimird/ui/components/button";
import { Input } from "@mimird/ui/components/input";
import { Label } from "@mimird/ui/components/label";
import { createPlannedTest } from "@/lib/actions";
import { LAYERS } from "@/lib/presets";
import { FormSelect } from "@/components/form-select";
import { FormDialog } from "@/components/form-dialog";

export function NewTestDialog({
  projectId,
  areas,
}: {
  projectId: number;
  areas: { id: number; name: string }[];
}) {
  return (
    <FormDialog
      title="New test"
      description="A test you want to add. It starts as TODO; drag it to another area anytime."
      trigger={(open) => {
        const button = (
          <Button size="sm" variant="outline" disabled={areas.length === 0} onClick={open}>
            <PlusIcon aria-hidden />
            New Test
          </Button>
        );
        // a disabled button gets no pointer events, so the hint sits on a wrapper
        return areas.length === 0 ? (
          <Hint label="Add an area first">
            <span tabIndex={0}>{button}</span>
          </Hint>
        ) : (
          button
        );
      }}
    >
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
            Add Test
          </Button>
        </form>
    </FormDialog>
  );
}
