import { ExternalLink } from "lucide-react";

export default function NexusToolsLink({ onClick }: { onClick?: () => void }) {
  return <a href="https://nexus-tools-chi.vercel.app/" target="_blank" rel="noopener noreferrer" onClick={onClick} className="flex items-center gap-3 rounded-xl px-4 py-3 text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800">
    <ExternalLink size={20} aria-hidden="true" /><span>Nexus Tools ↗</span>
  </a>;
}
