// [원자] Sparkline
import { cn } from "@/lib/cn";

/** [원자] Sparkline — 160×40(fluid 면 폭 100%), 톤 색 + 15% 면 + 끝점. */
export function Sparkline({ points, tone = "accent", height = 40, fluid, className }: { points: number[]; tone?: "accent" | "good" | "warn" | "bad"; height?: number; fluid?: boolean; className?: string }) {
  const w = 160, max = Math.max(...points), min = Math.min(...points), span = max - min || 1;
  const xy = points.map((p, i) => [(i / (points.length - 1)) * w, height - ((p - min) / span) * (height - 6) - 3] as const);
  const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const color = { accent: "var(--accent)", good: "var(--good)", warn: "var(--warn)", bad: "var(--bad)" }[tone];
  return (
    <svg viewBox={`0 0 ${w} ${height}`} width={fluid ? "100%" : w} height={height} preserveAspectRatio={fluid ? "none" : "xMidYMid meet"} className={cn("shrink-0", className)} aria-hidden="true">
      <path d={`${d} L${w},${height} L0,${height} Z`} fill={color} opacity=".15" /><path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={xy[xy.length - 1][0]} cy={xy[xy.length - 1][1]} r="3" fill={color} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
