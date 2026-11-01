"use client";

import { Hint } from "@mimird/ui/components/tooltip";
import { PencilIcon, SettingsIcon, Trash2Icon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@mimird/ui/components/dropdown-menu";
import { Button, buttonVariants } from "@mimird/ui/components/button";
import { Input } from "@mimird/ui/components/input";
import { Label } from "@mimird/ui/components/label";
import { deleteArea, updateArea } from "@/lib/actions";
import { FormDialog } from "@/components/form-dialog";

export function AreaMenu({
  id,
  projectId,
  name,
  color,
  isAuto,
}: {
  id: number;
  projectId: number;
  name: string;
  /** The color shown now (picked or from the palette). */
  color: string;
  isAuto: boolean;
}) {
  function remove() {
    const msg = isAuto
      ? `Delete "${name}"? It will be recreated automatically on the next run.`
      : `Delete area "${name}" and its planned tests? This can't be undone.`;
    if (!window.confirm(msg)) return;
    const fd = new FormData();
    fd.set("id", String(id));
    fd.set("project_id", String(projectId));
    deleteArea(fd);
  }

  return (
    <FormDialog
      title="Edit group"
      trigger={(open) => (
        <DropdownMenu>
          <Hint label="Group Settings">
            <DropdownMenuTrigger
              aria-label={`"${name}" settings`}
              className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
            >
              <SettingsIcon aria-hidden />
            </DropdownMenuTrigger>
          </Hint>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={open}>
              <PencilIcon aria-hidden />
              Edit Group
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={remove}>
              <Trash2Icon aria-hidden />
              Delete Group
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    >
      <form action={updateArea} className="grid gap-3">
        <input type="hidden" name="id" value={id} />
        {!isAuto && (
          <div className="grid gap-1.5">
            <Label htmlFor={`area-name-${id}`}>Name</Label>
            <Input id={`area-name-${id}`} name="name" defaultValue={name} required />
          </div>
        )}
        <div className="grid gap-1.5">
          <Label htmlFor={`area-color-${id}`}>Color</Label>
          <input
            id={`area-color-${id}`}
            name="color"
            type="color"
            defaultValue={color}
            className="h-8 w-16 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
          />
        </div>
        <Button type="submit" className="w-fit">
          Save
        </Button>
      </form>
    </FormDialog>
  );
}
