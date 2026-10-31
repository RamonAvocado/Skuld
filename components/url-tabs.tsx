"use client";

import { Tabs } from "@mimird/ui/components/tabs";

// The active tab lives in ?tab=; Overview is the bare URL. replaceState is
// picked up by Next's router, so reloads and server redirects keep the tab.
export function UrlTabs({ defaultValue, ...props }: React.ComponentProps<typeof Tabs> & { defaultValue: string }) {
  return (
    <Tabs
      defaultValue={defaultValue}
      onValueChange={(tab) => {
        const params = new URLSearchParams(window.location.search);
        params.delete("err");
        if (tab === "overview") params.delete("tab");
        else params.set("tab", String(tab));
        const q = params.toString();
        window.history.replaceState(null, "", q ? `?${q}` : window.location.pathname);
      }}
      {...props}
    />
  );
}
