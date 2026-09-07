// [분자] Chip = 텍스트 + IconButton(close)
import { cn } from "@/lib/cn";
import { IconButton } from "@/ui/2-molecules/icon-button";

/** [분자] Chip = 텍스트 + IconButton(close). 적용된 필터. active 는 accent. */
export function Chip({ children, onRemove, active, className }: { children: React.ReactNode; onRemove?: () => void; active?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex h-9 items-center gap-1 rounded-button ps-4 text-body tint", onRemove ? "pe-1" : "pe-4", active ? "bg-accent text-white" : "bg-card-2 text-text", className)}>
      {children}
      {onRemove && <IconButton size="sm" label="지우기" icon="close" onClick={onRemove} className="text-current/70 hover:bg-transparent hover:text-current" />}
    </span>
  );
}
