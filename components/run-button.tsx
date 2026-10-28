"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@mimird/ui/components/button";
import { PlayIcon } from "lucide-react";
import { runProjectAction } from "@/lib/actions";

type Variant = React.ComponentProps<typeof Button>["variant"];

function Inner({ label, variant }: { label: string; variant?: Variant }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant={variant} loading={pending}>
      {!pending && <PlayIcon />}
      {pending ? "Running…" : label}
    </Button>
  );
}

export function RunButton({
  projectId,
  label = "Run Tests",
  variant,
  action = runProjectAction,
  kind,
}: {
  projectId: number;
  label?: string;
  variant?: Variant;
  action?: (fd: FormData) => Promise<void>;
  /** Sent along for runPerfAction: "endpoint" or "page". */
  kind?: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={projectId} />
      {kind && <input type="hidden" name="kind" value={kind} />}
      <Inner label={label} variant={variant} />
    </form>
  );
}
