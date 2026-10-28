"use client";

import * as React from "react";
import { Modal } from "@mimird/ui/components/modal";

/** A `Modal` opened by its own trigger, with a visible title and description over a form. */
export function FormDialog({
  trigger,
  title,
  description,
  className,
  children,
}: {
  /** Gets the open function, e.g. `(open) => <Button onClick={open}>…</Button>`. */
  trigger: (open: () => void) => React.ReactNode;
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      {trigger(() => setOpen(true))}
      <Modal open={open} onOpenChange={setOpen} title={title} className={className}>
        <div className="flex flex-col gap-1">
          <h2 aria-hidden className="font-heading text-base font-medium">
            {title}
          </h2>
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>
        {children}
      </Modal>
    </>
  );
}
