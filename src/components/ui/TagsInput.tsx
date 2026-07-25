import { useEffect, useState } from "react";

interface Props {
  id?: string;
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export default function TagsInput({ id, value, onChange, placeholder }: Props) {
  const [text, setText] = useState(value.join(", "));

  useEffect(() => {
    setText(value.join(", "));
  }, [value]);

  function commit(raw: string) {
    const tags = raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    onChange(tags);
  }

  return (
    <input
      id={id}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => commit(text)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-violet-500"
    />
  );
}
