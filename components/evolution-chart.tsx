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

export function EvolutionChart({ data }: { data: Point[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No runs yet — hit “Run tests”.</p>;
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
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="cov" domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" width={44} />
          <YAxis yAxisId="cnt" orientation="right" tick={{ fontSize: 12 }} width={32} allowDecimals={false} />
          <Tooltip />
          <Line
            yAxisId="cov"
            type="monotone"
            dataKey="coverage"
            name="Line coverage %"
            stroke="var(--chart-1)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            yAxisId="cnt"
            type="monotone"
            dataKey="tests"
            name="Total tests"
            stroke="var(--chart-3)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            yAxisId="cnt"
            type="monotone"
            dataKey="passed"
            name="Passing"
            stroke="var(--chart-2)"
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
