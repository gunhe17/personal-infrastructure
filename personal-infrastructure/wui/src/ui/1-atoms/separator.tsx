// [원자] Separator — line 1px. 가로 · 세로 · 가운데 라벨(Tailwind Plus dividers).
import { cn } from "@/lib/cn";

export function Separator({ className, vertical, children }: { className?: string; vertical?: boolean; children?: React.ReactNode }) {
  if (children) return <div role="separator" className={cn("flex w-full items-center gap-4", className)}><span className="h-px flex-1 bg-line" /><span className="text-caption text-mute">{children}</span><span className="h-px flex-1 bg-line" /></div>;
  return <div role="separator" className={cn(vertical ? "h-6 w-px" : "h-px w-full", "bg-line", className)} />;
}
