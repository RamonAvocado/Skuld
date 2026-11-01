"use client";

import { PlusIcon, SettingsIcon } from "lucide-react";
import { Hint } from "@mimird/ui/components/tooltip";
import { Button } from "@mimird/ui/components/button";
import { Input } from "@mimird/ui/components/input";
import { Label } from "@mimird/ui/components/label";
import { createPerfEntry, deletePerfEntry, updatePerfEntry } from "@/lib/actions";
import type { PerfKind } from "@/lib/db";
import { FormDialog } from "@/components/form-dialog";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";

/** Adds an endpoint/page, or edits `entry` when given. */
export function PerfEntryDialog({
  projectId,
  kind,
  entry,
}: {
  projectId: number;
  kind: PerfKind;
  entry?: { id: number; path: string; area: string; login: number };
}) {
  const isPage = kind === "page";
  const Noun = isPage ? "Page" : "Endpoint";
  const idp = `perf-${entry?.id ?? "new"}`;
  return (
    <FormDialog
      title={entry ? `Edit ${Noun.toLowerCase()}` : `New ${Noun.toLowerCase()}`}
      description={
        isPage
          ? "A path on the site URL. Use {name} for parts filled from the Run settings variables."
          : "A GET path on the API base URL. Use {name} for parts filled from the Run settings variables."
      }
      trigger={(open) =>
        entry ? (
          <Hint label={`Edit ${Noun}`}>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={`Edit ${entry.path}`}
              // Inside a <summary>: open the dialog without toggling the row.
              onClick={(e) => {
                e.preventDefault();
                open();
              }}
            >
              <SettingsIcon aria-hidden />
            </Button>
          </Hint>
        ) : (
          <Button size="sm" variant="outline" onClick={open}>
            <PlusIcon aria-hidden />
            Add {Noun}
          </Button>
        )
      }
    >
      <form id={`${idp}-form`} action={entry ? updatePerfEntry : createPerfEntry} className="flex flex-col gap-3">
        <input type="hidden" name="project_id" value={projectId} />
        <input type="hidden" name="kind" value={kind} />
        {entry && <input type="hidden" name="id" value={entry.id} />}
        <div className="grid gap-1.5">
          <Label htmlFor={`${idp}-path`}>Path</Label>
          {/* key: a save re-renders with the stored value; remount instead of changing an uncontrolled default */}
          <Input
            key={entry?.path}
            id={`${idp}-path`}
            name="path"
            defaultValue={entry?.path}
            placeholder={isPage ? "/watchlist/{symbol}…" : "/api/v1/u/{userId}/usage…"}
            className="font-mono text-sm"
            autoComplete="off"
            spellCheck={false}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${idp}-area`}>Area</Label>
          <Input key={entry?.area} id={`${idp}-area`} name="area" defaultValue={entry?.area} placeholder="Optional, e.g. App…" autoComplete="off" />
        </div>
        {isPage && (
          <label className="flex w-fit items-center gap-2 text-sm">
            <input key={entry?.login} type="checkbox" name="login" defaultChecked={entry ? entry.login === 1 : true} className="size-4 accent-primary" />
            Needs login
          </label>
        )}
        {!entry && (
          <Button type="submit" className="w-fit">
            Add {Noun}
          </Button>
        )}
      </form>
      {/* Save submits the form above through form=; Delete needs its own form (forms can't nest). */}
      {entry && (
        <div className="flex items-center justify-between gap-2">
          <Button type="submit" form={`${idp}-form`}>
            Save {Noun}
          </Button>
          <form action={deletePerfEntry}>
            <input type="hidden" name="id" value={entry.id} />
            <input type="hidden" name="project_id" value={projectId} />
            <ConfirmSubmitButton
              variant="ghost"
              className="text-destructive"
              confirmTitle={`Delete ${entry.path}?`}
              confirmMessage="Past results stay in run history."
            >
              Delete {Noun}
            </ConfirmSubmitButton>
          </form>
        </div>
      )}
    </FormDialog>
  );
}
