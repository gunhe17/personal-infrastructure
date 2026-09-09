// [원자] AreaChart — 시계열 면 그래프. 여러 시리즈, 가로 격자 4줄, 좌측 y 라벨, 아래 x 라벨. 톤 색 + 15% 면. 폭은 부모에 맞춘다(svg 는 늘리고 글자는 HTML).
import { cn } from "@/lib/cn";

const COLOR = { accent: "var(--accent)", good: "var(--good)", warn: "var(--warn)", bad: "var(--bad)", info: "var(--info)", mute: "var(--mute)" } as const;
export type Series = { name: string; points: number[]; tone?: keyof typeof COLOR; color?: string; fill?: boolean };
const colorOf = (s: Series) => s.color ?? COLOR[s.tone ?? "accent"];
/** `annotate` — 축 눈금 대신 첫 시리즈의 최고·최저를 점 옆에 쓰고(점선은 최고 높이), 지금 점에 후광. 값 표기는 `formatMark`(없으면 `format`). 카드 안 작은 시계열에서 "전체 중 지금" 을 읽게 한다(사용자 제안 2026-09-09). */
export function AreaChart({ series, max, height = 160, format = (v) => String(v), formatMark, xLabels, legend = true, annotate = false, nowLabel, nowClass, nowColor, nowWidth, axisWidth = 36, className }: { series: Series[]; max?: number; height?: number; format?: (v: number) => string; formatMark?: (v: number) => string; xLabels?: string[]; legend?: boolean; annotate?: boolean; nowLabel?: React.ReactNode; nowClass?: string; nowColor?: string; nowWidth?: number; axisWidth?: number; className?: string }) {
  const W = 1000, top = Math.max(max ?? 0, ...series.flatMap((s) => s.points)) || 1;
  const n = Math.max(...series.map((s) => s.points.length));
  const y = (v: number) => height - (v / top) * height;
  const path = (pts: number[]) => pts.map((v, i) => `${i ? "L" : "M"}${((i / (n - 1)) * W).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  // 낮은 그래프는 눈금을 줄인다 — 글자가 겹치면 읽을 수 없다
  const ticks = height >= 120 ? [1, 0.75, 0.5, 0.25, 0] : height >= 80 ? [1, 0.5, 0] : [1, 0];
  // 최고·최저 — 첫 시리즈에서. 라벨은 점 위/아래, 가장자리에서는 안쪽으로 붙인다.
  const P = series[0]?.points ?? [], iHi = P.reduce((b, v, i) => (v > P[b] ? i : b), 0), iLo = P.reduce((b, v, i) => (v < P[b] ? i : b), 0);
  const fm = formatMark ?? format, xp = (i: number) => (i / (n - 1)) * 100, anchor = (i: number) => (xp(i) < 15 ? "translate-x-0" : xp(i) > 85 ? "-translate-x-full" : "-translate-x-1/2");
  // 최고는 점 위, 최저는 그래프 바닥 아래(점 아래에 두면 낮은 선들과 겹친다) — 점은 svg 의 작은 원이 잇는다.
  const mark = (i: number, label: string, above: boolean) => {
    const up = above && y(P[i]) >= 18; // 꼭대기에 붙었으면 점 아래로 — 카드 밖으로 새지 않게
    return <span key={label} className={cn("absolute whitespace-nowrap font-mono text-[11px] leading-4 tabular-nums text-mute", anchor(i), up ? "-translate-y-full pb-1.5" : "pt-1.5")} style={{ left: `${xp(i)}%`, top: above ? y(P[i]) : height }}>{label} <span className="text-text">{fm(P[i])}</span></span>;
  };
  const chart = (
    <div className="relative min-w-0 flex-1" style={{ height }}>
      <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
        {!annotate && ticks.map((t) => <line key={t} x1={0} x2={W} y1={y(top * t)} y2={y(top * t)} stroke="var(--line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
        {annotate && P.length > 1 && <>
          <line x1={0} x2={W} y1={y(P[iHi])} y2={y(P[iHi])} stroke="var(--mute)" strokeOpacity=".5" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
          <circle cx={(iHi / (n - 1)) * W} cy={y(P[iHi])} r="2.5" fill="var(--mute)" vectorEffect="non-scaling-stroke" />
          <circle cx={(iLo / (n - 1)) * W} cy={y(P[iLo])} r="2.5" fill="var(--mute)" vectorEffect="non-scaling-stroke" />
        </>}
        {series.map((s) => { const c = colorOf(s); return (
          <g key={s.name}>
            {s.fill !== false && <path d={`${path(s.points)} L${W},${height} L0,${height} Z`} fill={c} opacity=".15" />}
            <path d={path(s.points)} fill="none" stroke={c} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            {annotate && s === series[0] && <circle cx={W} cy={y(s.points[s.points.length - 1])} r="9" fill={c} opacity=".25" vectorEffect="non-scaling-stroke" />}
            <circle cx={W} cy={y(s.points[s.points.length - 1])} r="3" fill={c} vectorEffect="non-scaling-stroke" />
          </g>); })}
      </svg>
      {annotate && P.length > 1 && <div className="pointer-events-none absolute inset-0">{[mark(iHi, "최고", true), mark(iLo, "최저", false)]}</div>}
    </div>
  );
  // 눈금 — 고정폭 열. 절대 배치로 두면 라벨 길이(100% vs 2000G)만큼 그래프 시작점이 어긋난다.
  const axis = !annotate && (
    <div className="pointer-events-none flex shrink-0 flex-col justify-between text-end font-mono text-[11px] leading-4 tabular-nums text-mute" style={{ height, width: axisWidth }}>
      {ticks.map((t) => <span key={t} className="-translate-y-1/2 first:translate-y-0 last:-translate-y-full">{format(Math.round(top * t))}</span>)}
    </div>
  );
  // 현재값 — 그래프 오른쪽, 마지막 점 높이에 맞춘 자리(사용자 지정 2026-09-09).
  const nowBox = <div className={cn("whitespace-nowrap tabular-nums", nowClass)} style={{ color: nowColor }}>{nowLabel}</div>;
  const now = nowLabel !== undefined && (
    <div className="relative shrink-0" style={{ height, width: nowWidth }}>
      {/* nowWidth 가 없으면 보이지 않는 사본이 폭을 잡는다. 고정폭을 주면 띠마다 그래프 끝점이 같은 x 에 선다. */}
      {nowWidth === undefined && <div aria-hidden="true" className="invisible">{nowBox}</div>}
      <div className="absolute start-0 -translate-y-1/2" style={{ top: Math.min(height - 12, Math.max(12, y(P[P.length - 1] ?? 0))) }}>{nowBox}</div>
    </div>
  );
  return (
    <div className={cn("w-full", className)}>
      <div className={cn((now || axis) && "flex items-stretch gap-3")}>{axis}{chart}{now}</div>
      {annotate && P.length > 1 && <div aria-hidden="true" className="h-6" />}
      {xLabels && <div className="mt-2 flex justify-between font-mono text-[11px] leading-4 tabular-nums text-mute">{xLabels.map((l, i) => <span key={i}>{l}</span>)}</div>}
      {legend && series.length > 1 && <div className="mt-3 flex flex-wrap gap-4">{series.map((s) => <span key={s.name} className="inline-flex items-center gap-2 text-caption text-mute"><span className="size-2 rounded-full" style={{ background: colorOf(s) }} />{s.name}</span>)}</div>}
    </div>
  );
}
