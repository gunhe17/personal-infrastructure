import { AppShell, AreaChart, Badge, Button, Card, cn, Dot, Icon, IconText, KeyValue, ListRow, Meter, NOW, PageHeading, Progress, RANK, SectionHeading, Sparkline, StatusDot, StorageCard, Tile } from "@/ui";
import { useState } from "react";

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

/** 장치 이름 칸 — 다섯 변형이 공유한다. */
function DevName({ d, sub }: { d: (typeof DEVICES)[number]; sub?: React.ReactNode }) {
  return (
    <span className="min-w-0">
      <span className="block truncate text-body font-medium text-text">{d.title}</span>
      <span className="block truncate font-mono text-caption text-mute">{sub ?? `${d.mount} · ${d.dev}`}</span>
    </span>
  );
}
const freeCol = (d: (typeof DEVICES)[number]) => (
  <span className="justify-self-end text-end">
    <span className="block font-mono text-body tabular-nums text-text">{GB(d.total - used(d))} free</span>
    <span className="block text-caption text-mute">of {GB(d.total)}</span>
  </span>
);

/** E1 — 막대 위에 사용량·총량, 오른쪽에 30일 용량 변화 그래프(사용자 지정 2026-09-09). */
function E1() {
  return (
    <Card title="Devices" subtitle={`${DEVICES.length} mounts · ${GB(DEVICES.reduce((a, d) => a + d.total - used(d), 0))} free in total`}>
      <div className="divide-y divide-line">
        {DEVICES.map((d) => {
          const pct = (used(d) / d.total) * 100, warn = pct > 60;
          return (
            <div key={d.id} className="grid grid-cols-[180px_1fr_160px] items-center gap-6 py-4">
              <DevName d={d} />
              <span className="min-w-0">
                {/* 막대 위 — 왼쪽은 지금 쓰는 양, 오른쪽은 총량 */}
                <span className="mb-2 flex items-baseline justify-between gap-3 text-caption">
                  <span className="font-mono tabular-nums" style={{ color: tone(d) }}>{GB(used(d))} used <span className="text-mute">· {Math.round(pct)}%</span></span>
                  <span className="font-mono tabular-nums text-mute">{GB(d.total)}</span>
                </span>
                <Progress value={pct} color={tone(d)} className="[&>div:first-child]:hidden" />
              </span>
              {/* 오른쪽 — 30일 용량 변화 */}
              <span className="justify-self-end text-end">
                <Sparkline fluid points={d.hist} tone={warn ? "warn" : "accent"} height={32} className="block w-[160px]" />
                <span className="mt-1 block font-mono text-caption tabular-nums text-mute">+{growth(d.hist).toFixed(1)} GB/day · 30d</span>
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/** E2 — 막대를 종류로 쪼갠다. 한 줄에서 "무엇이 차지하나" 까지 읽힌다. */
function E2() {
  return (
    <Card title="Devices" subtitle="Bar is split by kind — images · volumes · backups">
      <div className="divide-y divide-line">
        {DEVICES.map((d) => (
          <div key={d.id} className="grid grid-cols-[200px_1fr_140px] items-center gap-4 py-4">
            <DevName d={d} />
            <span className="min-w-0">
              <span className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-card-3">
                {d.parts.map((p, i) => <span key={p.label} className="h-full rounded-full move" style={{ width: `${(p.value / d.total) * 100}%`, background: RANK[i % RANK.length] }} />)}
              </span>
              <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {d.parts.map((p, i) => <span key={p.label} className="inline-flex items-center gap-1.5 whitespace-nowrap text-caption text-mute"><span className="size-1.5 rounded-full" style={{ background: RANK[i % RANK.length] }} />{p.label} <span className="font-mono tabular-nums text-text">{GB(p.value)}</span></span>)}
              </span>
            </span>
            {freeCol(d)}
          </div>
        ))}
      </div>
    </Card>
  );
}

/** E3 — 추세를 넣는다. 30일 스파크라인 + 남은 날. "언제 손대야 하나" 가 목록에서 바로. */
function E3() {
  return (
    <Card title="Devices" subtitle="30-day trend and runway per mount">
      <div className="divide-y divide-line">
        {DEVICES.map((d) => {
          const left = daysLeft(d.hist, d.total), warn = left < 180;
          return (
            <div key={d.id} className="grid grid-cols-[180px_1fr_120px_140px] items-center gap-4 py-4">
              <DevName d={d} />
              <span className="min-w-0">
                <Progress value={(used(d) / d.total) * 100} color={tone(d)} className="[&>div:first-child]:hidden" />
                <span className="mt-2 block text-caption text-mute">+{growth(d.hist).toFixed(1)} GB/day</span>
              </span>
              <Sparkline fluid points={d.hist} tone={warn ? "warn" : "accent"} height={28} className="block w-full" />
              <span className="justify-self-end text-end">
                <span className={cn("block text-body tabular-nums", warn ? "text-warn" : "text-text")}>{day(left)}</span>
                <span className="block text-caption text-mute">until full</span>
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/** E4 — 펼치는 행. 목록은 그대로 짧고, 필요한 장치만 그 자리에서 세부를 연다. */
function E4() {
  const [open, setOpen] = useState<string | null>("ssd");
  return (
    <Card title="Devices" subtitle="Click a row for detail">
      <div className="divide-y divide-line">
        {DEVICES.map((d) => (
          <div key={d.id}>
            <button type="button" onClick={() => setOpen(open === d.id ? null : d.id)} className="grid w-full grid-cols-[200px_1fr_140px_auto] items-center gap-4 py-4 text-start interactive -mx-3 px-3 rounded-control">
              <DevName d={d} />
              <Progress value={(used(d) / d.total) * 100} color={tone(d)} className="[&>div:first-child]:hidden" />
              {freeCol(d)}
              <Icon name="chevronDown" size="sm" className={cn("tint move text-mute", open === d.id && "rotate-180")} />
            </button>
            {open === d.id && (
              <div className="mb-4 rounded-control bg-card-2 p-5 appear surface-2">
                <div className="grid gap-6 md:grid-cols-2">
                  <Meter label="Usage" total={d.total} format={GB} parts={d.parts.map((p, i) => ({ ...p, color: RANK[i % RANK.length] }))} />
                  <KeyValue className="grid-cols-[112px_1fr]" items={[{ label: "Device", value: `${d.dev} · ${d.kind}`, mono: true }, { label: "I/O now", value: d.io, mono: true }, { label: "Runway", value: `${day(daysLeft(d.hist, d.total))} at +${growth(d.hist).toFixed(1)} GB/day` }, { label: "Reclaimable", value: GB(d.reclaim), mono: true }]} />
                </div>
                <p className="mt-6 mb-3 text-caption text-mute">{d.rowsLabel}</p>
                <div className="space-y-2">
                  {d.rows.map((r, i) => (
                    <div key={r.name} className="grid grid-cols-[96px_1fr_72px] items-center gap-3">
                      <span className="flex items-center gap-2 truncate text-body text-text"><span className="size-2 shrink-0 rounded-full" style={{ background: RANK[i % RANK.length] }} />{r.name}</span>
                      <Progress value={(r.value / Math.max(...d.rows.map((x) => x.value))) * 100} color={RANK[i % RANK.length]} className="[&>div:first-child]:hidden" />
                      <span className="text-end font-mono text-caption tabular-nums text-mute">{GB(r.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

/** E5 — 상태 먼저. 손봐야 할 장치가 위로 올라오고 배지가 이유를 말한다. */
function E5() {
  const rank = (d: (typeof DEVICES)[number]) => daysLeft(d.hist, d.total);
  const sorted = [...DEVICES].sort((a, b) => rank(a) - rank(b));
  return (
    <Card title="Devices" subtitle="Sorted by runway — the one to touch first is on top">
      <div className="divide-y divide-line">
        {sorted.map((d) => {
          const left = daysLeft(d.hist, d.total), pct = (used(d) / d.total) * 100;
          const state = left < 180 ? { tone: "progress" as const, text: `fills in ${day(left)}` } : pct > 60 ? { tone: "progress" as const, text: `${Math.round(pct)}% used` } : { tone: "running" as const, text: "healthy" };
          return (
            <div key={d.id} className="grid grid-cols-[200px_150px_1fr_140px] items-center gap-4 py-4">
              <DevName d={d} sub={`${d.mount} · ${d.kind}`} />
              <StatusDot tone={state.tone}>{state.text}</StatusDot>
              <Progress value={pct} color={tone(d)} className="[&>div:first-child]:hidden" />
              {freeCol(d)}
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
        <Option id="s-e1" title="E1 · Devices — usage on the bar, trend on the right" from="막대 위에 사용량·%·총량, 오른쪽에 30일 용량 변화" fit="한 줄에서 지금과 흐름을 같이 읽는다. 장치가 늘어도 줄만 는다"><E1 /></Option>
        <Option id="s-e2" title="E2 · Split bar — what fills it" from="막대를 종류(이미지·볼륨·백업)로 쪼개고 아래 색 점 범례" fit="한 줄에서 '무엇이 차지하나' 까지. 줄 높이가 조금 는다"><E2 /></Option>
        <Option id="s-e3" title="E3 · Trend — 30일 추이와 남은 날" from="스파크라인 + GB/일 + 남은 날. 임박한 장치는 warn 색" fit="'언제 손대야 하나' 를 목록에서 바로. 네 열이 필요하다"><E3 /></Option>
        <Option id="s-e4" title="E4 · Expandable — 그 자리에서 세부" from="행을 누르면 종류 Meter · 장치 정보 · 상위 항목이 펼쳐진다" fit="목록은 짧게 두고 필요한 장치만 깊게. 별도 화면이 필요 없다"><E4 /></Option>
        <Option id="s-e5" title="E5 · By state — 손볼 것부터" from="남은 날 순으로 정렬하고 상태 점이 이유를 말한다" fit="장치가 여럿일 때 무엇부터 볼지 화면이 정해 준다"><E5 /></Option>
      </div>
    </AppShell>
  );
}
