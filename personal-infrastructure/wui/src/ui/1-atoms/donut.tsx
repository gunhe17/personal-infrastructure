// [원자] Donut
import { cn } from "@/lib/cn";

/** [원자] Donut — 행 끝의 완료율. 36, 획 5. */
export function Donut({ value, size = 36, className }: { value: number; size?: number; className?: string }) {
  const r = (size - 6) / 2, c = 2 * Math.PI * r;
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={cn("shrink-0", className)} aria-hidden="true"><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--card-3)" strokeWidth="5" /><circle className="grow" cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent)" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(c * Math.min(100, Math.max(0, value))) / 100} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} /></svg>;
}
