// [유기체] DeviceList = Card + 장치 행(이름 · 사용량/총량 + Progress · 30일 Sparkline + 축 라벨)
import { Card } from "@/ui/1-atoms/card";
import { Progress } from "@/ui/1-atoms/progress";
import { Sparkline } from "@/ui/1-atoms/sparkline";
import { usageColor, usageTone } from "@/ui/0-tokens/rank";
import { formatGB } from "@/lib/format";

export type Device = { name: string; used: number; total: number; history?: number[] };


/**
 * [유기체] DeviceList — 마운트된 저장 장치를 한 줄씩(확정 규격, 사용자 결정 2026-09-09: StorageLab V1).
 * 이름 180 · 막대 위 왼쪽에 사용량 오른쪽에 총량 · 오른쪽 160 에 변화 그래프와 축 양 끝 라벨.
 * 장치가 늘어도 줄만 는다. 지금 흐르는 양은 `ResourceBand` 가 맡는다.
 */
export function DeviceList({ title = "Devices", devices, span = "30d", format = formatGB, className }: {
  title?: string;
  devices: Device[];
  /** 그래프가 덮는 기간 — 왼쪽 끝 라벨로 쓴다. */
  span?: string;
  format?: (v: number) => string;
  className?: string;
}) {
  return (
    <Card title={title} className={className}>
      <div className="divide-y divide-line">
        {devices.map((d) => {
          const pct = Math.min(100, (d.used / d.total) * 100), tone = usageTone(pct), color = usageColor(pct);
          return (
            <div key={d.name} className="grid grid-cols-[180px_1fr] items-center gap-6 py-4 lg:grid-cols-[180px_1fr_160px]">
              <span className="block truncate text-body font-medium text-text">{d.name}</span>
              <span className="min-w-0">
                <span className="mb-2 flex items-baseline justify-between gap-3 text-caption">
                  <span className="font-mono tabular-nums" style={{ color }}>{format(d.used)} used</span>
                  <span className="font-mono tabular-nums text-mute">{format(d.total)}</span>
                </span>
                <Progress value={pct} color={color} className="[&>div:first-child]:hidden" />
              </span>
              {d.history && (
                <span className="col-span-2 justify-self-end lg:col-span-1">
                  <Sparkline fluid points={d.history} tone={tone} height={32} className="block w-[160px]" />
                  <span className="mt-1 flex w-[160px] justify-between font-mono text-[11px] leading-4 text-mute"><span>{span} ago</span><span>now</span></span>
                </span>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
