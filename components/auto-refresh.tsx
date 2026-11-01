"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-renders the page from the server every few seconds while mounted (e.g. during a run). */
export function AutoRefresh({ ms = 3000 }: { ms?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), ms);
    return () => clearInterval(t);
  }, [router, ms]);
  return null;
}
