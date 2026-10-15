import { ChevronRightIcon } from "lucide-react";

// Disclosure: native <details> with the ecosystem's rotating chevron.
export const detailsCls = "group rounded-lg p-3 ring-1 ring-foreground/10";
export const summaryCls =
  "flex cursor-pointer list-none flex-wrap items-center gap-x-2 gap-y-1 text-sm [&::-webkit-details-marker]:hidden";

export function Chevron() {
  return (
    <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
  );
}
