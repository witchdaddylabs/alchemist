import { Database, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface VaultCardProps {
  name: string;
  metadata: string;
  onClick?: () => void;
  className?: string;
}

export function VaultCard({ name, metadata, onClick, className }: VaultCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg",
        "bg-white/[0.03] border border-white/[0.06]",
        "hover:bg-white/[0.06] hover:border-violet-500/20 hover:shadow-[0_0_12px_rgba(139,92,246,0.04)]",
        "transition-all duration-200 text-left group",
        className
      )}
    >
      {/* Icon */}
      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-violet-500/10 shrink-0">
        <Database className="w-4 h-4 text-violet-400" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-200 truncate">{name}</p>
        <p className="text-xs text-zinc-500 truncate">{metadata}</p>
      </div>

      {/* Kebab menu */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          // TODO: dropdown menu
        }}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/[0.08]"
      >
        <MoreHorizontal className="w-4 h-4 text-zinc-500" />
      </button>
    </button>
  );
}
