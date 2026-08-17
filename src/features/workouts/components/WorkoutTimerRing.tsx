import type { TimerPhase } from "@/features/workouts/timer/types";

interface Props {
  remainingMs: number;
  totalMs: number;
  phase: TimerPhase;
  size?: number;
  strokeWidth?: number;
}

function formatMmSs(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// Copies CircularScoreGauge.tsx's SVG-ring technique (a single
// stroke-dasharray circle) rather than reusing it directly -- that
// component's center label is hardwired to a 0-100 score, not an mm:ss
// countdown.
export default function WorkoutTimerRing({ remainingMs, totalMs, phase, size = 220, strokeWidth = 14 }: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = totalMs > 0 ? Math.max(0, Math.min(1, remainingMs / totalMs)) : 0;
  const offset = circumference - fraction * circumference;
  const colorClass = phase === "work" ? "stroke-brand-600" : "stroke-emerald-500";

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={formatMmSs(remainingMs)}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} fill="none" className="stroke-zinc-100 dark:stroke-zinc-800" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`transition-all duration-200 ${colorClass}`}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-bold tabular-nums">{formatMmSs(remainingMs)}</span>
      </div>
    </div>
  );
}
