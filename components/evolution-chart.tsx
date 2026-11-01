"use client";

import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { MenuSelect } from "@mimird/ui/components/menu-select";
import { buttonVariants } from "@mimird/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@mimird/ui/components/dropdown-menu";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type Point = {
  id: number;
  finished_at: string;
  total: number;
  passed: number;
  line_rate: number;
};

const tick = { fontSize: 12, fill: "var(--muted-foreground)" };

// Runs sit at x = 0, 1, 2… on a numeric axis. A single run is drawn at x = 0 and 1
// so it shows as a flat line, not a lone dot; its date sits in the middle.
function xAxisFor(labels: string[]) {
  const label = (x: number) => labels[Math.min(Math.floor(x), labels.length - 1)] ?? "";
  return {
    xs: labels.length === 1 ? [0, 1] : labels.map((_, i) => i),
    axis: (
      <XAxis
        dataKey="x"
        type="number"
        domain={["dataMin", "dataMax"]}
        ticks={labels.length === 1 ? [0.5] : labels.map((_, i) => i)}
        tickFormatter={label}
        tick={tick}
        stroke="var(--border)"
      />
    ),
    label,
  };
}

export function EvolutionChart({ data }: { data: Point[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No runs yet.</p>;
  }
  const x = xAxisFor(data.map((d) => new Date(d.finished_at).toLocaleDateString()));
  const rows = x.xs.map((i) => {
    const d = data[Math.min(i, data.length - 1)]!;
    return { x: i, coverage: Math.round(d.line_rate * 1000) / 10, tests: d.total, passed: d.passed };
  });

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          {x.axis}
          <YAxis yAxisId="cov" domain={[0, 100]} tick={tick} stroke="var(--border)" unit="%" width={44} />
          <YAxis yAxisId="cnt" orientation="right" tick={tick} stroke="var(--border)" width={32} allowDecimals={false} />
          <Tooltip
            labelFormatter={x.label}
            contentStyle={{
              background: "var(--popover)",
              color: "var(--popover-foreground)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              fontSize: 12,
            }}
          />
          <Line
            yAxisId="cov"
            type="monotone"
            dataKey="coverage"
            name="Line coverage %"
            stroke="var(--foreground)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            yAxisId="cnt"
            type="monotone"
            dataKey="tests"
            name="Total tests"
            stroke="var(--muted-foreground)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            yAxisId="cnt"
            type="monotone"
            dataKey="passed"
            name="Passing"
            stroke="var(--muted-foreground)"
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export type GroupLine = { id: number; name: string; color: string };
export type GroupPoint = {
  run_id: number;
  finished_at: string;
  area_id: number | null;
  total: number;
  passed: number;
  duration_ms: number;
};

const METRICS = {
  passed: { label: "Passing tests", unit: "", value: (d: GroupPoint) => d.passed },
  rate: { label: "% passed", unit: "%", value: (d: GroupPoint) => Math.round((d.passed / d.total) * 1000) / 10 },
  failed: { label: "Failing tests", unit: "", value: (d: GroupPoint) => d.total - d.passed },
  total: { label: "Tests", unit: "", value: (d: GroupPoint) => d.total },
  duration: { label: "Duration (s)", unit: " s", value: (d: GroupPoint) => Math.round(d.duration_ms / 100) / 10 },
} as const;
type Metric = keyof typeof METRICS;

/** One line per group across runs; dropdowns pick the metric and which groups show. */
export function GroupEvolutionChart({ data, groups }: { data: GroupPoint[]; groups: GroupLine[] }) {
  const [metric, setMetric] = useState<Metric>("rate");
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No runs yet.</p>;
  }
  const m = METRICS[metric];
  // One row per run, every group 0 until it has linked tests in that run.
  const byRun = new Map<number, { label: string; values: Record<number, number> }>();
  for (const d of data) {
    let run = byRun.get(d.run_id);
    if (!run) {
      run = { label: new Date(d.finished_at).toLocaleDateString(), values: Object.fromEntries(groups.map((g) => [g.id, 0])) };
      byRun.set(d.run_id, run);
    }
    if (d.area_id !== null) run.values[d.area_id] = m.value(d);
  }
  const runs = [...byRun.values()];
  const x = xAxisFor(runs.map((r) => r.label));
  const rows = x.xs.map((i) => ({ x: i, ...runs[Math.min(i, runs.length - 1)]!.values }));
  const shown = groups.filter((g) => !hidden.has(g.id));

  function toggle(id: number) {
    setHidden((h) => {
      const next = new Set(h);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <MenuSelect
          aria-label="Metric"
          value={metric}
          options={Object.entries(METRICS).map(([value, { label }]) => ({ value, label }))}
          onValueChange={(v) => setMetric(v as Metric)}
          className="h-8 justify-between text-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
            Groups {shown.length}/{groups.length}
            <ChevronDownIcon aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-80 min-w-48">
            <DropdownMenuItem
              closeOnClick={false}
              onClick={() => setHidden(shown.length === groups.length ? new Set(groups.map((g) => g.id)) : new Set())}
            >
              {shown.length === groups.length ? "Hide all" : "Show all"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {groups.map((g) => (
              <DropdownMenuCheckboxItem key={g.id} checked={!hidden.has(g.id)} onCheckedChange={() => toggle(g.id)}>
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: g.color }} />
                {g.name}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            {x.axis}
            <YAxis
              tick={tick}
              stroke="var(--border)"
              width={48}
              unit={m.unit}
              domain={metric === "rate" ? [0, 100] : undefined}
              allowDecimals={metric === "duration"}
            />
            <Tooltip
              formatter={(v) => `${v}${m.unit}`}
              labelFormatter={x.label}
              contentStyle={{
                background: "var(--popover)",
                color: "var(--popover-foreground)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                fontSize: 12,
              }}
            />
            {shown.map((g) => (
              <Line
                key={g.id}
                type="monotone"
                dataKey={String(g.id)}
                name={g.name}
                stroke={g.color}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
