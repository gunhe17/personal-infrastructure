// [원자] AreaChart — 시계열 면 그래프. 여러 시리즈, 가로 격자 4줄, 좌측 y 라벨, 아래 x 라벨. 톤 색 + 15% 면. 폭은 부모에 맞춘다(svg 는 늘리고 글자는 HTML).
import { cn } from "@/lib/cn";

const COLOR = { accent: "var(--accent)", good: "var(--good)", warn: "var(--warn)", bad: "var(--bad)", info: "var(--info)", mute: "var(--mute)" } as const;
export type Series = { name: string; points: number[]; tone?: keyof typeof COLOR };
export function AreaChart({ series, max, height = 160, format = (v) => String(v), xLabels, className }: { series: Series[]; max?: number; height?: number; format?: (v: number) => string; xLabels?: string[]; className?: string }) {
  const W = 1000, top = Math.max(max ?? 0, ...series.flatMap((s) => s.points)) || 1;
  const n = Math.max(...series.map((s) => s.points.length));
  const y = (v: number) => height - (v / top) * height;
  const path = (pts: number[]) => pts.map((v, i) => `${i ? "L" : "M"}${((i / (n - 1)) * W).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  // 낮은 그래프는 눈금을 줄인다 — 글자가 겹치면 읽을 수 없다
  const ticks = height >= 120 ? [1, 0.75, 0.5, 0.25, 0] : height >= 80 ? [1, 0.5, 0] : [1, 0];
  return (
    <div className={cn("w-full", className)}>
      <div className="relative" style={{ height }}>
        <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
          {ticks.map((t) => <line key={t} x1={0} x2={W} y1={y(top * t)} y2={y(top * t)} stroke="var(--line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
          {series.map((s) => { const c = COLOR[s.tone ?? "accent"]; return (
            <g key={s.name}>
              <path d={`${path(s.points)} L${W},${height} L0,${height} Z`} fill={c} opacity=".15" />
              <path d={path(s.points)} fill="none" stroke={c} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              <circle cx={W} cy={y(s.points[s.points.length - 1])} r="3" fill={c} vectorEffect="non-scaling-stroke" />
            </g>); })}
        </svg>
        <div className="pointer-events-none absolute inset-y-0 -start-1 flex -translate-x-full flex-col justify-between font-mono text-[11px] tabular-nums text-mute">
          {ticks.map((t) => <span key={t} className="-translate-y-1/2 first:translate-y-0 last:-translate-y-full">{format(Math.round(top * t))}</span>)}
        </div>
      </div>
      {xLabels && <div className="mt-2 flex justify-between font-mono text-[11px] tabular-nums text-mute">{xLabels.map((l, i) => <span key={i}>{l}</span>)}</div>}
      {series.length > 1 && <div className="mt-3 flex flex-wrap gap-4">{series.map((s) => <span key={s.name} className="inline-flex items-center gap-2 text-caption text-mute"><span className="size-2 rounded-full" style={{ background: COLOR[s.tone ?? "accent"] }} />{s.name}</span>)}</div>}
    </div>
  );
}
