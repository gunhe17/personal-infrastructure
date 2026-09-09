// [유기체] StorageCard = Card + StatusDot(마운트) + Meter(쓰임새) + Progress 행(많이 쓰는 것 상위 3)
import { Card } from "@/ui/1-atoms/card";
import { Progress } from "@/ui/1-atoms/progress";
import { Meter } from "@/ui/2-molecules/meter";
import { StatusDot } from "@/ui/2-molecules/status-dot";
import { RANK } from "@/ui/0-tokens/rank";

const GB = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)} TB` : v >= 10 ? `${Math.round(v)} GB` : `${v.toFixed(1)} GB`);

/**
 * [유기체] StorageCard — 한정된 총량(저량)을 종류로 나눈 Meter + 누가 많이 쓰나 상위 3.
 * 내장 디스크·외장 SSD·백업 보관 위치가 같은 틀을 쓴다(사용자 결정 2026-09-09: I/O 는 띠, 용량은 이 카드).
 */
export function StorageCard({ title, mount, total, parts, rowsLabel, rows, format = GB, className }: {
  title: string;
  mount?: string;
  total: number;
  parts: { label: string; value: number }[];
  rowsLabel?: React.ReactNode;
  rows?: { name: string; value: number }[];
  format?: (v: number) => string;
  className?: string;
}) {
  const used = parts.reduce((a, p) => a + p.value, 0);
  const max = Math.max(...(rows ?? []).map((r) => r.value)) || 1;
  return (
    <Card title={title} subtitle={`${format(used)} of ${format(total)} · ${format(total - used)} free`} actions={mount && <StatusDot tone="running" muted><span className="font-mono">{mount}</span></StatusDot>} className={className}>
      <Meter label="Usage" total={total} format={format} parts={parts.map((p, i) => ({ ...p, color: RANK[i % RANK.length] }))} />
      {rows && <>
        <p className="mt-6 mb-3 text-caption text-mute">{rowsLabel}</p>
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={r.name} className="grid grid-cols-[96px_1fr_72px] items-center gap-3">
              <span className="flex items-center gap-2 truncate text-body text-text"><span className="size-2 shrink-0 rounded-full" style={{ background: RANK[i % RANK.length] }} />{r.name}</span>
              <Progress value={(r.value / max) * 100} color={RANK[i % RANK.length]} className="[&>div:first-child]:hidden" />
              <span className="text-end font-mono text-caption tabular-nums text-mute">{format(r.value)}</span>
            </div>
          ))}
        </div>
      </>}
    </Card>
  );
}
