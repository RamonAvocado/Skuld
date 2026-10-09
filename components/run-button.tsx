"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Loader2Icon, PlayIcon } from "lucide-react";
import { runProjectAction } from "@/lib/actions";

type Variant = React.ComponentProps<typeof Button>["variant"];

function Inner({ label, variant }: { label: string; variant?: Variant }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant={variant} disabled={pending}>
      {pending ? <Loader2Icon className="animate-spin" /> : <PlayIcon />}
      {pending ? "Running…" : label}
    </Button>
  );
}

export function RunButton({
  projectId,
  label = "Run tests",
  variant,
}: {
  projectId: number;
  label?: string;
  variant?: Variant;
}) {
  return (
    <form action={runProjectAction}>
      <input type="hidden" name="id" value={projectId} />
      <Inner label={label} variant={variant} />
    </form>
  );
}
