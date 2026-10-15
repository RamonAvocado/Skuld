"use client";

import { useSyncExternalStore } from "react";

const subscribe = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};

/** The URL fragment without its `#`; `""` during SSR and when there is none. */
export function useHash(): string {
  return useSyncExternalStore(
    subscribe,
    () => window.location.hash.slice(1),
    () => "",
  );
}

/**
 * Replaces the URL fragment in place: no history entry, no scroll, and no
 * trailing `#` when cleared. `replaceState` fires no `hashchange`, so one is
 * dispatched by hand for `useHash`.
 */
export function setHash(hash: string) {
  const { pathname, search } = window.location;
  window.history.replaceState(null, "", pathname + search + (hash ? `#${hash}` : ""));
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}
