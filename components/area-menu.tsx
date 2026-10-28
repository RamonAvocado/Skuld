"use client";

import { Hint } from "@mimird/ui/components/tooltip";
import { SettingsIcon, Trash2Icon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@mimird/ui/components/dropdown-menu";
import { buttonVariants } from "@mimird/ui/components/button";
import { deleteArea } from "@/lib/actions";

export function AreaMenu({
  id,
  projectId,
  name,
  isAuto,
}: {
  id: number;
  projectId: number;
  name: string;
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
    <DropdownMenu>
      <Hint label="Area Settings">
        <DropdownMenuTrigger
          aria-label={`"${name}" settings`}
          className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
        >
          <SettingsIcon aria-hidden />
        </DropdownMenuTrigger>
      </Hint>
      <DropdownMenuContent align="end">
        <DropdownMenuItem variant="destructive" onClick={remove}>
          <Trash2Icon aria-hidden />
          Delete Area
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
