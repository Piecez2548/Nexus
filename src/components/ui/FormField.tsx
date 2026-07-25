import type { ReactNode } from "react";

interface Props {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}

export default function FormField({ label, htmlFor, error, children }: Props) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm text-zinc-500 dark:text-zinc-400">
        {label}
      </label>

      {children}

      {error && (
        <p className="mt-1 text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
