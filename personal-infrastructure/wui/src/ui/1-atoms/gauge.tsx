// [원자] Gauge
import { cn } from "@/lib/cn";

/** [원자] Gauge — 그라데이션 채움 + 남은 구간(card-2). 값 0–1. */
export function Gauge({ value, start, end, className }: { value: number; start: React.ReactNode; end: React.ReactNode; className?: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className={cn("grid h-16 gap-2 text-body font-medium grow", className)} style={{ gridTemplateColumns: `${pct}fr ${100 - pct}fr` }}>
      <div className="flex items-center rounded-tile px-4 text-white" style={{ background: "var(--gauge)" }}>{start}</div>
      <div className="flex items-center justify-end rounded-tile bg-card-2 px-4 text-text">{end}</div>
    </div>
  );
}
