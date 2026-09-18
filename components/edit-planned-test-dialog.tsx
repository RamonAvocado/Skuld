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
import { updatePlannedTest } from "@/lib/actions";
import { selectCls } from "@/lib/utils";

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
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            className={
              className ??
              "rounded-sm text-left underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none"
            }
          />
        }
      >
        {title}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit test</DialogTitle>
          <DialogDescription>Rename it and file it under a group.</DialogDescription>
        </DialogHeader>
        <form action={updatePlannedTest} className="grid gap-3">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="project_id" value={projectId} />
          <div className="grid gap-1.5">
            <Label htmlFor={`title-${id}`}>Name</Label>
            <Input id={`title-${id}`} name="title" defaultValue={title} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`area-${id}`}>Group</Label>
            <select id={`area-${id}`} name="area_id" defaultValue={areaId} className={selectCls}>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" className="w-fit">
            Save
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
