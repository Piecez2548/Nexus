interface LegendItem {
  label: string;
  color: string;
}

interface Props {
  items: LegendItem[];
}

export default function ChartLegend({ items }: Props) {
  return (
    <div className="flex items-center gap-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400"
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </div>
      ))}
    </div>
  );
}
