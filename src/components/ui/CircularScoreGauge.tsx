interface Props {
  score: number | null; // 0-100
  size?: number;
  strokeWidth?: number;
  colorClass?: string; // stroke color, e.g. "stroke-green-500"
  label?: string;
}

// A plain SVG ring, not a Recharts component — Recharts has no radial-gauge
// primitive, and a single stroke-dasharray circle is the simplest correct
// way to render a single 0-100 value as a ring.
export default function CircularScoreGauge({ score, size = 140, strokeWidth = 12, colorClass = "stroke-brand-600", label }: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = score === null ? 0 : Math.max(0, Math.min(100, score));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={score === null ? "N/A" : `${Math.round(score)} / 100`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} fill="none" className="stroke-zinc-100 dark:stroke-zinc-800" />
        {score !== null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={`transition-all duration-500 ${colorClass}`}
          />
        )}
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold">{score === null ? "—" : Math.round(score)}</span>
        {label && <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>}
      </div>
    </div>
  );
}
