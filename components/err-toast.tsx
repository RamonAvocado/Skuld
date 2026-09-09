"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export function ErrToast({ message }: { message?: string }) {
  useEffect(() => {
    if (message) toast.error(message, { duration: 8000 });
  }, [message]);
  return null;
}
