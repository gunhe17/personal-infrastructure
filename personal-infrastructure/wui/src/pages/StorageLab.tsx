import { AppShell, Badge, Button, Card, cn, Dot, IconText, ListRow, Meter, NOW, PageHeading, Progress, RANK, SectionHeading, StatusDot, StorageCard, Tile, AreaChart } from "@/ui";
import { useState } from "react";

// StorageCard Lab — 디스크를 정밀하게 보기 위한 후보들(사용자 요청 2026-09-09). 확정되면 유기체로 옮긴다.
const GB = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)} TB` : v >= 10 ? `${Math.round(v)} GB` : `${v.toFixed(1)} GB`);
const AX = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}T` : `${Math.round(v)}G`); // 눈금은 짧게 — 36px 열에서 접히지 않게
const day = (n: number) => (n >= 365 ? `${Math.floor(n / 365)}년 ${Math.floor((n % 365) / 30)}개월` : n >= 60 ? `${Math.floor(n / 30)}개월` : `${n}일`);

/** 30일 용량 추이 — 지금까지 자란 만큼으로 남은 날을 뽑는다(선형). */
const HIST = { disk: Array.from({ length: 30 }, (_, i) => Math.round((92 + i * 0.74) * 10) / 10), ssd: Array.from({ length: 30 }, (_, i) => Math.round((548 + i * 3.0) * 10) / 10) };
const growth = (h: number[]) => (h[h.length - 1] - h[0]) / (h.length - 1); // GB/일
const daysLeft = (h: number[], total: number) => Math.max(0, Math.round((total - h[h.length - 1]) / (growth(h) || 0.01)));

const DEVICES = [
  { id: "disk", title: "Internal disk", mount: "/", dev: "nvme0n1p2", total: 512, hist: HIST.disk, parts: [{ label: "Images", value: 84 }, { label: "System", value: 24 }, { label: "Logs", value: 6.3 }], rows: [{ name: "worker", value: 3.1 }, { name: "api", value: 1.8 }, { name: "edge", value: 0.9 }], rowsLabel: "Top log writers" },
  { id: "ssd", title: "External SSD", mount: "/mnt/ssd", dev: "sda1", total: 2000, hist: HIST.ssd, parts: [{ label: "Other", value: 410 }, { label: "Backups", value: 132 }, { label: "Volumes", value: 96 }], rows: [{ name: "postgres", value: 46 }, { name: "worker", value: 38 }, { name: "api", value: 12 }], rowsLabel: "Largest volumes" },
];

const RECLAIM = [
  { name: "Dangling images", value: 18.4, note: "12 layers · last used 21d ago", tone: "progress" as const },
  { name: "Stopped containers", value: 2.1, note: "3 containers · draft, test-run", tone: "idle" as const },
  { name: "Backups over 90d", value: 41.0, note: "8 archives · oldest 2026-03-02", tone: "idle" as const },
  { name: "Orphan volumes", value: 6.8, note: "2 volumes · no project attached", tone: "failed" as const },
];

const VOLUMES = [
  { name: "postgres-data", project: "postgres", size: 46, backup: "2h ago", ok: true },
  { name: "worker-spool", project: "worker", size: 38, backup: "2h ago", ok: true },
  { name: "api-uploads", project: "api", size: 12, backup: "6d ago", ok: false },
  { name: "old-cache", project: null, size: 6.8, backup: "never", ok: false },
];

function Option({ id, title, from, fit, children }: { id: string; title: string; from: string; fit: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-16 first:mt-0">
      <SectionHeading title={title} description={<><span className="text-text">Why</span> {from} · <span className="text-text">Fits</span> {fit}</>} />
      {children}
    </section>
  );
}

/** A — 지금 것. 종류별 Meter + 많이 쓰는 것 상위 3. */
function A() {
  return <div className="grid gap-5 md:grid-cols-2">{DEVICES.map((d) => <StorageCard key={d.id} title={d.title} mount={d.mount} total={d.total} parts={d.parts} rowsLabel={d.rowsLabel} rows={d.rows} />)}</div>;
}

/** B — 언제 꽉 차나. 30일 추이 + 하루 증가량 + 남은 날. */
function B() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {DEVICES.map((d) => {
        const used = d.hist[d.hist.length - 1], g = growth(d.hist), left = daysLeft(d.hist, d.total);
        return (
          <Card key={d.id} title={d.title} subtitle={`${GB(used)} of ${GB(d.total)} · ${GB(d.total - used)} free`} actions={<StatusDot tone={left < 90 ? "progress" : "running"} muted><span className="font-mono">{d.mount}</span></StatusDot>}>
            <div className="flex items-baseline gap-2"><span className="text-title tabular-nums text-text" style={{ color: NOW }}>{day(left)}</span><span className="text-body text-mute">until full at +{g.toFixed(1)} GB/day</span></div>
            <div className="mt-4"><AreaChart series={[{ name: "Used", points: d.hist, color: NOW, fill: false }]} max={d.total} height={72} format={AX} legend={false} /></div>
            <div className="mt-5"><Meter label="Usage" total={d.total} format={GB} parts={d.parts.map((p, i) => ({ ...p, color: RANK[i % RANK.length] }))} /></div>
          </Card>
        );
      })}
    </div>
  );
}

/** C — 무엇을 지울 수 있나. 회수 가능 용량 하나로 모으고 항목마다 근거와 동작. */
function C() {
  const [done, setDone] = useState<string[]>([]);
  const left = RECLAIM.filter((r) => !done.includes(r.name));
  const sum = left.reduce((a, r) => a + r.value, 0);
  return (
    <Card title="Reclaimable" subtitle={`${GB(sum)} can be freed now`} actions={<Button variant="secondary" size="sm" onClick={() => setDone(RECLAIM.map((r) => r.name))}>Clean all</Button>}>
      {/* 회수 가능 용량 안에서의 몫 — 남은 항목만으로 100% 를 채운다 */}
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-card-3">
        {left.map((r, i) => <span key={r.name} className="h-full rounded-full move" style={{ width: `${(r.value / (sum || 1)) * 100}%`, background: RANK[i % RANK.length] }} />)}
      </div>
      <div className="mt-5 divide-y divide-line">
        {RECLAIM.map((r, i) => (
          <div key={r.name} className="flex items-center justify-between gap-4 py-3">
            <span className="flex min-w-0 items-center gap-3">
              <span className="size-2 shrink-0 rounded-full" style={{ background: done.includes(r.name) ? "var(--card-3)" : RANK[i % RANK.length] }} />
              <span className="min-w-0">
                <span className={cn("block text-body", done.includes(r.name) ? "text-mute line-through" : "text-text")}>{r.name}</span>
                <span className="block text-caption text-mute">{r.note}</span>
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-3">
              <span className="font-mono text-body tabular-nums text-text">{GB(r.value)}</span>
              <Button size="sm" variant="ghost" disabled={done.includes(r.name)} onClick={() => setDone([...done, r.name])}>{done.includes(r.name) ? "Cleaned" : "Clean"}</Button>
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** D — 볼륨과 백업. 프로젝트 연결·마지막 백업까지 한 줄로. */
function D() {
  const max = Math.max(...VOLUMES.map((v) => v.size));
  return (
    <Card title="Volumes" subtitle={`${VOLUMES.length} volumes · ${GB(VOLUMES.reduce((a, v) => a + v.size, 0))} on /mnt/ssd`}>
      <div className="divide-y divide-line">
        {VOLUMES.map((v, i) => (
          <div key={v.name} className="grid grid-cols-[1fr_200px_120px] items-center gap-4 py-3">
            <ListRow lead={<Tile size="sm">{v.name[0].toUpperCase()}</Tile>} title={v.name} sub={v.project ? `project ${v.project}` : "no project"} end={v.project ? undefined : <Badge tone="failed">orphan</Badge>} />
            <Progress value={(v.size / max) * 100} color={RANK[Math.min(i, RANK.length - 1)]} className="[&>div:first-child]:hidden" />
            <span className="justify-self-end text-end">
              <span className="block font-mono text-body tabular-nums text-text">{GB(v.size)}</span>
              <span className={cn("block text-caption", v.ok ? "text-mute" : "text-warn")}>backup {v.backup}</span>
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** E — 장치 목록. SSD 를 더 꽂아도 줄만 늘어난다. */
function E() {
  return (
    <Card title="Devices" subtitle="3 mounts">
      <div className="divide-y divide-line">
        {[...DEVICES, { id: "usb", title: "Backup HDD", mount: "/mnt/backup", dev: "sdb1", total: 4000, hist: [1180, 1204], parts: [{ label: "Archives", value: 1204 }], rows: [], rowsLabel: "" }].map((d) => {
          const used = d.hist[d.hist.length - 1];
          return (
            <div key={d.id} className="grid grid-cols-[200px_1fr_140px] items-center gap-4 py-4">
              <span>
                <span className="block text-body font-medium text-text">{d.title}</span>
                <span className="block font-mono text-caption text-mute">{d.mount} · {d.dev}</span>
              </span>
              <Progress value={(used / d.total) * 100} color={used / d.total > 0.8 ? "var(--warn)" : NOW} className="[&>div:first-child]:hidden" />
              <span className="justify-self-end text-end">
                <span className="block font-mono text-body tabular-nums text-text">{GB(d.total - used)} free</span>
                <span className="block text-caption text-mute">of {GB(d.total)}</span>
              </span>
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
      <PageHeading crumbs={[{ label: "Home", href: "#" }, { label: "Lab" }, { label: "Storage" }]} title="Storage" meta={<><IconText icon="volume">StorageCard candidates</IconText><span className="inline-flex items-center gap-2 text-body text-mute"><Dot tone="progress" />fake data</span></>} />
      <div className="mt-8">
        <Option id="s-a" title="A · Current — usage by kind" from="확정된 StorageCard. 종류별 Meter + 많이 쓰는 것 상위 3" fit="지금 무엇이 자리를 차지하나. 한 눈에 끝">< A /></Option>
        <Option id="s-b" title="B · Runway — when does it fill" from="30일 추이 + 하루 증가량으로 남은 날을 계산해 큰 숫자로" fit="용량은 며칠 단위로 변한다. '언제 손대야 하나' 가 진짜 질문"><B /></Option>
        <Option id="s-c" title="C · Reclaimable — what can go" from="회수 가능 용량을 하나로 모으고 항목마다 근거와 동작" fit="꽉 찼을 때 바로 누를 것이 있다. dangling·오래된 백업·고아 볼륨"><C /></Option>
        <Option id="s-d" title="D · Volumes — project and backup" from="볼륨마다 프로젝트 연결·크기·마지막 백업" fit="고아 볼륨과 백업 안 된 볼륨을 찾는다"><D /></Option>
        <Option id="s-e" title="E · Devices — one row per mount" from="장치 하나에 한 줄, 여유 공간 기준" fit="SSD 를 더 꽂아도 줄만 는다. 카드 격자보다 확장에 강하다"><E /></Option>
      </div>
    </AppShell>
  );
}
