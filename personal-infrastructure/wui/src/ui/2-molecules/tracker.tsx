// [분자] Tracker = 기간별 상태 막대 + Tooltip. 가동률·배포 이력 같은 시간 축.
import { cn } from "@/lib/cn";
import { type Tone } from "@/ui/0-tokens/tone";
import { Tooltip } from "@/ui/1-atoms/tooltip";

const FILL: Record<Tone, string> = { running: "bg-good", progress: "bg-warn", failed: "bg-bad", idle: "bg-card-3", info: "bg-info" };
export function Tracker({ items, className }: { items: { tone: Tone; label: string }[]; className?: string }) {
  return (
    <div className={cn("flex h-8 gap-0.5", className)} role="img" aria-label={items.map((i) => i.label).join(", ")}>
      {items.map((it, i) => <Tooltip key={i} content={it.label}><span className={cn("h-full flex-1 rounded-[3px] tint", FILL[it.tone])} /></Tooltip>)}
    </div>
  );
}
