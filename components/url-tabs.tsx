"use client";

import { useState } from "react";
import { Tabs } from "@mimird/ui/components/tabs";

// The active tab lives in ?tab=; Overview is the bare URL. replaceState is
// picked up by Next's router, so reloads and server redirects keep the tab.
// Controlled: that re-render hands us a new defaultValue, which an uncontrolled Tabs rejects.
export function UrlTabs({ defaultValue, ...props }: React.ComponentProps<typeof Tabs> & { defaultValue: string }) {
  const [tab, setTab] = useState(defaultValue);
  const [prev, setPrev] = useState(defaultValue);
  // A real navigation (other project, server redirect) still wins over local state.
  if (defaultValue !== prev) {
    setPrev(defaultValue);
    setTab(defaultValue);
  }
  return (
    <Tabs
      value={tab}
      onValueChange={(next) => {
        setTab(String(next));
        const params = new URLSearchParams(window.location.search);
        params.delete("err");
        if (next === "overview") params.delete("tab");
        else params.set("tab", String(next));
        const q = params.toString();
        window.history.replaceState(null, "", q ? `?${q}` : window.location.pathname);
      }}
      {...props}
    />
  );
}
