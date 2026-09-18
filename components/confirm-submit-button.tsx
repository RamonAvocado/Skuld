"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

type Props = React.ComponentProps<typeof Button> & {
  confirmMessage: string;
};

export function ConfirmSubmitButton({ confirmMessage, onClick, ...props }: Props) {
  return (
    <Button
      {...props}
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
    />
  );
}
