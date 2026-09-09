// [유기체] ResourceBand = 제목·FilterTabs + AreaChart + 가로 쌓은 띠 + 상위 3 행
import { useState } from "react";
import { cn } from "@/lib/cn";
import { AreaChart } from "@/ui/1-atoms/area-chart";
import { FilterTabs } from "@/ui/2-molecules/filter-tabs";
import { NOW, RANK } from "@/ui/0-tokens/rank";

/** 상위 항목 — `share` 는 전체 띠 안에서 차지하는 폭(%). `points` 를 주면 그래프에 순위 색 선으로 얹힌다. */
export type BandPart = { name: string; value: string; share: number; points?: number[] };

/**
 * [유기체] ResourceBand — 리소스 하나를 한 줄로. 확정 규격(사용자 결정 2026-09-09, Lab S1 Base · Ticks):
 * 제목 15/500 + 바로 오른쪽 작은 토글 → 그래프 64(눈금 36, 오른쪽 끝 현재값 88) → 가로 쌓은 띠 8 + 상위 3 행 11/16.
 * 2열은 창 lg(1024) 이상. 색은 순위 — 현재값은 파랑(`--now`), 상위 1·2·3 은 무채색에 가까운 파랑(`--rank-1..3`).
 */
export function ResourceBand({ label, value, points, parts = [], pct, max, format, modes, mode, onModeChange, className }: {
  label: React.ReactNode;
  value: React.ReactNode;
  points: number[];
  parts?: BandPart[];
  pct: number;
  max?: number;
  format?: (v: number) => string;
  modes?: { value: string; label: React.ReactNode }[];
  mode?: string;
  onModeChange?: (v: string) => void;
  className?: string;
}) {
  const [own, setOwn] = useState(modes?.[0]?.value ?? "");
  const cur = mode ?? own, setCur = onModeChange ?? setOwn;
  const series = [{ name: "Total", points, color: NOW, fill: false }, ...parts.filter((p) => p.points).map((p, i) => ({ name: p.name, points: p.points as number[], color: RANK[i % RANK.length], fill: false }))];
  const rest = Math.max(0, pct - parts.reduce((a, p) => a + p.share, 0));
  return (
    <div className={cn("grid gap-x-6 gap-y-4 lg:grid-cols-[1fr_280px] lg:gap-x-8", className)}>
      <div>
        <div className="flex h-7 items-center gap-2">
          <span className="text-body font-medium text-text">{label}</span>
          {modes && <FilterTabs size="sm" value={cur} onValueChange={setCur} items={modes.map((x) => ({ value: x.value, label: x.label }))} />}
        </div>
        <div className="mt-4"><AreaChart series={series} max={max} height={64} format={format} legend={false} nowLabel={value} nowClass="text-body font-medium" nowColor={NOW} nowWidth={88} /></div>
      </div>
      <div>
        <div aria-hidden="true" className="hidden h-7 lg:block" />
        <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-card-3 lg:mt-4">
          {parts.map((p, i) => <span key={p.name} className="h-full rounded-full move" style={{ width: `${p.share}%`, background: RANK[i % RANK.length] }} />)}
          <span className="h-full rounded-full move" style={{ width: `${rest}%`, background: NOW, opacity: parts.length ? 0.4 : 1 }} />
        </div>
        <div className="mt-3 space-y-0.5">
          {parts.map((p, i) => (
            <div key={p.name} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 text-[11px] leading-4">
              <span className="size-1.5 rounded-full" style={{ background: RANK[i % RANK.length] }} />
              <span className="text-sub">{p.name}</span>
              <span className="font-mono tabular-nums text-mute">{p.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** [유기체] ResourceBands — 띠를 한 카드에 line 으로 나눠 쌓는다. 카드는 여백 0, 행이 20/24 를 가진다(첫 행 위·끝 행 아래가 곧 카드 안쪽 여백). */
export function ResourceBands({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("divide-y divide-line rounded-card bg-card [&>*]:p-5 sm:[&>*]:p-6", className)}>{children}</div>;
}

/** 상위 목록에서 몫과 값을 만드는 도우미 — 전체 사용률 `pct` 를 항목 크기 비율로 나눈다. */
export const bandParts = <T,>(items: T[], size: (x: T) => number, name: (x: T) => string, fmt: (v: number) => string, pct: number, points?: (x: T) => number[], n = 3): BandPart[] => {
  const all = items.reduce((a, x) => a + size(x), 0) || 1;
  return [...items].sort((a, b) => size(b) - size(a)).slice(0, n).map((x) => ({ name: name(x), value: fmt(size(x)), share: (pct * size(x)) / all, points: points?.(x) }));
};
