import { Accordion, AreaChart, AppShell, Card, cn, Container, Dot, FilterTabs, Meter, Sheet, Sparkline, Switch, IconText, KeyValue, ListRow, PageHeading, Progress, SectionHeading, Tile } from "@/ui";
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
const fmtGB = (v: number) => v >= 1024 ? `${(v / 1024).toFixed(2)} TB` : v >= 1 ? `${v.toFixed(1)} GB` : `${Math.round(v * 1024)} MB`;
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

/** 리소스 띠 — 요약 한 줄: 이름·값 · 시계열 · 오른쪽 막대. 오른쪽이 곧 범례다(그래프 아래 범례 없음). `bars` 로 막대 방식을 고른다. */
type Bars = "rows" | "share" | "stack" | "stack-thick" | "stack-two" | "stack-rows" | "stack-col" | "columns";
function Band({ m, r, dense, bars = "rows" }: { m: Metrics; r: (typeof RES)[number]; dense?: boolean; bars?: Bars }) {
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
  const Stack = ({ h: hh }: { h: string }) => <div className={cn("flex gap-0.5 overflow-hidden rounded-full bg-card-3", hh)}>{top.map((c) => <span key={c.name} className="h-full rounded-full move" style={{ width: `${share(c)}%`, background: colorOfCt(m, c.name) }} />)}<span className="h-full rounded-full move" style={{ width: `${rest}%`, background: ACC, opacity: 0.35 }} /></div>;
  const Row = ({ name, color, pct, value, strong }: { name: string; color?: string; pct: number; value: string; strong?: boolean }) => (
    <div className="grid grid-cols-[80px_1fr_80px] items-center gap-2">
      <span className={cn("flex items-center gap-2 truncate text-caption", strong ? "text-text" : "text-sub")}>{color && <span className="size-2 shrink-0 rounded-full" style={{ background: color }} />}{name}</span>
      <Progress value={pct} color={color} tone={color ? undefined : "accent"} className="[&>div:first-child]:hidden" />
      <span className={cn("text-end font-mono text-caption tabular-nums", strong ? "text-text" : "text-mute")}>{value}</span>
    </div>
  );
  const side = !split
    ? <div className="space-y-1.5">{top.map((c) => <div key={c.name} className="grid grid-cols-[80px_1fr_80px] items-center gap-2"><span className="truncate text-caption text-text">{c.name}</span><Progress value={r.pct(c)} tone={r.tone(c)} className="[&>div:first-child]:hidden" /><span className="text-end font-mono text-caption tabular-nums text-mute">{r.unit(c)}</span></div>)}</div>
    : bars === "rows"
    ? <div className="space-y-1.5"><Row name="전체" color={ACC} pct={h.pct} value={h.tv} strong />{top.map((c) => <Row key={c.name} name={c.name} color={colorOfCt(m, c.name)} pct={r.pct(c)} value={r.unit(c)} />)}</div>
    : bars === "share"
    ? <div className="space-y-1.5"><Row name="전체" color={ACC} pct={h.pct} value={h.tv} strong />{top.map((c) => <Row key={c.name} name={c.name} color={colorOfCt(m, c.name)} pct={share(c)} value={`${Math.round((r.raw(c) / all) * 100)}%`} />)}</div>
    : bars === "stack"
    ? <div>
        <div className="mb-2 flex items-center justify-between text-caption"><span className="text-text">전체</span><span className="font-mono tabular-nums text-text">{h.tv}</span></div>
        <Stack h="h-2" />
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">{top.map((c) => <span key={c.name} className="inline-flex items-center gap-2 whitespace-nowrap text-caption text-mute"><span className="size-2 rounded-full" style={{ background: colorOfCt(m, c.name) }} />{c.name} <span className="font-mono tabular-nums text-text">{r.unit(c)}</span></span>)}</div>
      </div>
    : bars === "stack-thick"
    ? <div>
        <div className="mb-2 flex items-center justify-between text-caption"><span className="text-text">전체</span><span className="font-mono tabular-nums text-text">{h.tv}</span></div>
        <div className="flex h-6 gap-0.5 overflow-hidden rounded-[6px] bg-card-3">{top.map((c) => <span key={c.name} className="flex h-full items-center overflow-hidden rounded-[6px] px-1.5 text-[11px] text-ink move" style={{ width: `${share(c)}%`, background: colorOfCt(m, c.name) }}>{share(c) > 14 && <span className="truncate">{c.name}</span>}</span>)}<span className="h-full rounded-[6px] move" style={{ width: `${rest}%`, background: ACC, opacity: 0.35 }} /></div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">{top.filter((c) => share(c) <= 14).map((c) => <span key={c.name} className="inline-flex items-center gap-2 whitespace-nowrap text-caption text-mute"><span className="size-2 rounded-full" style={{ background: colorOfCt(m, c.name) }} />{c.name}</span>)}</div>
      </div>
    : bars === "stack-two"
    ? <div className="space-y-3">
        <div>
          <div className="mb-2 flex items-center justify-between text-caption"><span className="text-text">얼마나</span><span className="font-mono tabular-nums text-text">{h.tv}</span></div>
          <div className="flex h-2 overflow-hidden rounded-full bg-card-3"><span className="h-full rounded-full move" style={{ width: `${h.pct}%`, background: ACC }} /></div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between text-caption"><span className="text-text">누가</span><span className="font-mono tabular-nums text-mute">상위 3 · {Math.round((top.reduce((a, c) => a + r.raw(c), 0) / all) * 100)}%</span></div>
          <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-card-3">{top.map((c) => <span key={c.name} className="h-full rounded-full move" style={{ width: `${(r.raw(c) / all) * 100}%`, background: colorOfCt(m, c.name) }} />)}</div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">{top.map((c) => <span key={c.name} className="inline-flex items-center gap-2 whitespace-nowrap text-caption text-mute"><span className="size-2 rounded-full" style={{ background: colorOfCt(m, c.name) }} />{c.name} <span className="font-mono tabular-nums text-text">{Math.round((r.raw(c) / all) * 100)}%</span></span>)}</div>
        </div>
      </div>
    : bars === "stack-rows"
    ? <div>
        <Stack h="h-2" />
        <div className="mt-3 space-y-1">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 text-caption"><span className="size-2 rounded-full" style={{ background: ACC }} /><span className="text-text">전체</span><span className="font-mono tabular-nums text-text">{h.tv}</span></div>
          {top.map((c) => <div key={c.name} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 text-caption"><span className="size-2 rounded-full" style={{ background: colorOfCt(m, c.name) }} /><span className="text-sub">{c.name}</span><span className="font-mono tabular-nums text-mute">{r.unit(c)}</span></div>)}
        </div>
      </div>
    : bars === "stack-col"
    ? <div className="flex items-stretch gap-4">
        <div className="flex h-16 w-3 flex-col-reverse gap-0.5 overflow-hidden rounded-[4px] bg-card-3">{top.map((c) => <span key={c.name} className="w-full rounded-[3px] move" style={{ height: `${share(c)}%`, background: colorOfCt(m, c.name) }} />)}<span className="w-full rounded-[3px] move" style={{ height: `${rest}%`, background: ACC, opacity: 0.35 }} /></div>
        <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
          <div className="flex items-center justify-between gap-2 text-caption"><span className="text-text">전체</span><span className="font-mono tabular-nums text-text">{h.tv}</span></div>
          {top.map((c) => <div key={c.name} className="flex items-center justify-between gap-2 text-caption"><span className="inline-flex items-center gap-2 truncate text-sub"><span className="size-2 shrink-0 rounded-full" style={{ background: colorOfCt(m, c.name) }} />{c.name}</span><span className="font-mono tabular-nums text-mute">{r.unit(c)}</span></div>)}
        </div>
      </div>
    : <div className="grid grid-cols-4 gap-3">{[{ name: "전체", color: ACC, pct: h.pct, value: h.tv.split(" ")[0], strong: true }, ...top.map((c) => ({ name: c.name, color: colorOfCt(m, c.name), pct: r.pct(c), value: r.unit(c).split(" ")[0], strong: false }))].map((x) => (
        <div key={x.name} className="flex flex-col items-center gap-1.5">
          <span className={cn("whitespace-nowrap font-mono text-[11px] tabular-nums", x.strong ? "text-text" : "text-mute")}>{x.value}</span>
          <div className="flex h-12 w-full items-end overflow-hidden rounded-[4px] bg-card-3"><span className="w-full rounded-[4px] move" style={{ height: `${x.pct}%`, background: x.color }} /></div>
          <span className={cn("truncate text-caption", x.strong ? "text-text" : "text-sub")}>{x.name}</span>
        </div>))}</div>;
  return (
    <div className={cn("grid items-center gap-8", dense ? "grid-cols-[140px_1fr_240px]" : "grid-cols-[160px_1fr_260px]")}>
      <div><p className="text-body text-mute">{r.label}</p><p className="mt-1 text-title tabular-nums text-text">{h.value}</p><p className="text-caption text-mute">{h.sub}</p></div>
      <div className="ps-8"><AreaChart series={series} max={h.max} height={64} format={h.fmt} legend={!split} /></div>
      {side}
    </div>
  );
}

/** 리소스 세부 — 띠를 펼치면 나오는 것. 큰 시계열(범위) · 리소스마다 다른 분해 · 컨테이너 전체. */
function Detail({ m, r }: { m: Metrics; r: (typeof RES)[number] }) {
  const h = hostOf(m.h, r.id);
  const [range, setRange] = useState("24h");
  const X = range === "1h" ? ["-60m", "-45m", "-30m", "-15m", "지금"] : range === "7d" ? ["월", "화", "수", "목", "금", "토", "일"] : ["00", "03", "06", "09", "12", "15", "18", "21", "24"];
  const rows = [...m.ct].sort((a, b) => r.pct(b) - r.pct(a));
  const cores = Array.from({ length: 8 }, (_, i) => Math.max(2, Math.min(100, Math.round(last(m.h.cpu) + (i % 3 - 1) * 9 + ((i * 7) % 5) * 2))));
  const breakdown: Record<Res, React.ReactNode> = {
    cpu: <div className="grid grid-cols-2 gap-6"><div><p className="mb-3 text-caption text-mute">코어별</p><div className="grid grid-cols-4 gap-x-4 gap-y-3">{cores.map((v, i) => <Progress key={i} label={`#${i}`} value={v} tone={v > 80 ? "bad" : v > 50 ? "warn" : "accent"} />)}</div></div><KeyValue className="grid-cols-[96px_1fr]" items={[{ label: "부하 1·5·15", value: `${(last(m.h.cpu) / 12).toFixed(1)} · 1.6 · 1.4`, mono: true }, { label: "온도", value: "52°C", mono: true }, { label: "스로틀", value: "없음" }, { label: "재시작 24h", value: "3", mono: true }]} /></div>,
    mem: <div className="grid grid-cols-2 gap-6"><Meter label="컨테이너별" total={16} unit="G" parts={m.ct.map((c, i) => ({ label: c.name, value: Math.round(c.mem * 10) / 10, tone: (["info", "idle", "progress", "running", "idle"] as const)[i] }))} /><KeyValue className="grid-cols-[96px_1fr]" items={[{ label: "사용", value: `${last(m.h.mem).toFixed(1)} GB`, mono: true }, { label: "캐시", value: "2.4 GB", mono: true }, { label: "스왑", value: "0 B", mono: true }, { label: "상한 근접", value: m.ct.filter((c) => c.mem / c.memLimit > 0.9).map((c) => c.name).join(", ") || "없음" }]} /></div>,
    disk: <div className="grid grid-cols-2 gap-6"><Meter label="512 GB" total={512} unit="G" parts={[{ label: "이미지", value: 84, tone: "info" }, { label: "볼륨", value: Math.round(last(m.h.disk) - 84 - 32), tone: "running" }, { label: "백업", value: 32, tone: "progress" }]} /><div><p className="mb-3 text-caption text-mute">볼륨</p><div className="space-y-2">{[...m.ct].sort((a, b) => b.vol - a.vol).slice(0, 4).map((c) => <div key={c.name} className="grid grid-cols-[96px_1fr_72px] items-center gap-3"><span className="truncate text-body text-text">{c.name}</span><Progress value={(c.vol / 96) * 100} tone="accent" className="[&>div:first-child]:hidden" /><span className="text-end font-mono text-caption tabular-nums text-mute">{fmtGB(c.vol)}</span></div>)}</div></div></div>,
    net: <div className="grid grid-cols-2 gap-6"><KeyValue className="grid-cols-[96px_1fr]" items={[{ label: "en0", value: `↓${Math.round(last(m.h.net_in))} ↑${Math.round(last(m.h.net_out))} Mb/s`, mono: true }, { label: "docker0", value: "↓4 ↑4 Mb/s", mono: true }, { label: "열린 연결", value: "124", mono: true }, { label: "엣지 요청/초", value: "38", mono: true }]} /><KeyValue className="grid-cols-[96px_1fr]" items={[{ label: "받은 데이터", value: fmtGB(m.ct.reduce((a, c) => a + c.rx, 0)), mono: true }, { label: "보낸 데이터", value: fmtGB(m.ct.reduce((a, c) => a + c.tx, 0)), mono: true }, { label: "터널", value: "cloudflared up" }, { label: "공인 IP", value: "203.0.113.7", mono: true }]} /></div>,
  };
  const cols: Record<Res, (c: Ct) => React.ReactNode[]> = {
    cpu: (c) => [<span className="font-mono tabular-nums text-text">{Math.round(c.cpu)}%</span>, <Sparkline fluid points={c.spark} tone={r.tone(c)} height={24} className="block w-full" />, <IconText icon="clock">{c.uptime}</IconText>],
    mem: (c) => [<span className="font-mono tabular-nums text-text">{c.mem.toFixed(1)} / {c.memLimit} GB</span>, <Progress value={(c.mem / c.memLimit) * 100} tone={r.tone(c)} className="[&>div:first-child]:hidden" />, <IconText icon="clock">{c.uptime}</IconText>],
    disk: (c) => [<span className="font-mono tabular-nums text-text">{fmtGB(c.wr)} 씀</span>, <span className="font-mono tabular-nums text-text">{fmtGB(c.rd)} 읽음</span>, <span className="font-mono tabular-nums text-mute">{(c.wrRate + c.rdRate).toFixed(1)} MB/s</span>],
    net: (c) => [<span className="font-mono tabular-nums text-text">{fmtGB(c.rx)} 받음</span>, <span className="font-mono tabular-nums text-text">{fmtGB(c.tx)} 보냄</span>, <span className="font-mono tabular-nums text-mute">{(c.rxRate + c.txRate).toFixed(1)} Mb/s</span>],
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><span className="text-body text-mute">{r.label} 시계열</span><FilterTabs value={range} onValueChange={setRange} items={[{ value: "1h", label: "1시간" }, { value: "24h", label: "24시간" }, { value: "7d", label: "7일" }]} /></div>
      <div className="ps-8"><AreaChart series={h.series} max={h.max} height={140} format={h.fmt} xLabels={X} /></div>
      {breakdown[r.id]}
      <div><p className="mb-3 text-caption text-mute">컨테이너 전체 · {r.label} 순</p><div className="divide-y divide-line">{rows.map((c) => <div key={c.name} className="grid grid-cols-[200px_1fr_1fr_140px] items-center gap-4 py-2 text-body whitespace-nowrap [&>*:not(:first-child)]:justify-self-end"><ListRow lead={<Tile size="sm">{c.name[0].toUpperCase()}</Tile>} title={c.name} sub={c.stack} />{cols[r.id](c).map((x, i) => <div key={i} className="w-full text-end">{x}</div>)}</div>)}</div></div>
    </div>
  );
}

/** V2 — 띠 넷만. 토글 "컨테이너별" 이 켜지면 각 띠의 그래프에 상위 3 컨테이너가 색 선으로 얹힌다. */
function V2({ m, bars }: { m: Metrics; bars?: Bars }) {
  return <Card className="divide-y divide-line p-0 [&>*]:px-6 [&>*]:py-5">{RES.map((r) => <div key={r.id}><Band m={m} r={r} bars={bars} /></div>)}</Card>;
}

/** V2-a — 행 펼침. 띠를 누르면 그 자리에서 세부가 펼쳐진다(unfold). 한 번에 여러 개 열 수 있다. */
function V2a({ m }: { m: Metrics }) {
  return <Accordion items={RES.map((r) => ({ value: r.id, title: <Band m={m} r={r} dense />, content: <Detail m={m} r={r} /> }))} />;
}

/** V2-b — 오른쪽 서랍. 띠는 그대로 두고 세부는 Sheet 로. 요약을 잃지 않는다. */
function V2b({ m }: { m: Metrics }) {
  const [open, setOpen] = useState<Res | null>(null);
  const r = RES.find((x) => x.id === open);
  return (
    <>
      <Card className="divide-y divide-line p-0 [&>*]:px-6 [&>*]:py-5">{RES.map((r) => <button key={r.id} type="button" onClick={() => setOpen(r.id)} className="block w-full text-start interactive first:rounded-t-card last:rounded-b-card"><Band m={m} r={r} /></button>)}</Card>
      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)} title={r?.label ?? ""} description="세부 — 띠는 뒤에 그대로" wide>{r && <Detail m={m} r={r} />}</Sheet>
    </>
  );
}

/** V2-c — 전체 스위치. '자세히' 하나로 네 띠가 한꺼번에 펼쳐진다. 요약/자세히 두 상태뿐. */
function V2c({ m }: { m: Metrics }) {
  const [more, setMore] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Switch checked={more} onCheckedChange={setMore} label="자세히" boxed /></div>
      <Card className="divide-y divide-line p-0 [&>*]:px-6 [&>*]:py-5">{RES.map((r) => <div key={r.id}><Band m={m} r={r} />{more && <div className="mt-6 rounded-control bg-card-2 p-5 appear surface-2"><Detail m={m} r={r} /></div>}</div>)}</Card>
    </div>
  );
}

/** V2-d — 아래 도킹 패널(활성 상태 보기). 띠를 고르면 아래 고정 패널이 그 세부로 바뀐다. 띠는 항상 넷 다 보인다. */
function V2d({ m }: { m: Metrics }) {
  const [sel, setSel] = useState<Res>("cpu");
  const r = RES.find((x) => x.id === sel)!;
  return (
    <div className="space-y-5">
      <Card className="divide-y divide-line p-0 [&>*]:px-6 [&>*]:py-5">{RES.map((r) => <button key={r.id} type="button" aria-pressed={sel === r.id} onClick={() => setSel(r.id)} className={cn("block w-full text-start interactive first:rounded-t-card last:rounded-b-card", sel === r.id && "bg-card-2 [--card-2:var(--c3)] [--card-3:var(--c4)]")}><Band m={m} r={r} /></button>)}</Card>
      <Card title={r.label} subtitle="선택한 띠의 세부 — 위 띠를 바꾸면 여기가 바뀐다"><Detail m={m} r={r} /></Card>
    </div>
  );
}

export function Lab() {
  const [live, setLive] = useState(true);
  const [split, setSplit] = useState(true);
  const m = useLive(live);
  return (
    <SplitCtx.Provider value={split}>
    <AppShell>
      <PageHeading crumbs={[{ label: "캔버스", href: "#" }, { label: "Lab" }]} title="리소스" meta={<><IconText icon="insight">가로 띠 4단 · 오른쪽 막대 넷 + 세부 드러내기 넷</IconText><span className="inline-flex items-center gap-2 text-body text-mute"><Dot tone="progress" pulse={live} />{live ? `실시간 흉내 · 1초 · ${m.tick}번째` : "멈춤"}</span></>} actions={<><Switch checked={split} onCheckedChange={setSplit} label="컨테이너별" boxed /><Switch checked={live} onCheckedChange={setLive} label="실시간" boxed /></>} />
      <div className="mt-8">
        <Option id="v2" title="V2-1 · 행 막대 — 자기 상한 기준" from="오른쪽이 곧 범례. 전체(accent) 한 줄 + 상위 3, 막대는 각자 상한(코어·메모리 limit) 대비" fit="컨테이너가 자기 한도에 얼마나 붙었나. 상한 근접이 바로 보인다"><V2 m={m} /></Option>
        <Option id="v2s" title="V2-2 · 행 막대 — 전체 기준" from="전체 막대가 자, 컨테이너 막대는 그 안의 몫(share). 값도 %" fit="전체 사용량을 누가 얼마나 가져갔나. 막대 폭이 그대로 기여도"><V2 m={m} bars="share" /></Option>
        <Option id="v2k" title="V2-3 · 쌓은 막대" from="Meter 처럼 한 줄에 상위 3 몫을 쌓고 나머지는 accent 옅게. 아래에 색 점 범례" fit="가장 짧다. 세로 여유가 없을 때, 구성비 한 줄"><V2 m={m} bars="stack" /></Option>
        <Option id="v2k1" title="V2-3-a · 두꺼운 띠 — 안쪽 라벨" from="24px 띠 안에 이름을 쓴다(폭 14% 넘는 칸만). 범례는 못 쓴 칸만" fit="범례 줄이 거의 사라진다. 큰 몫은 띠에서 바로 읽힘"><V2 m={m} bars="stack-thick" /></Option>
        <Option id="v2k2" title="V2-3-b · 두 줄 — 얼마나 · 누가" from="윗줄은 사용/여유(accent), 아랫줄은 컨테이너 구성비 100% 폭" fit="'얼마나' 와 '누가' 를 분리. 구성비가 사용량이 작아도 크게 보인다"><V2 m={m} bars="stack-two" /></Option>
        <Option id="v2k3" title="V2-3-c · 띠 + 정렬된 행" from="띠 아래 전체·상위 3 을 점·이름·값 세로 정렬" fit="값을 세로로 비교. 범례가 줄바꿈으로 흔들리지 않는다"><V2 m={m} bars="stack-rows" /></Option>
        <Option id="v2k4" title="V2-3-d · 세로 기둥 + 목록" from="시계열 높이의 세로 쌓기 기둥 하나 + 옆에 목록" fit="시계열 끝 '지금' 의 단면. 기둥이 그래프와 같은 높이라 눈이 이어진다"><V2 m={m} bars="stack-col" /></Option>
        <Option id="v2v" title="V2-4 · 세로 막대" from="전체 + 상위 3 을 기둥 넷으로, 값은 위·이름은 아래" fit="시계열 옆에 놓였을 때 '지금' 을 세로로 대응. 눈이 옆으로 흐르지 않는다"><V2 m={m} bars="columns" /></Option>
        <Option id="v2a" title="V2-a · 행 펼침" from="아코디언 — 띠가 곧 트리거" fit="궁금한 리소스만 그 자리에서. 여러 개 동시에 열어 비교"><V2a m={m} /></Option>
        <Option id="v2b" title="V2-b · 오른쪽 서랍" from="Sheet — 요약은 뒤에 남는다" fit="요약을 잃지 않고 깊이 볼 때. 서랍 안에서 범위·목록"><V2b m={m} /></Option>
        <Option id="v2c" title="V2-c · 전체 스위치" from="'자세히' 하나로 모두 펼침 — 두 상태" fit="클릭 없이 훑고 싶을 때. 넷을 한 번에 비교"><V2c m={m} /></Option>
        <Option id="v2d" title="V2-d · 아래 도킹 패널" from="활성 상태 보기의 아래 패널 — 선택된 띠가 바뀐다" fit="띠 넷은 항상 보이고 세부는 하나만. 가장 안정된 레이아웃"><V2d m={m} /></Option>
      </div>
      <Container className="mt-16 px-0"><Card title="추천"><KeyValue items={[{ label: "선택", value: "V2-d — 띠 넷은 늘 보이고 세부는 아래 하나. 활성 상태 보기와 같은 손맛, 레이아웃이 흔들리지 않는다" }, { label: "차선", value: "V2-a — 비교가 필요하면 둘을 동시에 펼친다. 대신 화면이 길어진다" }, { label: "새 API", value: "컨테이너별 디스크 r/w·네트워크 rx/tx(docker stats) · 가동시간·재시작 · 시계열 샘플" }]} /></Card></Container>
    </AppShell>
    </SplitCtx.Provider>
  );
}
