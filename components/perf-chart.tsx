"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PerfPoint } from "@/lib/db";

const tick = { fontSize: 12, fill: "var(--muted-foreground)" };

/** One page or endpoint across runs: its time (and LCP for pages) against its size. */
export function PerfChart({ data, isPage }: { data: PerfPoint[]; isPage: boolean }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">Not measured yet.</p>;
  }
  const rows = data.map((d) => ({
    label: new Date(d.finished_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" }),
    ms: Math.round(d.ms),
    lcp: Math.round(d.lcp),
    kb: Math.round((d.bytes / 1024) * 10) / 10,
  }));

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="label" tick={tick} stroke="var(--border)" />
          <YAxis yAxisId="ms" tick={tick} stroke="var(--border)" unit=" ms" width={64} />
          <YAxis yAxisId="kb" orientation="right" tick={tick} stroke="var(--border)" unit=" KB" width={72} />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              color: "var(--popover-foreground)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              fontSize: 12,
            }}
          />
          <Line
            yAxisId="ms"
            type="monotone"
            dataKey="ms"
            name={isPage ? "Load (ms)" : "Time (ms)"}
            stroke="var(--foreground)"
            strokeWidth={2}
            dot={rows.length === 1}
          />
          {isPage && (
            <Line yAxisId="ms" type="monotone" dataKey="lcp" name="LCP (ms)" stroke="var(--muted-foreground)" strokeWidth={2} dot={rows.length === 1} />
          )}
          <Line
            yAxisId="kb"
            type="monotone"
            dataKey="kb"
            name="Size (KB)"
            stroke="var(--muted-foreground)"
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={rows.length === 1}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
