// [원자] Badge
import { cn } from "@/lib/cn";
import { TONE, type Tone } from "@/ui/0-tokens/tone";

/** [원자] Badge — 솔리드 8px. md 36 · sm 32(caption). 아이콘은 앞에 sm. */
export function Badge({ tone, size = "md", children, className }: { tone: Tone; size?: "sm" | "md"; children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-2 whitespace-nowrap rounded-[8px] font-medium tint", size === "sm" ? "h-8 px-3 text-caption" : "h-9 px-4 text-body", TONE[tone].badge, className)}>{children}</span>;
}
