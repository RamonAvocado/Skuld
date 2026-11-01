"use client";

import { useState } from "react";
import { PencilIcon } from "lucide-react";
import { Hint } from "@mimird/ui/components/tooltip";
import { Button } from "@mimird/ui/components/button";
import { Input } from "@mimird/ui/components/input";
import { Label } from "@mimird/ui/components/label";
import { ComboSelect } from "@mimird/ui/components/combo-select";
import { updatePlannedTest } from "@/lib/actions";
import { LAYERS } from "@/lib/presets";
import { FormSelect } from "@/components/form-select";
import { FormDialog } from "@/components/form-dialog";

const NONE = "";

export function EditPlannedTestDialog({
  id,
  projectId,
  title,
  areaId,
  layer,
  linked,
  keys,
  areas,
}: {
  id: number;
  projectId: number;
  title: string;
  areaId: number;
  layer: string;
  linked: string | null;
  /** Discovered test keys from the latest run. */
  keys: string[];
  areas: { id: number; name: string }[];
}) {
  const [key, setKey] = useState(linked ?? NONE);
  // A link to a test missing from the last run must still be pickable (and kept).
  const items = [NONE, ...(linked && !keys.includes(linked) ? [linked] : []), ...keys];
  return (
    <FormDialog
      title="Edit test"
      trigger={(open) => (
        <Hint label="Edit test">
          <Button type="button" size="icon-sm" variant="ghost" aria-label={`Edit "${title}"`} onClick={open}>
            <PencilIcon />
          </Button>
        </Hint>
      )}
    >
      <form action={updatePlannedTest} className="grid gap-3">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="project_id" value={projectId} />
        <input type="hidden" name="discovered_test_key" value={key} />
        <div className="grid gap-1.5">
          <Label htmlFor={`title-${id}`}>Name</Label>
          <Input id={`title-${id}`} name="title" defaultValue={title} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label>Group</Label>
            <FormSelect
              name="area_id"
              aria-label="Group"
              defaultValue={String(areaId)}
              options={areas.map((a) => ({ value: String(a.id), label: a.name }))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Layer</Label>
            <FormSelect name="layer" aria-label="Layer" defaultValue={layer} options={LAYERS.map((l) => ({ value: l, label: l }))} />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label>Linked test</Label>
          <ComboSelect
            items={items}
            value={key}
            onValueChange={setKey}
            itemLabel={(k) => (k === NONE ? "Not linked" : !keys.includes(k) ? `${k} (not in last run)` : k)}
            aria-label="Linked discovered test"
            className="h-8 text-sm"
          />
          <p className="text-xs text-muted-foreground">Linking marks the test done; unlinking sets it back to TODO.</p>
        </div>
        <Button type="submit" className="w-fit">
          Save
        </Button>
      </form>
    </FormDialog>
  );
}
