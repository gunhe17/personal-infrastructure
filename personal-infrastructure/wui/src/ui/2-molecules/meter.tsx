// [분자] Meter = 칸으로 나뉜 사용량 막대 + StatusDot 범례. 디스크·메모리처럼 여러 몫이 한 총량을 나눌 때.
import { Meter as Base } from "@base-ui/react/meter";
import { cn } from "@/lib/cn";
import { type Tone } from "@/ui/0-tokens/tone";
import { Dot } from "@/ui/1-atoms/dot";

const FILL: Record<Tone, string> = { running: "bg-good", progress: "bg-warn", failed: "bg-bad", idle: "bg-mute", info: "bg-info" };
export function Meter({ label, total, unit = "", parts, format, className }: { label?: React.ReactNode; total: number; unit?: string; parts: { label: string; value: number; tone?: Tone; color?: string }[]; format?: (v: number) => string; className?: string }) {
  const used = parts.reduce((a, p) => a + p.value, 0);
  return (
    <Base.Root value={used} max={total} className={cn("block", className)}>
      <div className="mb-2 flex items-center justify-between text-body"><Base.Label className="text-mute">{label}</Base.Label><span className="font-mono tabular-nums text-text">{format ? `${format(used)} / ${format(total)}` : `${Math.round(used * 10) / 10}${unit} / ${total}${unit}`}</span></div>
      <Base.Track className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-card-3">
        {parts.map((p) => <Base.Indicator key={p.label} className={cn("h-full", !p.color && FILL[p.tone ?? "idle"])} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />)}
      </Base.Track>
      <div className="mt-3 flex flex-wrap gap-4">{parts.map((p) => <span key={p.label} className="inline-flex items-center gap-2 text-body text-mute">{p.color ? <span className="size-2 rounded-full" style={{ background: p.color }} /> : <Dot tone={p.tone ?? "idle"} />}{p.label} <span className="font-mono tabular-nums text-text">{format ? format(p.value) : `${p.value}${unit}`}</span></span>)}</div>
    </Base.Root>
  );
}
