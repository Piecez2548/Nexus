interface Props {
  title: string;
}

export default function ComingSoon({ title }: Props) {
  return (
    <div className="space-y-2">
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="text-zinc-600 dark:text-zinc-500">
        Coming Soon...
      </p>
    </div>
  );
}
