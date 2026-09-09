import { AreaChart, AppShell, Card, cn, Container, Dot, Switch, IconText, KeyValue, ListRow, PageHeading, Progress, SectionHeading, Tile } from "@/ui";
import { useEffect, useRef, useState } from "react";

// Lab — 결정 전 후보를 실제 크기로 나란히 본다. 여기 있는 것은 아직 키트가 아니다. 선택되면 유기체/템플릿으로 옮긴다.
const rnd = (seed: number) => { let x = seed; return () => { x = (x * 9301 + 49297) % 233280; return x / 233280; }; };
const walk = (seed: number, n: number, base: number, amp: number) => { const r = rnd(seed); let v = base; return Array.from({ length: n }, () => { v = Math.max(0, v + (r() - 0.5) * amp); return Math.round(v * 10) / 10; }); };
type Ct = { name: string; stack: string; cpu: number; mem: number; memLimit: number; uptime: string; restarts: number; status: string; spark: number[]; memSpark: number[]; wr: number; rd: number; wrRate: number; rdRate: number; vol: number; rx: number; tx: number; rxRate: number; txRate: number };
type Metrics = { h: { cpu: number[]; mem: number[]; disk: number[]; net_in: number[]; net_out: number[] }; ct: Ct[]; tick: number };
const seed = (): Metrics => ({
  h: { cpu: walk(1, 48, 22, 12), mem: walk(2, 48, 6.1, 0.6), disk: walk(3, 48, 212, 0.4), net_in: walk(4, 48, 12, 8), net_out: walk(5, 48, 3, 3) },
  ct: [
    { name: "api", stack: "dockerfile", cpu: 12, mem: 1.4, memLimit: 2, uptime: "6일 4시간", restarts: 0, status: "running", spark: walk(11, 24, 12, 6), memSpark: walk(21, 24, 1.4, 0.2), wr: 3.7, rd: 254.9, wrRate: 0.2, rdRate: 1.1, vol: 12, rx: 18.6, tx: 90.2, rxRate: 6, txRate: 2 },
    { name: "blog", stack: "static", cpu: 1, mem: 0.1, memLimit: 0.5, uptime: "14일", restarts: 0, status: "running", spark: walk(12, 24, 1, 1), memSpark: walk(22, 24, 0.1, 0.02), wr: 0, rd: 15.4, wrRate: 0, rdRate: 0.1, vol: 0.4, rx: 2.1, tx: 40.5, rxRate: 1, txRate: 3 },
    { name: "worker", stack: "node", cpu: 34, mem: 2.9, memLimit: 3, uptime: "3시간", restarts: 3, status: "running", spark: walk(13, 24, 30, 14), memSpark: walk(23, 24, 2.9, 0.3), wr: 108.7, rd: 7.1, wrRate: 4.8, rdRate: 0.3, vol: 38, rx: 0.9, tx: 0.3, rxRate: 0.4, txRate: 0.1 },
    { name: "postgres", stack: "db", cpu: 4, mem: 0.9, memLimit: 2, uptime: "14일", restarts: 0, status: "running", spark: walk(14, 24, 4, 2), memSpark: walk(24, 24, 0.9, 0.1), wr: 90.3, rd: 18.6, wrRate: 1.6, rdRate: 0.5, vol: 46, rx: 4.2, tx: 3.9, rxRate: 0.8, txRate: 0.7 },
    { name: "edge", stack: "caddy", cpu: 2, mem: 0.2, memLimit: 0.5, uptime: "14일", restarts: 0, status: "running", spark: walk(15, 24, 2, 1), memSpark: walk(25, 24, 0.2, 0.03), wr: 0.7, rd: 140.8, wrRate: 0, rdRate: 0.2, vol: 0.1, rx: 176, tx: 142, rxRate: 12, txRate: 11 },
  ],
  tick: 0,
});
// 실시간 흉내 — 1초마다 한 칸 밀고 끝값에 랜덤 워크. 호스트 CPU 는 컨테이너 합에 바탕 부하를 더한 값이라 둘이 같이 움직인다.
const step = (m: Metrics): Metrics => {
  const r = rnd(1000 + m.tick);
  const nudge = (v: number, amp: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round((v + (r() - 0.5) * amp) * 10) / 10));
  const push = (a: number[], v: number) => [...a.slice(1), v];
  const ct = m.ct.map((c) => { const cpu = nudge(c.cpu, c.cpu > 20 ? 10 : 3, 0, 100); const mem = nudge(c.mem, 0.08, 0.05, c.memLimit); const wrRate = nudge(c.wrRate, c.wrRate > 1 ? 2 : 0.2, 0, 20), rdRate = nudge(c.rdRate, 0.4, 0, 10), rxRate = nudge(c.rxRate, c.rxRate > 5 ? 4 : 0.6, 0, 30), txRate = nudge(c.txRate, c.txRate > 5 ? 4 : 0.4, 0, 30); return { ...c, cpu, mem, spark: push(c.spark, cpu), memSpark: push(c.memSpark, mem), wrRate, rdRate, rxRate, txRate, wr: Math.round((c.wr + wrRate / 1024) * 10) / 10, rd: Math.round((c.rd + rdRate / 1024) * 10) / 10, rx: Math.round((c.rx + rxRate / 8 / 1024) * 100) / 100, tx: Math.round((c.tx + txRate / 8 / 1024) * 100) / 100 }; });
  const cpu = Math.min(100, Math.round(ct.reduce((a, c) => a + c.cpu, 0) * 0.4 + 4 + r() * 3));
  const mem = Math.round(ct.reduce((a, c) => a + c.mem, 0) * 10) / 10 + 0.6;
  const last = (a: number[]) => a[a.length - 1];
  return { tick: m.tick + 1, ct, h: { cpu: push(m.h.cpu, cpu), mem: push(m.h.mem, Math.round(mem * 10) / 10), disk: push(m.h.disk, nudge(last(m.h.disk), 0.2, 200, 512)), net_in: push(m.h.net_in, nudge(last(m.h.net_in), 6, 1, 40)), net_out: push(m.h.net_out, nudge(last(m.h.net_out), 2, 1, 20)) } };
};
function useLive(on: boolean) {
  const [m, setM] = useState<Metrics>(seed);
  const timer = useRef<number>(0);
  useEffect(() => { if (!on) return; timer.current = window.setInterval(() => setM(step), 1000); return () => window.clearInterval(timer.current); }, [on]);
  return m;
}
const last = (a: number[]) => a[a.length - 1];

function Option({ id, title, from, fit, children }: { id: string; title: string; from: string; fit: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-16 first:mt-0">
      <SectionHeading title={title} description={<><span className="text-text">근거</span> {from} · <span className="text-text">맞는 경우</span> {fit}</>} />
      {children}
    </section>
  );
}

type Res = "cpu" | "mem" | "disk" | "net";
// ── 한눈에 보기 — 네 리소스가 동시에 보이는 경우의 수 ─────────────────────────
const RES: { id: Res; label: string; unit: (c: Ct) => string; pct: (c: Ct) => number; tone: (c: Ct) => "accent" | "good" | "warn" | "bad" }[] = [
  { id: "cpu", label: "CPU", unit: (c) => `${Math.round(c.cpu)}%`, pct: (c) => c.cpu, tone: (c) => (c.cpu > 30 ? "warn" : "accent") },
  { id: "mem", label: "메모리", unit: (c) => `${c.mem.toFixed(1)} GB`, pct: (c) => (c.mem / c.memLimit) * 100, tone: (c) => (c.mem / c.memLimit > 0.9 ? "bad" : "good") },
  { id: "disk", label: "디스크", unit: (c) => `${(c.wrRate + c.rdRate).toFixed(1)} MB/s`, pct: (c) => Math.min(100, (c.wrRate + c.rdRate) * 5), tone: () => "accent" },
  { id: "net", label: "네트워크", unit: (c) => `${(c.rxRate + c.txRate).toFixed(1)} Mb/s`, pct: (c) => Math.min(100, (c.rxRate + c.txRate) * 2), tone: () => "good" },
];
const hostOf = (H: Metrics["h"], id: Res) => ({
  cpu: { value: `${Math.round(last(H.cpu))}%`, sub: "8 코어", series: [{ name: "호스트", points: H.cpu, tone: "accent" as const }], max: 100, fmt: (v: number) => `${v}%` },
  mem: { value: `${last(H.mem).toFixed(1)} GB`, sub: "16 GB 중", series: [{ name: "사용", points: H.mem, tone: "info" as const }], max: 16, fmt: (v: number) => `${v}G` },
  disk: { value: `${Math.round(last(H.disk))} GB`, sub: "512 GB 중", series: [{ name: "읽기", points: H.net_out.map((v) => v / 2), tone: "info" as const }, { name: "쓰기", points: H.net_in.map((v) => v / 3), tone: "warn" as const }], max: undefined, fmt: (v: number) => `${v}M` },
  net: { value: `↓${Math.round(last(H.net_in))} ↑${Math.round(last(H.net_out))}`, sub: "Mb/s", series: [{ name: "받음", points: H.net_in, tone: "good" as const }, { name: "보냄", points: H.net_out, tone: "accent" as const }], max: undefined, fmt: (v: number) => `${v}` },
}[id]);
const topOf = (CT: Ct[], r: (typeof RES)[number], n = 3) => [...CT].sort((a, b) => r.pct(b) - r.pct(a)).slice(0, n);

/** V1 — 2×2 사분면. 리소스 하나가 칸 하나: 값 · 시계열 · 상위 3. */
function V1({ m }: { m: Metrics }) {
  return (
    <div className="grid grid-cols-2 gap-5">
      {RES.map((r) => { const h = hostOf(m.h, r.id); return (
        <Card key={r.id} title={r.label} subtitle={h.sub} actions={<span className="text-title tabular-nums text-text">{h.value}</span>}>
          <div className="ps-8"><AreaChart series={h.series} max={h.max} height={96} format={h.fmt} /></div>
          <div className="mt-4 space-y-2">{topOf(m.ct, r).map((c) => <div key={c.name} className="grid grid-cols-[96px_1fr_88px] items-center gap-3"><span className="truncate text-body text-text">{c.name}</span><Progress value={r.pct(c)} tone={r.tone(c)} className="[&>div:first-child]:hidden" /><span className="text-end font-mono text-caption tabular-nums text-mute">{r.unit(c)}</span></div>)}</div>
        </Card>); })}
    </div>
  );
}

/** V2 — 가로 띠 4단. 활성 상태 보기의 아래 패널을 리소스마다 한 줄씩: 합계 · 시계열 · 상위 3. */
function V2({ m }: { m: Metrics }) {
  return (
    <Card className="divide-y divide-line p-0 [&>*]:px-6 [&>*]:py-5">
      {RES.map((r) => { const h = hostOf(m.h, r.id); return (
        <div key={r.id} className="grid grid-cols-[160px_1fr_260px] items-center gap-8">
          <div><p className="text-body text-mute">{r.label}</p><p className="mt-1 text-title tabular-nums text-text">{h.value}</p><p className="text-caption text-mute">{h.sub}</p></div>
          <div className="ps-8"><AreaChart series={h.series} max={h.max} height={64} format={h.fmt} /></div>
          <div className="space-y-1.5">{topOf(m.ct, r).map((c) => <div key={c.name} className="grid grid-cols-[80px_1fr_80px] items-center gap-2"><span className="truncate text-caption text-text">{c.name}</span><Progress value={r.pct(c)} tone={r.tone(c)} className="[&>div:first-child]:hidden" /><span className="text-end font-mono text-caption tabular-nums text-mute">{r.unit(c)}</span></div>)}</div>
        </div>); })}
    </Card>
  );
}

/** V3 — 매트릭스 + 시계열 스택. 왼쪽은 컨테이너 × 리소스 표(칸마다 막대), 오른쪽은 리소스 넷의 시계열. */
function V3({ m }: { m: Metrics }) {
  const [sort, setSort] = useState<Res>("cpu");
  const r0 = RES.find((r) => r.id === sort)!;
  const rows = [...m.ct].sort((a, b) => r0.pct(b) - r0.pct(a));
  return (
    <div className="grid grid-cols-[1fr_320px] gap-5">
      <Card className="p-0">
        <div className="grid grid-cols-[180px_repeat(4,1fr)] items-center gap-4 border-b border-line px-6 py-3 text-caption text-mute"><span>컨테이너</span>{RES.map((r) => <button key={r.id} type="button" onClick={() => setSort(r.id)} className={cn("-mx-2 rounded-[6px] px-2 py-1 text-start interactive", sort === r.id && "text-text")}>{r.label}{sort === r.id && " ↓"}</button>)}</div>
        <div className="divide-y divide-line px-6">{rows.map((c) => <div key={c.name} className="grid grid-cols-[180px_repeat(4,1fr)] items-center gap-4 py-3"><ListRow lead={<Tile size="sm">{c.name[0].toUpperCase()}</Tile>} title={c.name} sub={c.stack} />{RES.map((r) => <div key={r.id}><div className="flex items-baseline justify-between"><span className="font-mono text-body tabular-nums text-text">{r.unit(c)}</span></div><Progress value={r.pct(c)} tone={r.tone(c)} className="mt-1 [&>div:first-child]:hidden" /></div>)}</div>)}</div>
      </Card>
      <div className="flex flex-col gap-5">{RES.map((r) => { const h = hostOf(m.h, r.id); return <Card key={r.id} className="p-4"><div className="flex items-baseline justify-between"><span className="text-body text-mute">{r.label}</span><span className="font-mono text-body tabular-nums text-text">{h.value}</span></div><div className="mt-2 ps-8"><AreaChart series={h.series} max={h.max} height={48} format={h.fmt} /></div></Card>; })}</div>
    </div>
  );
}

/** V4 — 시계열 4장 위, 아래는 컨테이너 × 리소스 히트맵(칸 색이 곧 사용량). 가장 압축된 한눈. */
function V4({ m }: { m: Metrics }) {
  const heat = (p: number) => p > 80 ? "bg-bad text-white" : p > 50 ? "bg-warn text-ink" : p > 20 ? "bg-accent text-white" : "bg-card-2 text-text";
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-5">{RES.map((r) => { const h = hostOf(m.h, r.id); return <Card key={r.id}><p className="text-body text-mute">{r.label}</p><p className="mt-1 text-title tabular-nums text-text">{h.value}<span className="ms-2 text-caption text-mute">{h.sub}</span></p><div className="mt-3 ps-8"><AreaChart series={h.series} max={h.max} height={72} format={h.fmt} /></div></Card>; })}</div>
      <Card title="컨테이너 × 리소스" subtitle="칸 색 = 사용량 — 회색 20% 미만 · 파랑 · 주황 50% · 빨강 80%">
        <div className="grid grid-cols-[180px_repeat(4,1fr)] gap-2">
          <span />{RES.map((r) => <span key={r.id} className="text-center text-caption text-mute">{r.label}</span>)}
          {m.ct.map((c) => <><ListRow key={c.name} lead={<Tile size="sm">{c.name[0].toUpperCase()}</Tile>} title={c.name} sub={c.stack} />{RES.map((r) => { const p = r.pct(c); return <div key={r.id} className={cn("flex h-12 items-center justify-center rounded-[8px] font-mono text-body tabular-nums tint", heat(p))}>{r.unit(c)}</div>; })}</>)}
        </div>
      </Card>
    </div>
  );
}

export function Lab() {
  const [live, setLive] = useState(true);
  const m = useLive(live);
  return (
    <AppShell>
      <PageHeading crumbs={[{ label: "캔버스", href: "#" }, { label: "Lab" }]} title="리소스" meta={<><IconText icon="insight">한눈에 — 네 리소스와 누가 많이 쓰는지가 한 화면에. 경우의 수 넷</IconText><span className="inline-flex items-center gap-2 text-body text-mute"><Dot tone="progress" pulse={live} />{live ? `실시간 흉내 · 1초 · ${m.tick}번째` : "멈춤"}</span></>} actions={<Switch checked={live} onCheckedChange={setLive} label="실시간" boxed />} />
      <div className="mt-8">
        <Option id="v1" title="V1 · 2×2 사분면" from="Netdata 의 리소스별 섹션을 사분면으로 압축" fit="리소스마다 '값 · 추세 · 누가' 를 같은 칸에서 읽고 싶을 때"><V1 m={m} /></Option>
        <Option id="v2" title="V2 · 가로 띠 4단" from="활성 상태 보기 아래 패널을 리소스마다 한 줄로" fit="시계열을 넓게 보고 싶을 때. 위아래로 훑는다"><V2 m={m} /></Option>
        <Option id="v3" title="V3 · 매트릭스 + 시계열 스택" from="Portainer 의 컨테이너 표 + Grafana 의 미니 그래프 열" fit="'누가' 가 먼저고 정렬해서 보고 싶을 때. 열 머리를 누르면 정렬"><V3 m={m} /></Option>
        <Option id="v4" title="V4 · 시계열 4장 + 히트맵" from="Grafana 상단 KPI 줄 + Datadog 호스트맵의 색 칸" fit="가장 압축된 한눈. 색으로 문제 컨테이너가 튀어 보인다"><V4 m={m} /></Option>
      </div>
      <Container className="mt-16 px-0"><Card title="추천"><KeyValue items={[{ label: "한눈", value: "V4 — 시계열 4장으로 '지금·추세' 를, 히트맵으로 '누가' 를. 800 안에 다 들어온다" }, { label: "파고들기", value: "히트맵 칸을 누르면 위의 탭형(정렬된 목록 + 합계)으로. 두 화면이 한 쌍" }, { label: "새 API", value: "컨테이너별 디스크 r/w·네트워크 rx/tx(docker stats) · 가동시간·재시작 · 시계열 샘플" }]} /></Card></Container>
    </AppShell>
  );
}
