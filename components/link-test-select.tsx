"use client";

import { Hint } from "@mimird/ui/components/tooltip";
import { XIcon } from "lucide-react";
import { SearchSelect } from "@mimird/ui/components/search-select";
import { Button } from "@mimird/ui/components/button";
import { linkPlannedToDiscovered } from "@/lib/actions";

// Links a planned test to one discovered test. SearchSelect picks several,
// so the newest pick wins and the current link is shown beside it.
export function LinkTestSelect({
  id,
  projectId,
  title,
  current,
  keys,
}: {
  id: number;
  projectId: number;
  title: string;
  current: string | null;
  keys: string[];
}) {
  function link(key: string) {
    const fd = new FormData();
    fd.set("id", String(id));
    fd.set("project_id", String(projectId));
    fd.set("discovered_test_key", key);
    linkPlannedToDiscovered(fd);
  }

  return (
    <div className="grid max-w-80 gap-1">
      {current && (
        <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
          <Hint label={current}>
            <span className="truncate">
              {current}
              {!keys.includes(current) && " (not in last run)"}
            </span>
          </Hint>
          <Hint label="Unlink">
            <Button type="button" size="icon-xs" variant="ghost" aria-label={`Unlink "${title}"`} onClick={() => link("")}>
              <XIcon />
            </Button>
          </Hint>
        </span>
      )}
      <SearchSelect
        items={keys}
        value={current ? [current] : []}
        onValueChange={(picked) => link(picked.filter((k) => k !== current).at(-1) ?? "")}
        itemLabel={(k) => k}
        placeholder={current ? "Change link…" : "Link to a test…"}
        aria-label={`Link "${title}" to a discovered test`}
        className="h-8 text-sm"
      />
    </div>
  );
}
