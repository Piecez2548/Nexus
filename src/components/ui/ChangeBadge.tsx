import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface Props {
  value: number | null;
  // When true, a positive change is treated as unfavorable (e.g. rising
  // expenses) and colored red instead of green.
  invert?: boolean;
}

export default function ChangeBadge({ value, invert = false }: Props) {
  if (value === null) return null;

  const isIncrease = value >= 0;
  const isGood = invert ? !isIncrease : isIncrease;
  const Icon = isIncrease ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
        isGood ? "bg-green-500/15 text-green-500" : "bg-red-500/15 text-red-500"
      }`}
    >
      <Icon size={12} />
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}
