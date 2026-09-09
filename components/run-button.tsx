"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Loader2Icon, PlayIcon } from "lucide-react";
import { runProjectAction } from "@/lib/actions";

function Inner({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? <Loader2Icon className="animate-spin" /> : <PlayIcon />}
      {pending ? "Running…" : label}
    </Button>
  );
}

export function RunButton({ projectId, label = "Run tests" }: { projectId: number; label?: string }) {
  return (
    <form action={runProjectAction}>
      <input type="hidden" name="id" value={projectId} />
      <Inner label={label} />
    </form>
  );
}
