interface Props {
  percentage: number;
  colorClass?: string;
}

export default function ProgressBar({ percentage, colorClass = "bg-violet-600" }: Props) {
  const clamped = Math.max(0, Math.min(100, percentage));

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
      <div
        className={`h-full rounded-full transition-all ${colorClass}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
