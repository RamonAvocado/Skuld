"use client";

import { Button } from "@mimird/ui/components/button";
import { Input } from "@mimird/ui/components/input";
import { Label } from "@mimird/ui/components/label";
import { updatePlannedTest } from "@/lib/actions";
import { FormSelect } from "@/components/form-select";
import { FormDialog } from "@/components/form-dialog";

export function EditPlannedTestDialog({
  id,
  projectId,
  title,
  areaId,
  areas,
  className,
}: {
  id: number;
  projectId: number;
  title: string;
  areaId: number;
  areas: { id: number; name: string }[];
  className?: string;
}) {
  return (
    <FormDialog
      title="Edit test"
      description="Rename it and file it under a group."
      trigger={(open) => (
        <button
          type="button"
          onClick={open}
          className={
            className ??
            "rounded-sm text-left underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none"
          }
        >
          {title}
        </button>
      )}
    >
        <form action={updatePlannedTest} className="grid gap-3">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="project_id" value={projectId} />
          <div className="grid gap-1.5">
            <Label htmlFor={`title-${id}`}>Name</Label>
            <Input id={`title-${id}`} name="title" defaultValue={title} required />
          </div>
          <div className="grid gap-1.5">
            <Label>Group</Label>
            <FormSelect name="area_id" aria-label="Group" defaultValue={String(areaId)} options={areas.map((a) => ({ value: String(a.id), label: a.name }))} />
          </div>
          <Button type="submit" className="w-fit">
            Save
          </Button>
        </form>
    </FormDialog>
  );
}
