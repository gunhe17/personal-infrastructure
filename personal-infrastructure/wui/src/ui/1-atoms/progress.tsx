// [원자] Progress
import { Progress as BaseProgress } from "@base-ui/react/progress";
import { cn } from "@/lib/cn";

/** [원자] Progress — 8px 트랙, 톤 채움(slow). 라벨·값은 위 한 줄. */
export function Progress({ value, label, tone = "accent", className }: { value: number; label?: React.ReactNode; tone?: "accent" | "good" | "warn" | "bad"; className?: string }) {
  return (
    <BaseProgress.Root value={value} className={cn("block", className)}>
      <div className="mb-2 flex items-center justify-between text-body"><BaseProgress.Label className="text-mute">{label}</BaseProgress.Label><BaseProgress.Value className="font-mono tabular-nums text-text" /></div>
      <BaseProgress.Track className="h-2 overflow-hidden rounded-full bg-card-3">
        <BaseProgress.Indicator className={cn("h-full rounded-full grow", { accent: "bg-accent", good: "bg-good", warn: "bg-warn", bad: "bg-bad" }[tone])} />
      </BaseProgress.Track>
    </BaseProgress.Root>
  );
}
