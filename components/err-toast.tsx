"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export function ErrToast({ message }: { message?: string }) {
  useEffect(() => {
    // id: the same message twice (dev StrictMode runs effects twice) is one toast
    if (message) toast.error(message, { id: message, duration: 8000 });
  }, [message]);
  return null;
}
