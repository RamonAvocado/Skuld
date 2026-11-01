"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { movePlannedTest } from "@/lib/actions";

// Native HTML5 drag & drop. Keyboard fallback: the Edit dialog's Group select.
export function DraggableRow({ id, className, children }: { id: number; className?: string; children: React.ReactNode }) {
  return (
    <li
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", String(id))}
      className={cn("cursor-grab active:cursor-grabbing", className)}
    >
      {children}
    </li>
  );
}

export function AreaDropZone({
  areaId,
  projectId,
  children,
}: {
  areaId: number;
  projectId: number;
  children: React.ReactNode;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const id = Number(e.dataTransfer.getData("text/plain"));
        if (id) movePlannedTest(id, areaId, projectId);
      }}
      className={cn("rounded-xl transition-shadow", over && "ring-2 ring-ring")}
    >
      {children}
    </div>
  );
}
