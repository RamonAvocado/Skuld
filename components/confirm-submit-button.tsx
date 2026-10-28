"use client";

import * as React from "react";
import { Button } from "@mimird/ui/components/button";
import { ConfirmDialog } from "@mimird/ui/components/modal";

type Props = React.ComponentProps<typeof Button> & {
  /** The dialog's title, a question: `Delete "my-api"?` */
  confirmTitle: string;
  confirmMessage?: string;
};

/** A button inside a form that asks through `ConfirmDialog`, then submits that form. */
export function ConfirmSubmitButton({ confirmTitle, confirmMessage, type: _type, ...props }: Props) {
  const ref = React.useRef<HTMLButtonElement>(null);
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button {...props} ref={ref} type="button" onClick={() => setOpen(true)} />
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={confirmTitle}
        description={confirmMessage}
        onConfirm={() => ref.current?.form?.requestSubmit()}
      />
    </>
  );
}
