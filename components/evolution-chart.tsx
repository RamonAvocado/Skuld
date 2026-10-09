"use client";

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

export function EvolutionChart({ data }: { data: Point[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No runs yet.</p>;
  }
  const rows = data.map((d) => ({
    label: new Date(d.finished_at).toLocaleDateString(),
    coverage: Math.round(d.line_rate * 1000) / 10,
    tests: d.total,
    passed: d.passed,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="label" tick={tick} stroke="var(--border)" />
          <YAxis yAxisId="cov" domain={[0, 100]} tick={tick} stroke="var(--border)" unit="%" width={44} />
          <YAxis yAxisId="cnt" orientation="right" tick={tick} stroke="var(--border)" width={32} allowDecimals={false} />
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
