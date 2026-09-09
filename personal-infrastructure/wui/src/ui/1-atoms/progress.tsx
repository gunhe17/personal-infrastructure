// [원자] Progress
import { Progress as BaseProgress } from "@base-ui/react/progress";
import { cn } from "@/lib/cn";

/** [원자] Progress — 8px 트랙, 톤 채움(slow). 라벨·값은 위 한 줄. */
/** `color` 를 주면 톤 대신 그 색(차트 팔레트)으로 채운다 — 시계열 선과 막대를 같은 색으로 묶을 때. */
export function Progress({ value, label, tone = "accent", color, className }: { value: number; label?: React.ReactNode; tone?: "accent" | "good" | "warn" | "bad"; color?: string; className?: string }) {
  return (
    <BaseProgress.Root value={value} className={cn("block", className)}>
      <div className="mb-2 flex items-center justify-between text-body"><BaseProgress.Label className="text-mute">{label}</BaseProgress.Label><BaseProgress.Value className="font-mono tabular-nums text-text" /></div>
      <BaseProgress.Track className="h-2 overflow-hidden rounded-full bg-card-3">
        <BaseProgress.Indicator className={cn("h-full rounded-full grow", !color && { accent: "bg-accent", good: "bg-good", warn: "bg-warn", bad: "bg-bad" }[tone])} style={color ? { background: color } : undefined} />
      </BaseProgress.Track>
    </BaseProgress.Root>
  );
}
