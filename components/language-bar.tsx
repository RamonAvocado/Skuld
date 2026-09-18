export type LanguageShare = { language: string; n: number };

const COLORS: Record<string, string> = {
  python: "#3572A5",
  typescript: "#3178C6",
  javascript: "#F1E05A",
};
const FALLBACK_COLOR = "var(--muted-foreground)";
const LABELS: Record<string, string> = {
  python: "Python",
  typescript: "TypeScript",
  javascript: "JavaScript",
  other: "Other",
};

function colorFor(language: string) {
  return COLORS[language] ?? FALLBACK_COLOR;
}
function labelFor(language: string) {
  return LABELS[language] ?? language;
}

export function LanguageBar({ data, compact }: { data: LanguageShare[]; compact?: boolean }) {
  const total = data.reduce((n, d) => n + d.n, 0);
  if (total === 0) {
    return compact ? null : <p className="text-sm text-muted-foreground">No tests discovered yet.</p>;
  }
  const shares = data.map((d) => ({ ...d, pct: d.n / total }));
  const summary = shares.map((s) => `${Math.round(s.pct * 100)}% ${labelFor(s.language)}`).join(", ");

  return (
    <div className={compact ? "grid gap-1" : "grid gap-2"}>
      <div
        role="img"
        aria-label={`Test language composition: ${summary}`}
        className="flex h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        {shares.map((s) => (
          <div
            key={s.language}
            style={{ width: `${s.pct * 100}%`, backgroundColor: colorFor(s.language) }}
            title={`${labelFor(s.language)} ${Math.round(s.pct * 100)}%`}
          />
        ))}
      </div>
      {!compact && (
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {shares.map((s) => (
            <li key={s.language} className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: colorFor(s.language) }} />
              {labelFor(s.language)} · {Math.round(s.pct * 100)}%
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
