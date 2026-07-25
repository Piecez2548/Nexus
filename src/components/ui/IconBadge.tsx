import type { ReactNode } from "react";

interface Props {
  icon: ReactNode;
  color: string;
  size?: number;
}

export default function IconBadge({ icon, color, size = 36 }: Props) {
  return (
    <div
      className="flex items-center justify-center rounded-lg"
      style={{ backgroundColor: color, width: size, height: size }}
    >
      {icon}
    </div>
  );
}
