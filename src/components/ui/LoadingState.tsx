interface Props {
  label?: string;
}

export default function LoadingState({ label = "Loading..." }: Props) {
  return (
    <div className="flex items-center justify-center gap-3 p-6 text-zinc-600 dark:text-zinc-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 dark:border-zinc-600 border-t-brand-500" />
      {label}
    </div>
  );
}
