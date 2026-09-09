import { AreaChart, AppShell, Card, cn, Dot, Switch, IconText, PageHeading, Progress, SectionHeading } from "@/ui";
import { createContext, useContext, useEffect, useRef, useState } from "react";

// Lab — 결정 전 후보를 실제 크기로 나란히 본다. 여기 있는 것은 아직 키트가 아니다. 선택되면 유기체/템플릿으로 옮긴다.
const rnd = (seed: number) => { let x = seed; return () => { x = (x * 9301 + 49297) % 233280; return x / 233280; }; };
const walk = (seed: number, n: number, base: number, amp: number) => { const r = rnd(seed); let v = base; return Array.from({ length: n }, () => { v = Math.max(0, v + (r() - 0.5) * amp); return Math.round(v * 10) / 10; }); };
type Ct = { name: string; stack: string; cpu: number; mem: number; memLimit: number; uptime: string; restarts: number; status: string; spark: number[]; memSpark: number[]; ioSpark: number[]; netSpark: number[]; wr: number; rd: number; wrRate: number; rdRate: number; vol: number; rx: number; tx: number; rxRate: number; txRate: number };
type Metrics = { h: { cpu: number[]; mem: number[]; disk: number[]; net_in: number[]; net_out: number[] }; ct: Ct[]; tick: number };
const seed = (): Metrics => ({
  h: { cpu: walk(1, 90, 22, 4), mem: walk(2, 90, 6.1, 0.2), disk: walk(3, 90, 212, 0.1), net_in: walk(4, 90, 12, 4), net_out: walk(5, 90, 10, 3) },
  ct: [
    { name: "api", ioSpark: walk(31, 90, 1.3, 0.65), netSpark: walk(41, 90, 8, 4.0), stack: "dockerfile", cpu: 12, mem: 1.4, memLimit: 2, uptime: "6일 4시간", restarts: 0, status: "running", spark: walk(11, 90, 12, 6), memSpark: walk(21, 90, 1.4, 0.2), wr: 3.7, rd: 254.9, wrRate: 0.2, rdRate: 1.1, vol: 12, rx: 18.6, tx: 90.2, rxRate: 6, txRate: 2 },
    { name: "blog", ioSpark: walk(32, 90, 0.1, 0.1), netSpark: walk(42, 90, 4, 2.0), stack: "static", cpu: 1, mem: 0.1, memLimit: 0.5, uptime: "14일", restarts: 0, status: "running", spark: walk(12, 90, 1, 1), memSpark: walk(22, 90, 0.1, 0.02), wr: 0, rd: 15.4, wrRate: 0, rdRate: 0.1, vol: 0.4, rx: 2.1, tx: 40.5, rxRate: 1, txRate: 3 },
    { name: "worker", ioSpark: walk(33, 90, 5.1, 2.55), netSpark: walk(43, 90, 0.5, 0.2), stack: "node", cpu: 34, mem: 2.9, memLimit: 3, uptime: "3시간", restarts: 3, status: "running", spark: walk(13, 90, 30, 14), memSpark: walk(23, 90, 2.9, 0.3), wr: 108.7, rd: 7.1, wrRate: 4.8, rdRate: 0.3, vol: 38, rx: 0.9, tx: 0.3, rxRate: 0.4, txRate: 0.1 },
    { name: "postgres", ioSpark: walk(34, 90, 2.1, 1.05), netSpark: walk(44, 90, 1.5, 0.75), stack: "db", cpu: 4, mem: 0.9, memLimit: 2, uptime: "14일", restarts: 0, status: "running", spark: walk(14, 90, 4, 2), memSpark: walk(24, 90, 0.9, 0.1), wr: 90.3, rd: 18.6, wrRate: 1.6, rdRate: 0.5, vol: 46, rx: 4.2, tx: 3.9, rxRate: 0.8, txRate: 0.7 },
    { name: "edge", ioSpark: walk(35, 90, 0.2, 0.1), netSpark: walk(45, 90, 23, 11.5), stack: "caddy", cpu: 2, mem: 0.2, memLimit: 0.5, uptime: "14일", restarts: 0, status: "running", spark: walk(15, 90, 2, 1), memSpark: walk(25, 90, 0.2, 0.03), wr: 0.7, rd: 140.8, wrRate: 0, rdRate: 0.2, vol: 0.1, rx: 176, tx: 142, rxRate: 12, txRate: 11 },
  ],
  tick: 0,
});
// 실제처럼 — 랜덤 워크가 아니라 원인이 있는 움직임. 트래픽(느린 파도 + 간헐 버스트)이 api·edge·postgres 를 끌고, worker 는 주기 작업으로 치솟았다 내려오고(메모리 톱니), 호스트는 컨테이너 합에 바탕을 더한 값. 표시값은 EMA 로 부드럽게.
type Sim = { t: number; burst: number; job: number; jobLeft: number; nextJob: number; drift: number };
let sim: Sim = { t: 0, burst: 0, job: 0, jobLeft: 0, nextJob: 40, drift: 0 };
const rnd2 = rnd(4242);
const ema = (prev: number, next: number, a = 0.35) => Math.round((prev + (next - prev) * a) * 100) / 100;
const step = (m: Metrics): Metrics => {
  const t = sim.t + 1;
  // 트래픽: 느린 파도(주기 240s) + 간헐 버스트(지수 감쇠)
  if (rnd2() < 0.04) sim.burst += 8 + rnd2() * 14;
  sim.burst *= 0.82;
  const traffic = 10 + 6 * Math.sin(t / 38) + 3 * Math.sin(t / 11) + sim.burst; // Mb/s 느낌
  // worker 주기 작업: 40~70초마다 8~14초 동안 60~90%
  if (sim.jobLeft > 0) { sim.jobLeft -= 1; sim.job = Math.min(1, sim.job + 0.35); } else { sim.job = Math.max(0, sim.job - 0.25); if (t >= sim.nextJob) { sim.jobLeft = 8 + Math.round(rnd2() * 6); sim.nextJob = t + 40 + Math.round(rnd2() * 30); } }
  sim.drift = Math.min(1, sim.drift + (sim.jobLeft > 0 ? 0.03 : -0.02)); // worker 메모리 톱니
  const noise = (k: number) => (rnd2() - 0.5) * k;
  const push = (a: number[], v: number) => [...a.slice(1), v];
  const target: Record<string, Partial<Ct>> = {
    api: { cpu: 5 + traffic * 0.7 + noise(1.5), mem: 1.25 + traffic * 0.012, rxRate: traffic * 0.45, txRate: traffic * 0.9, wrRate: 0.15 + traffic * 0.01, rdRate: 0.4 + traffic * 0.05 },
    blog: { cpu: 0.8 + noise(0.4), mem: 0.1, rxRate: 0.4 + traffic * 0.05, txRate: 1.5 + traffic * 0.2, wrRate: 0, rdRate: 0.05 + traffic * 0.01 },
    worker: { cpu: 3 + sim.job * (62 + noise(12)), mem: 1.6 + sim.drift * 1.3, rxRate: 0.3, txRate: 0.1, wrRate: 0.3 + sim.job * 6, rdRate: 0.2 + sim.job * 1.5 },
    postgres: { cpu: 2 + traffic * 0.15 + sim.job * 4, mem: 0.85 + traffic * 0.004, rxRate: 0.3 + traffic * 0.08, txRate: 0.3 + traffic * 0.08, wrRate: 0.4 + traffic * 0.06 + sim.job * 1.2, rdRate: 0.3 + traffic * 0.04 },
    edge: { cpu: 1.5 + traffic * 0.06, mem: 0.2, rxRate: traffic * 1.0, txRate: traffic * 0.9, wrRate: 0.02, rdRate: 0.05 },
  };
  const ct = m.ct.map((c) => {
    const g = target[c.name] as Required<Pick<Ct, "cpu" | "mem" | "rxRate" | "txRate" | "wrRate" | "rdRate">>;
    const cpu = Math.min(100, ema(c.cpu, g.cpu)), mem = Math.min(c.memLimit, ema(c.mem, g.mem, 0.2)), rxRate = ema(c.rxRate, g.rxRate), txRate = ema(c.txRate, g.txRate), wrRate = ema(c.wrRate, g.wrRate), rdRate = ema(c.rdRate, g.rdRate);
    return { ...c, cpu, mem, rxRate, txRate, wrRate, rdRate, spark: push(c.spark, cpu), memSpark: push(c.memSpark, mem), ioSpark: push(c.ioSpark, Math.round((wrRate + rdRate) * 10) / 10), netSpark: push(c.netSpark, Math.round((rxRate + txRate) * 10) / 10), wr: Math.round((c.wr + wrRate / 1024) * 100) / 100, rd: Math.round((c.rd + rdRate / 1024) * 100) / 100, rx: Math.round((c.rx + rxRate / 8 / 1024) * 1000) / 1000, tx: Math.round((c.tx + txRate / 8 / 1024) * 1000) / 1000 };
  });
  const sum = (f: (c: Ct) => number) => ct.reduce((a, c) => a + f(c), 0);
  const cpu = Math.min(100, Math.round(ema(last(m.h.cpu), sum((c) => c.cpu) * 0.55 + 4 + noise(1.2))));
  const mem = Math.round((sum((c) => c.mem) + 0.6) * 10) / 10;
  const disk = Math.round((last(m.h.disk) + 0.004 + (sim.jobLeft > 0 ? 0.01 : 0)) * 100) / 100; // 천천히 찬다
  sim.t = t;
  return { tick: m.tick + 1, ct, h: { cpu: push(m.h.cpu, cpu), mem: push(m.h.mem, mem), disk: push(m.h.disk, disk), net_in: push(m.h.net_in, Math.round(sum((c) => c.rxRate) * 10) / 10), net_out: push(m.h.net_out, Math.round(sum((c) => c.txRate) * 10) / 10) } };
};
const last = (a: number[]) => a[a.length - 1];
function useLive(on: boolean) {
  const [m, setM] = useState<Metrics>(() => { let x = seed(); for (let i = 0; i < 90; i += 1) x = step(x); return x; });
  const timer = useRef<number>(0);
  useEffect(() => { if (!on) return; timer.current = window.setInterval(() => setM(step), 1000); return () => window.clearInterval(timer.current); }, [on]);
  return m;
}

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
const RES: { id: Res; label: string; unit: (c: Ct) => string; raw: (c: Ct) => number; pct: (c: Ct) => number; tone: (c: Ct) => "accent" | "good" | "warn" | "bad" }[] = [
  { id: "cpu", label: "CPU", unit: (c) => `${Math.round(c.cpu)}%`, raw: (c) => c.cpu, pct: (c) => c.cpu, tone: (c) => (c.cpu > 30 ? "warn" : "accent") },
  { id: "mem", label: "메모리", unit: (c) => `${c.mem.toFixed(1)} GB`, raw: (c) => c.mem, pct: (c) => (c.mem / c.memLimit) * 100, tone: (c) => (c.mem / c.memLimit > 0.9 ? "bad" : "good") },
  { id: "disk", label: "디스크", unit: (c) => `${(c.wrRate + c.rdRate).toFixed(1)} MB/s`, raw: (c) => c.wrRate + c.rdRate, pct: (c) => Math.min(100, (c.wrRate + c.rdRate) * 5), tone: () => "accent" },
  { id: "net", label: "네트워크", unit: (c) => `${(c.rxRate + c.txRate).toFixed(1)} Mb/s`, raw: (c) => c.rxRate + c.txRate, pct: (c) => Math.min(100, (c.rxRate + c.txRate) * 2), tone: () => "good" },
];
const CHART = ["var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]; // 컨테이너 색 넷 — 전체(accent)와 겹치지 않게 chart-1 은 안 쓴다
const colorOfCt = (m: Metrics, name: string) => CHART[m.ct.findIndex((c) => c.name === name) % CHART.length];
const sparkOf = (c: Ct, id: Res) => ({ cpu: c.spark, mem: c.memSpark, disk: c.ioSpark, net: c.netSpark }[id]);
const SplitCtx = createContext(false);
const hostOf = (H: Metrics["h"], id: Res) => ({
  cpu: { value: `${Math.round(last(H.cpu))}%`, sub: "8 코어", series: [{ name: "호스트", points: H.cpu, tone: "accent" as const }], total: H.cpu, max: 100, pct: last(H.cpu), tv: `${Math.round(last(H.cpu))}%`, fmt: (v: number) => `${v}%` },
  mem: { value: `${last(H.mem).toFixed(1)} GB`, sub: "16 GB 중", series: [{ name: "사용", points: H.mem, tone: "info" as const }], total: H.mem, max: 16, pct: (last(H.mem) / 16) * 100, tv: `${last(H.mem).toFixed(1)} GB`, fmt: (v: number) => `${v}G` },
  disk: { value: `${Math.round(last(H.disk))} GB`, sub: "512 GB 중", series: [{ name: "읽기", points: H.net_out.map((v) => v / 6), tone: "info" as const }, { name: "쓰기", points: H.net_in.map((v) => v / 9), tone: "warn" as const }], total: H.net_out.map((v, i) => Math.round((v / 6 + H.net_in[i] / 9) * 10) / 10), max: undefined, pct: Math.min(100, (last(H.net_out) / 6 + last(H.net_in) / 9) * 5), tv: `${(last(H.net_out) / 6 + last(H.net_in) / 9).toFixed(1)} MB/s`, fmt: (v: number) => `${v}M` },
  net: { value: `↓${Math.round(last(H.net_in))} ↑${Math.round(last(H.net_out))}`, sub: "Mb/s", series: [{ name: "받음", points: H.net_in, tone: "good" as const }, { name: "보냄", points: H.net_out, tone: "accent" as const }], total: H.net_in.map((v, i) => Math.round((v + H.net_out[i]) * 10) / 10), max: undefined, pct: Math.min(100, last(H.net_in) + last(H.net_out)), tv: `${Math.round(last(H.net_in) + last(H.net_out))} Mb/s`, fmt: (v: number) => `${v}` },
}[id]);
const topOf = (CT: Ct[], r: (typeof RES)[number], n = 3) => [...CT].sort((a, b) => r.pct(b) - r.pct(a)).slice(0, n);

/** 띠 크기 규격 — 간격·여백·글자·그래프 높이 한 벌. 여섯 벌을 Lab 에 나란히 놓고 고른다(사용자 요청 2026-09-09). */
type Size = { pad: string; gap: string; cols: string; chart: number; label: string; value: string; row: string; dot: string; rows: string; after: string; head?: boolean; cards?: boolean };
const SIZES = {
  base:  { pad: "px-6 py-5", gap: "gap-8",  cols: "grid-cols-[160px_1fr_260px]", chart: 64, label: "text-body",    value: "text-title",           row: "text-[11px] leading-4", dot: "size-1.5", rows: "space-y-0.5", after: "mt-2.5" },
  tight: { pad: "px-5 py-4", gap: "gap-6",  cols: "grid-cols-[128px_1fr_220px]", chart: 48, label: "text-caption", value: "text-body-lg font-medium", row: "text-[11px] leading-4", dot: "size-1.5", rows: "space-y-0", after: "mt-2" },
  roomy: { pad: "px-7 py-7", gap: "gap-10", cols: "grid-cols-[176px_1fr_288px]", chart: 88, label: "text-body",    value: "text-title-lg",        row: "text-caption",          dot: "size-2",   rows: "space-y-1",   after: "mt-3" },
  chart: { pad: "px-6 py-5", gap: "gap-6",  cols: "grid-cols-[112px_1fr_200px]", chart: 72, label: "text-caption", value: "text-title",           row: "text-[11px] leading-4", dot: "size-1.5", rows: "space-y-0.5", after: "mt-2.5" },
  head:  { pad: "px-6 py-5", gap: "gap-8",  cols: "grid-cols-[1fr_240px]",       chart: 56, label: "text-body",    value: "text-title",           row: "text-[11px] leading-4", dot: "size-1.5", rows: "space-y-0.5", after: "mt-2.5", head: true },
  cards: { pad: "p-6",       gap: "gap-8",  cols: "grid-cols-[160px_1fr_260px]", chart: 64, label: "text-body",    value: "text-title",           row: "text-[11px] leading-4", dot: "size-1.5", rows: "space-y-0.5", after: "mt-2.5", cards: true },
} satisfies Record<string, Size>;
type SizeId = keyof typeof SIZES;

/** 리소스 띠 — 요약 한 줄: 이름·값 · 시계열 · 오른쪽 쌓은 띠 + 정렬된 행(전체·상위 3). 오른쪽이 곧 범례다(그래프 아래 범례 없음). 사용자 선택 2026-09-09: V2-3-c. */
function Band({ m, r, sz = "base" }: { m: Metrics; r: (typeof RES)[number]; sz?: SizeId }) {
  const z: Size = SIZES[sz];
  const h = hostOf(m.h, r.id);
  const split = useContext(SplitCtx);
  const top = topOf(m.ct, r);
  // 컨테이너별 — 합계는 accent 면으로 남기고, 상위 3 은 각자 색의 선으로 얹는다(면 없음). 색은 오른쪽 막대와 같다.
  const n = h.series[0].points.length;
  const series = split
    ? [{ name: "전체", points: h.total, tone: "accent" as const }, ...top.map((c) => ({ name: c.name, points: sparkOf(c, r.id).concat(sparkOf(c, r.id)).slice(-n), color: colorOfCt(m, c.name), fill: false }))]
    : h.series;
  const all = m.ct.reduce((a, c) => a + r.raw(c), 0) || 1; // 컨테이너 합 — 몫(share)의 분모
  const share = (c: Ct) => (h.pct * r.raw(c)) / all; // 전체 막대 안에서 이 컨테이너가 차지하는 폭
  const ACC = "var(--accent)";
  const rest = Math.max(0, h.pct - top.reduce((a, c) => a + share(c), 0)); // 상위 3 밖의 나머지 사용량
  const row = (name: string, color: string, value: string, strong?: boolean) => (
    <div key={name} className={cn("grid grid-cols-[auto_1fr_auto] items-center gap-2", z.row)}><span className={cn("rounded-full", z.dot)} style={{ background: color }} /><span className={strong ? "text-text" : "text-sub"}>{name}</span><span className={cn("font-mono tabular-nums", strong ? "text-text" : "text-mute")}>{value}</span></div>
  );
  const side = !split
    ? <div className="space-y-1.5">{top.map((c) => <div key={c.name} className="grid grid-cols-[80px_1fr_80px] items-center gap-2"><span className="truncate text-caption text-text">{c.name}</span><Progress value={r.pct(c)} tone={r.tone(c)} className="[&>div:first-child]:hidden" /><span className="text-end font-mono text-caption tabular-nums text-mute">{r.unit(c)}</span></div>)}</div>
    : <div>
        <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-card-3">{top.map((c) => <span key={c.name} className="h-full rounded-full move" style={{ width: `${share(c)}%`, background: colorOfCt(m, c.name) }} />)}<span className="h-full rounded-full move" style={{ width: `${rest}%`, background: ACC, opacity: 0.35 }} /></div>
        <div className={cn(z.after, z.rows)}>{row("전체", ACC, h.tv, true)}{top.map((c) => row(c.name, colorOfCt(m, c.name), r.unit(c)))}</div>
      </div>;
  const head = z.head
    ? <div className="flex items-baseline gap-3"><span className={cn(z.label, "text-mute")}>{r.label}</span><span className={cn(z.value, "tabular-nums text-text")}>{h.value}</span><span className="text-caption text-mute">{h.sub}</span></div>
    : <div><p className={cn(z.label, "text-mute")}>{r.label}</p><p className={cn("mt-1 tabular-nums text-text", z.value)}>{h.value}</p><p className="text-caption text-mute">{h.sub}</p></div>;
  const chart = <div className="ps-8"><AreaChart series={series} max={h.max} height={z.chart} format={h.fmt} legend={!split} /></div>;
  return (
    <div className={cn("grid items-center", z.gap, z.cols)}>
      {z.head ? <div className="space-y-3">{head}{chart}</div> : <>{head}{chart}</>}
      {side}
    </div>
  );
}

/** V2 — 띠 넷. 한 카드에 line 으로 나누거나(기본) 카드 넷으로. */
function V2({ m, sz = "base" }: { m: Metrics; sz?: SizeId }) {
  const z: Size = SIZES[sz];
  return z.cards
    ? <div className="grid gap-5">{RES.map((r) => <Card key={r.id} className={z.pad}><Band m={m} r={r} sz={sz} /></Card>)}</div>
    : <Card className="divide-y divide-line p-0">{RES.map((r) => <div key={r.id} className={z.pad}><Band m={m} r={r} sz={sz} /></div>)}</Card>;
}

export function Lab() {
  const [live, setLive] = useState(true);
  const [split, setSplit] = useState(true);
  const m = useLive(live);
  return (
    <SplitCtx.Provider value={split}>
    <AppShell>
      <PageHeading crumbs={[{ label: "캔버스", href: "#" }, { label: "Lab" }]} title="리소스" meta={<><IconText icon="insight">가로 띠 4단 — 크기 규격 여섯</IconText><span className="inline-flex items-center gap-2 text-body text-mute"><Dot tone="progress" pulse={live} />{live ? `실시간 흉내 · 1초 · ${m.tick}번째` : "멈춤"}</span></>} actions={<><Switch checked={split} onCheckedChange={setSplit} label="컨테이너별" boxed /><Switch checked={live} onCheckedChange={setLive} label="실시간" boxed /></>} />
      <div className="mt-8">
        <Option id="v2" title="S1 · 기준" from="띠 안쪽 24/20 · 열 사이 32 · 이름 160 / 그래프 / 오른쪽 260 · 그래프 64 · 값 22 · 행 11/16" fit="지금 것. 카드 규격(안쪽 24)과 같은 호흡"><V2 m={m} /></Option>
        <Option id="v2t" title="S2 · 촘촘" from="안쪽 20/16 · 열 사이 24 · 128 / 그래프 / 220 · 그래프 48 · 값 17 · 행 11/16 붙임" fit="넷이 한 화면 위쪽에 들어가야 할 때. 아래에 다른 카드가 이어질 홈"><V2 m={m} sz="tight" /></Option>
        <Option id="v2r" title="S3 · 여유" from="안쪽 28 · 열 사이 40 · 176 / 그래프 / 288 · 그래프 88(눈금 3) · 값 26 · 행 13 + 점 8" fit="리소스 화면이 이 카드 하나일 때. 큰 숫자가 주인공"><V2 m={m} sz="roomy" /></Option>
        <Option id="v2c" title="S4 · 그래프 우선" from="이름 112 · 오른쪽 200 으로 좁혀 그래프에 폭을 주고 높이 72" fit="파형이 정보일 때. 이름·값은 caption 으로 물러난다"><V2 m={m} sz="chart" /></Option>
        <Option id="v2h" title="S5 · 머리 한 줄" from="이름·값·부연을 그래프 위 한 줄로. 열은 둘(그래프 / 오른쪽 240) · 그래프 56" fit="폭이 좁아질 때(1024 이하)도 같은 구조. 세로는 S1 과 비슷"><V2 m={m} sz="head" /></Option>
        <Option id="v2k" title="S6 · 카드 넷" from="line 대신 카드 넷(안쪽 24, 사이 20). 나머지는 S1" fit="리소스마다 독립 카드로 보이게. 다른 카드와 격자로 섞일 때"><V2 m={m} sz="cards" /></Option>
      </div>
    </AppShell>
    </SplitCtx.Provider>
  );
}
