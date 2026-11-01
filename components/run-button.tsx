"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@mimird/ui/components/button";
import { PlayIcon } from "lucide-react";
import { runProjectAction } from "@/lib/actions";

type Variant = React.ComponentProps<typeof Button>["variant"];

function Inner({ label, variant, running }: { label: string; variant?: Variant; running?: boolean }) {
  const { pending } = useFormStatus();
  // running: started from another tab or before a reload, so this form isn't the one waiting.
  const busy = pending || running;
  return (
    <Button type="submit" size="sm" variant={variant} loading={busy}>
      {!busy && <PlayIcon />}
      {busy ? "Running…" : label}
    </Button>
  );
}

export function RunButton({
  projectId,
  label = "Run Tests",
  variant,
  action = runProjectAction,
  kind,
  running,
}: {
  projectId: number;
  label?: string;
  variant?: Variant;
  action?: (fd: FormData) => Promise<void>;
  /** Sent along for runPerfAction: "endpoint" or "page". */
  kind?: string;
  running?: boolean;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={projectId} />
      {kind && <input type="hidden" name="kind" value={kind} />}
      <Inner label={label} variant={variant} running={running} />
    </form>
  );
}
