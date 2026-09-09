// [분자] Meter = 칸으로 나뉜 사용량 막대 + StatusDot 범례. 디스크·메모리처럼 여러 몫이 한 총량을 나눌 때.
import { Meter as Base } from "@base-ui/react/meter";
import { cn } from "@/lib/cn";
import { type Tone } from "@/ui/0-tokens/tone";
import { StatusDot } from "@/ui/2-molecules/status-dot";

const FILL: Record<Tone, string> = { running: "bg-good", progress: "bg-warn", failed: "bg-bad", idle: "bg-mute", info: "bg-info" };
export function Meter({ label, total, unit = "", parts, className }: { label?: React.ReactNode; total: number; unit?: string; parts: { label: string; value: number; tone: Tone }[]; className?: string }) {
  const used = parts.reduce((a, p) => a + p.value, 0);
  return (
    <Base.Root value={used} max={total} className={cn("block", className)}>
      <div className="mb-2 flex items-center justify-between text-body"><Base.Label className="text-mute">{label}</Base.Label><span className="font-mono tabular-nums text-text">{Math.round(used * 10) / 10}{unit} / {total}{unit}</span></div>
      <Base.Track className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-card-3">
        {parts.map((p) => <Base.Indicator key={p.label} className={cn("h-full grow", FILL[p.tone])} style={{ width: `${(p.value / total) * 100}%` }} />)}
      </Base.Track>
      <div className="mt-3 flex flex-wrap gap-4">{parts.map((p) => <StatusDot key={p.label} tone={p.tone} muted>{p.label} <span className="font-mono tabular-nums text-text">{p.value}{unit}</span></StatusDot>)}</div>
    </Base.Root>
  );
}
