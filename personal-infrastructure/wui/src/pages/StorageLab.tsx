import { AppShell, AreaChart, Card, cn, Dot, IconText, NOW, PageHeading, Progress, SectionHeading, Sparkline } from "@/ui";

// StorageCard Lab — 디스크를 정밀하게 보기 위한 후보들(사용자 요청 2026-09-09). 확정되면 유기체로 옮긴다.
const GB = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)} TB` : v >= 10 ? `${Math.round(v)} GB` : `${v.toFixed(1)} GB`);
const AX = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}T` : `${Math.round(v)}G`); // 눈금은 짧게 — 36px 열에서 접히지 않게
const day = (n: number) => (n >= 365 ? `${Math.floor(n / 365)}년 ${Math.floor((n % 365) / 30)}개월` : n >= 60 ? `${Math.floor(n / 30)}개월` : `${n}일`);

// 내장 디스크는 차오르는 중(388→409 GB) — 상태·추세 변형이 실제로 보이게 한 가짜 값.
/** 30일 용량 추이 — 지금까지 자란 만큼으로 남은 날을 뽑는다(선형). */
const HIST = { disk: Array.from({ length: 30 }, (_, i) => Math.round((388 + i * 0.74) * 10) / 10), ssd: Array.from({ length: 30 }, (_, i) => Math.round((548 + i * 3.0) * 10) / 10) };
const growth = (h: number[]) => (h[h.length - 1] - h[0]) / (h.length - 1); // GB/일
const daysLeft = (h: number[], total: number) => Math.max(0, Math.round((total - h[h.length - 1]) / (growth(h) || 0.01)));

const HDD = Array.from({ length: 30 }, (_, i) => Math.round((1150 + i * 1.9) * 10) / 10);
const DEVICES = [
  { id: "disk", title: "Internal disk", mount: "/", dev: "nvme0n1p2", kind: "NVMe SSD", total: 512, hist: HIST.disk, parts: [{ label: "Images", value: 84 }, { label: "System", value: 24 }, { label: "Logs", value: 6.3 }], rows: [{ name: "worker", value: 3.1 }, { name: "api", value: 1.8 }, { name: "edge", value: 0.9 }], rowsLabel: "Top log writers", io: "2.1 MB/s", reclaim: 20.5 },
  { id: "ssd", title: "External SSD", mount: "/mnt/ssd", dev: "sda1", kind: "USB SSD", total: 2000, hist: HIST.ssd, parts: [{ label: "Other", value: 410 }, { label: "Backups", value: 132 }, { label: "Volumes", value: 96 }], rows: [{ name: "postgres", value: 46 }, { name: "worker", value: 38 }, { name: "api", value: 12 }], rowsLabel: "Largest volumes", io: "9.0 MB/s", reclaim: 47.8 },
  { id: "hdd", title: "Backup HDD", mount: "/mnt/backup", dev: "sdb1", kind: "USB HDD", total: 4000, hist: HDD, parts: [{ label: "Archives", value: 1150 }, { label: "Snapshots", value: 54 }], rows: [{ name: "postgres", value: 620 }, { name: "worker", value: 410 }, { name: "api", value: 120 }], rowsLabel: "Largest archives", io: "0.2 MB/s", reclaim: 41 },
];
const used = (d: (typeof DEVICES)[number]) => d.hist[d.hist.length - 1];
const tone = (d: (typeof DEVICES)[number]) => (used(d) / d.total > 0.8 ? "var(--bad)" : used(d) / d.total > 0.6 ? "var(--warn)" : NOW);



function Option({ id, title, from, fit, children }: { id: string; title: string; from: string; fit: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-16 first:mt-0">
      <SectionHeading title={title} description={<><span className="text-text">Why</span> {from} · <span className="text-text">Fits</span> {fit}</>} />
      {children}
    </section>
  );
}

/** 장치 이름 칸 — 이름만(사용자 지정 2026-09-09: 마운트·장치명 제거). 변형이 공유한다. */
function DevName({ d }: { d: (typeof DEVICES)[number] }) {
  return <span className="block truncate text-body font-medium text-text">{d.title}</span>;
}

/** 예측 — 지금 기울기로 그대로 가면 언제 상한에 닿나. 실선 뒤에 점선으로 잇는다. */
const forecast = (h: number[], total: number) => {
  const g = growth(h) || 0.01, tail = h[h.length - 1];
  const n = Math.min(40, Math.max(8, Math.ceil(daysLeft(h, total) / 6) + 2)); // 상한에 닿는 지점이 보이도록 칸 수를 맞춘다(최대 40칸 = 8개월)
  return { line: Array.from({ length: n }, (_, i) => Math.min(total, tail + g * (i + 1) * 6)) };
};

/** V1 — 기준. 막대 위에 사용량·총량, 오른쪽에 30일 변화. 시간 축은 열 머리에 한 번만 적는다(사용자 질문 2026-09-09: 일 기준 변화량임을 어떻게 명시하나). */
function V1() {
  return (
    <Card title="Devices" subtitle={`${DEVICES.length} mounts · ${GB(DEVICES.reduce((a, d) => a + d.total - used(d), 0))} free in total`}>
      {/* 열 머리 — 오른쪽 그래프가 무엇을 그리는지 한 번만 말한다. 행마다 반복하지 않는다. */}
      <div className="grid grid-cols-[180px_1fr_160px] items-baseline gap-6 border-b border-line pb-2 text-caption text-mute">
        <span>Device</span>
        <span>Used of capacity</span>
        <span className="justify-self-end">Last 30 days</span>
      </div>
      <div className="divide-y divide-line">
        {DEVICES.map((d) => {
          const pct = (used(d) / d.total) * 100;
          return (
            <div key={d.id} className="grid grid-cols-[180px_1fr_160px] items-center gap-6 py-4">
              <DevName d={d} />
              <span className="min-w-0">
                <span className="mb-2 flex items-baseline justify-between gap-3 text-caption">
                  <span className="font-mono tabular-nums" style={{ color: tone(d) }}>{GB(used(d))} used</span>
                  <span className="font-mono tabular-nums text-mute">{GB(d.total)}</span>
                </span>
                <Progress value={pct} color={tone(d)} className="[&>div:first-child]:hidden" />
              </span>
              <span className="justify-self-end text-end">
                <Sparkline fluid points={d.hist} tone={pct > 60 ? "warn" : "accent"} height={32} className="block w-[160px]" />
              </span>
            </div>
          );
        })}
      </div>
      {/* 축 양 끝 — 마지막 행 아래에 한 번. 왼쪽이 30일 전, 오른쪽이 지금. */}
      <div className="grid grid-cols-[180px_1fr_160px] gap-6 pt-2">
        <span /><span />
        <span className="flex justify-between font-mono text-[11px] leading-4 text-mute"><span>30d ago</span><span>now</span></span>
      </div>
    </Card>
  );
}

/** V2 — 막대 안에 값. 라벨 줄을 없애 행이 낮아진다. 채운 칸 끝에 사용량, 트랙 끝에 총량. */
function V2() {
  return (
    <Card title="Devices" subtitle="Values sit inside the bar — the shortest row">
      <div className="divide-y divide-line">
        {DEVICES.map((d) => {
          const pct = (used(d) / d.total) * 100;
          return (
            <div key={d.id} className="grid grid-cols-[180px_1fr_140px] items-center gap-6 py-4">
              <DevName d={d} />
              <span className="relative flex h-6 min-w-0 items-center overflow-hidden rounded-[6px] bg-card-3">
                <span className="h-full rounded-[6px] move" style={{ width: `${pct}%`, background: tone(d) }} />
                <span className="absolute inset-x-0 flex items-center justify-between px-2 font-mono text-[11px] leading-4 tabular-nums">
                  <span className={pct > 60 && pct <= 80 ? "text-ink" : "text-white"}>{GB(used(d))} · {Math.round(pct)}%</span>
                  <span className="text-mute">{GB(d.total)}</span>
                </span>
              </span>
              <span className="justify-self-end text-end">
                <Sparkline fluid points={d.hist} tone={pct > 60 ? "warn" : "accent"} height={24} className="block w-[140px]" />
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/** V3 — 그래프가 주인공. 오른쪽을 면적 차트로 키우고 총량을 점선으로, 오른쪽 끝에 현재값. 막대는 얇은 보조. */
function V3() {
  return (
    <Card title="Devices" subtitle="Chart carries the row — dashed line is the capacity">
      <div className="divide-y divide-line">
        {DEVICES.map((d) => {
          const pct = (used(d) / d.total) * 100;
          return (
            <div key={d.id} className="grid grid-cols-[180px_1fr] items-center gap-6 py-5">
              <span>
                <DevName d={d} />
                <span className="mt-3 block"><Progress value={pct} color={tone(d)} className="[&>div:first-child]:hidden" /></span>
                <span className="mt-2 block font-mono text-caption tabular-nums text-mute">{Math.round(pct)}% · +{growth(d.hist).toFixed(1)} GB/day</span>
              </span>
              <AreaChart series={[{ name: "Used", points: d.hist, color: tone(d) }]} max={d.total} limit={{ value: d.total, label: GB(d.total) }} height={64} format={AX} legend={false} nowLabel={GB(used(d))} nowClass="text-body font-medium" nowColor={tone(d)} nowWidth={88} />
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/** V4 — 그림 하나. 막대를 없애고 그래프만 — 상한 점선까지의 거리가 곧 여유다. */
function V4() {
  return (
    <Card title="Devices" subtitle="No bar — the gap to the dashed line is the free space">
      <div className="divide-y divide-line">
        {DEVICES.map((d) => (
          <div key={d.id} className="grid grid-cols-[180px_1fr] items-center gap-6 py-5">
            <span>
              <DevName d={d} />
              <span className="mt-2 block font-mono text-caption tabular-nums" style={{ color: tone(d) }}>{GB(d.total - used(d))} free</span>
            </span>
            <AreaChart series={[{ name: "Used", points: d.hist, color: tone(d) }]} max={d.total} limit={{ value: d.total, label: `${GB(d.total)} capacity` }} height={72} format={AX} legend={false} nowLabel={GB(used(d))} nowClass="text-body font-medium" nowColor={tone(d)} nowWidth={88} />
          </div>
        ))}
      </div>
    </Card>
  );
}

/** V5 — 예측까지. 지금 기울기를 점선으로 이어 상한에 닿는 지점을 보여 준다. */
function V5() {
  return (
    <Card title="Devices" subtitle="Dashed continuation is the current slope carried forward">
      <div className="divide-y divide-line">
        {DEVICES.map((d) => {
          const f = forecast(d.hist, d.total), left = daysLeft(d.hist, d.total), warn = left < 180;
          return (
            <div key={d.id} className="grid grid-cols-[180px_1fr] items-center gap-6 py-5">
              <span>
                <DevName d={d} />
                <span className={cn("mt-2 block text-body tabular-nums", warn ? "text-warn" : "text-text")}>{day(left)} <span className="text-caption text-mute">until full</span></span>
              </span>
              {/* 점선 예측을 먼저 깔고 실제 선을 위에 — 실제 구간에서는 실선이 점선을 덮는다 */}
              <AreaChart series={[{ name: "Forecast", points: [...d.hist, ...f.line], color: tone(d), fill: false, dash: true }, { name: "Used", points: d.hist, color: tone(d), fill: false }]}
                max={d.total} limit={{ value: d.total, label: GB(d.total) }} height={72} format={AX} legend={false} />
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function StorageLab() {
  return (
    <AppShell>
      <PageHeading crumbs={[{ label: "Home", href: "#" }, { label: "Lab" }, { label: "Devices" }]} title="Devices" meta={<><IconText icon="volume">How to show usage and trend in one row</IconText><span className="inline-flex items-center gap-2 text-body text-mute"><Dot tone="progress" />fake data · internal disk is 80% full</span></>} />
      <div className="mt-8">
        <Option id="v1" title="V1 · Labels above the bar" from="시간 축은 열 머리 Last 30 days 와 아래 30d ago → now 로 한 번만 — 행마다 캡션을 반복하지 않는다" fit="값과 흐름이 각자 자리. 축은 카드가 한 번 말한다" ><V1 /></Option>
        <Option id="v2" title="V2 · Values inside the bar" from="라벨 줄을 없애고 값을 24px 막대 안으로. 트렌드는 작게" fit="행이 가장 낮다. 장치가 많을 때 목록이 짧아진다"><V2 /></Option>
        <Option id="v3" title="V3 · Chart-led row" from="오른쪽을 면적 차트로 키우고 총량은 점선, 끝에 현재값. 막대는 왼쪽 보조" fit="흐름이 주인공. 막대는 지금 비율만 거든다"><V3 /></Option>
        <Option id="v4" title="V4 · One picture — no bar" from="막대를 없애고 그래프만. 상한 점선까지의 거리가 곧 여유" fit="한 그림으로 끝난다. 대신 정확한 %는 안 보인다"><V4 /></Option>
        <Option id="v5" title="V5 · With forecast" from="지금 기울기를 점선으로 이어 상한에 닿는 지점을 보여 준다" fit="'언제 꽉 차나' 를 그림으로 답한다. 선형 가정이 드러난다"><V5 /></Option>
      </div>
    </AppShell>
  );
}
