import { AppShell, bandParts, Dot, Switch, IconText, PageHeading, ResourceBand, ResourceBands, StorageCard } from "@/ui";
import { createContext, useContext, useEffect, useRef, useState } from "react";

// Lab — 결정 전 후보를 실제 크기로 나란히 본다. 여기 있는 것은 아직 키트가 아니다. 선택되면 유기체/템플릿으로 옮긴다.
const rnd = (seed: number) => { let x = seed; return () => { x = (x * 9301 + 49297) % 233280; return x / 233280; }; };
const walk = (seed: number, n: number, base: number, amp: number) => { const r = rnd(seed); let v = base; return Array.from({ length: n }, () => { v = Math.max(0, v + (r() - 0.5) * amp); return Math.round(v * 10) / 10; }); };
type Ct = { name: string; stack: string; cpu: number; mem: number; memLimit: number; uptime: string; restarts: number; status: string; spark: number[]; memSpark: number[]; ioSpark: number[]; netSpark: number[]; wr: number; rd: number; wrRate: number; rdRate: number; vol: number; rx: number; tx: number; rxRate: number; txRate: number };
type Metrics = { h: { cpu: number[]; mem: number[]; disk: number[]; disk_rd: number[]; disk_wr: number[]; net_in: number[]; net_out: number[] }; ct: Ct[]; tick: number };
const seed = (): Metrics => ({
  h: { cpu: walk(1, 90, 22, 4), mem: walk(2, 90, 6.1, 0.2), disk: walk(3, 90, 212, 0.1), disk_rd: walk(6, 90, 2, 0.5), disk_wr: walk(7, 90, 3, 0.5), net_in: walk(4, 90, 12, 4), net_out: walk(5, 90, 10, 3) },
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
  return { tick: m.tick + 1, ct, h: { cpu: push(m.h.cpu, cpu), mem: push(m.h.mem, mem), disk: push(m.h.disk, disk), disk_rd: push(m.h.disk_rd, Math.round(sum((c) => c.rdRate) * 10) / 10), disk_wr: push(m.h.disk_wr, Math.round(sum((c) => c.wrRate) * 10) / 10), net_in: push(m.h.net_in, Math.round(sum((c) => c.rxRate) * 10) / 10), net_out: push(m.h.net_out, Math.round(sum((c) => c.txRate) * 10) / 10) } };
};
const last = (a: number[]) => a[a.length - 1];
function useLive(on: boolean) {
  const [m, setM] = useState<Metrics>(() => { let x = seed(); for (let i = 0; i < 90; i += 1) x = step(x); return x; });
  const timer = useRef<number>(0);
  useEffect(() => { if (!on) return; timer.current = window.setInterval(() => setM(step), 1000); return () => window.clearInterval(timer.current); }, [on]);
  return m;
}


type Res = "cpu" | "mem" | "disk" | "net";
// ── 한눈에 보기 — 네 리소스가 동시에 보이는 경우의 수 ─────────────────────────
const RES: { id: Res; label: string; unit: (c: Ct) => string; fmt: (v: number) => string; raw: (c: Ct) => number; pct: (c: Ct) => number; tone: (c: Ct) => "accent" | "good" | "warn" | "bad" }[] = [
  { id: "cpu", label: "CPU", unit: (c) => `${Math.round(c.cpu)}%`, fmt: (v) => `${Math.round(v)}%`, raw: (c) => c.cpu, pct: (c) => c.cpu, tone: (c) => (c.cpu > 30 ? "warn" : "accent") },
  { id: "mem", label: "Memory", unit: (c) => `${c.mem.toFixed(1)} GB`, fmt: (v) => `${v.toFixed(1)} GB`, raw: (c) => c.mem, pct: (c) => (c.mem / c.memLimit) * 100, tone: (c) => (c.mem / c.memLimit > 0.9 ? "bad" : "good") },
  { id: "disk", label: "Disk I/O", unit: (c) => `${(c.wrRate + c.rdRate).toFixed(1)} MB/s`, fmt: (v) => `${v.toFixed(1)} MB/s`, raw: (c) => c.wrRate + c.rdRate, pct: (c) => Math.min(100, (c.wrRate + c.rdRate) * 5), tone: () => "accent" },
  { id: "net", label: "Network", unit: (c) => `${(c.rxRate + c.txRate).toFixed(1)} Mb/s`, fmt: (v) => `${v.toFixed(1)} Mb/s`, raw: (c) => c.rxRate + c.txRate, pct: (c) => Math.min(100, (c.rxRate + c.txRate) * 2), tone: () => "good" },
];
const sparkOf = (c: Ct, id: Res) => ({ cpu: c.spark, mem: c.memSpark, disk: c.ioSpark, net: c.netSpark }[id]);
const SplitCtx = createContext(false);
// 방향이 있는 유량 — 디스크 I/O(읽기·쓰기)와 네트워크(받음·보냄). 띠 안 토글로 합·a·b 를 고른다(사용자 결정 2026-09-09).
// 점유율: 디스크는 한 장치라 합을, 네트워크는 양방향이 따로라 max(in, out) 을 상한(cap, 설정값)에 댄다.
type Dir = "sum" | "a" | "b";
const DIRS = {
  disk: { a: { label: "Read", ct: (c: Ct) => c.rdRate, host: (H: Metrics["h"]) => H.disk_rd }, b: { label: "Write", ct: (c: Ct) => c.wrRate, host: (H: Metrics["h"]) => H.disk_wr }, cap: 50, combine: "sum" as const, unit: "MB/s", yfmt: (v: number) => `${v}M`, tones: ["info", "warn"] as const, glyph: null },
  net: { a: { label: "In", ct: (c: Ct) => c.rxRate, host: (H: Metrics["h"]) => H.net_in }, b: { label: "Out", ct: (c: Ct) => c.txRate, host: (H: Metrics["h"]) => H.net_out }, cap: 100, combine: "max" as const, unit: "Mb/s", yfmt: (v: number) => `${v}`, tones: ["good", "accent"] as const, glyph: ["↓", "↑"] as [string, string] },
};
const r1 = (v: number) => Math.round(v * 10) / 10;
const dirHost = (id: "disk" | "net", H: Metrics["h"], dir: Dir) => {
  const D = DIRS[id], A = D.a.host(H), B = D.b.host(H), a = last(A), b = last(B), g = D.glyph ?? ["", ""];
  if (dir === "sum") {
    const v = D.combine === "max" ? Math.max(a, b) : a + b;
    return { value: D.glyph ? `${g[0]}${Math.round(a)} ${g[1]}${Math.round(b)}` : `${r1(a + b)} ${D.unit}`, sub: D.glyph ? D.unit : `${D.a.label} ${r1(a)} · ${D.b.label} ${r1(b)}`, series: [{ name: D.a.label, points: A, tone: D.tones[0] }, { name: D.b.label, points: B, tone: D.tones[1] }], total: A.map((x, i) => r1(x + B[i])), max: undefined, pct: Math.min(100, (v / D.cap) * 100), tv: D.glyph ? `${g[0]}${Math.round(a)} ${g[1]}${Math.round(b)}` : `${r1(a + b)} ${D.unit}`, fmt: D.yfmt };
  }
  const k = dir === "a" ? D.a : D.b, P = dir === "a" ? A : B, v = last(P), gg = dir === "a" ? g[0] : g[1];
  const sv = D.glyph ? Math.round(v) : r1(v);
  return { value: `${gg}${sv} ${D.unit}`, sub: k.label, series: [{ name: k.label, points: P, tone: D.tones[dir === "a" ? 0 : 1] }], total: P, max: undefined, pct: Math.min(100, (v / D.cap) * 100), tv: `${gg}${sv} ${D.unit}`, fmt: D.yfmt };
};
const hostOf = (H: Metrics["h"], id: "cpu" | "mem") => ({
  cpu: { value: `${Math.round(last(H.cpu))}%`, sub: "8 cores", series: [{ name: "Host", points: H.cpu, tone: "accent" as const }], total: H.cpu, max: 100, pct: last(H.cpu), tv: `${Math.round(last(H.cpu))}%`, fmt: (v: number) => `${v}%` },
  mem: { value: `${last(H.mem).toFixed(1)} GB`, sub: "of 16 GB", series: [{ name: "Used", points: H.mem, tone: "info" as const }], total: H.mem, max: 16, pct: (last(H.mem) / 16) * 100, tv: `${last(H.mem).toFixed(1)} GB`, fmt: (v: number) => `${v}G` },
}[id]);

/** 확정 규격(사용자 결정 2026-09-09): Lab S1 Base · Ticks 를 `ResourceBand`/`StorageCard` 유기체로 승격했다. 이 페이지는 이제 가짜 데이터를 그 유기체에 먹이는 화면일 뿐이다. */

function Band({ m, r }: { m: Metrics; r: (typeof RES)[number] }) {
  const [own, setOwn] = useState<Dir>("sum");
  const D = r.id === "disk" || r.id === "net" ? DIRS[r.id] : null;
  const dir = D ? own : "sum";
  const h = D ? dirHost(r.id as "disk" | "net", m.h, dir) : hostOf(m.h, r.id as "cpu" | "mem");
  const split = useContext(SplitCtx);
  const raw = (c: Ct) => (!D || dir === "sum" ? r.raw(c) : (dir === "a" ? D.a : D.b).ct(c)); // 토글 방향의 컨테이너 값
  const n = h.total.length;
  const parts = split ? bandParts(m.ct, raw, (c) => c.name, r.fmt, h.pct, (c) => sparkOf(c, r.id).concat(sparkOf(c, r.id)).slice(-n)) : [];
  return (
    <ResourceBand
      label={r.label} value={h.value} points={h.total} max={h.max} format={h.fmt} pct={h.pct} parts={parts}
      modes={D ? [{ value: "sum", label: "Total" }, { value: "a", label: D.a.label }, { value: "b", label: D.b.label }] : undefined}
      mode={dir} onModeChange={(v) => setOwn(v as Dir)}
    />
  );
}

/** 저장 장치 둘 — 내장은 시스템·이미지·로그, 외장 SSD 는 볼륨·백업·기타. 볼륨은 시뮬레이션의 디스크 증가분을 따라 천천히 찬다. */
function StorageRow({ m }: { m: Metrics }) {
  const vol = Math.round(last(m.h.disk) - 116); // 시뮬레이션의 "디스크" 는 볼륨 합으로 쓴다
  const log = Math.round((6.3 + m.tick * 0.0002) * 10) / 10;
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <StorageCard title="Internal disk" mount="/" total={512}
        parts={[{ label: "Images", value: 84 }, { label: "System", value: 24 }, { label: "Logs", value: log }]}
        rowsLabel="Top log writers" rows={[{ name: "worker", value: Math.round((3.1 + m.tick * 0.0001) * 10) / 10 }, { name: "api", value: 1.8 }, { name: "edge", value: 0.9 }]} />
      <StorageCard title="External SSD" mount="/mnt/ssd" total={2000}
        parts={[{ label: "Other", value: 410 }, { label: "Backups", value: 132 }, { label: "Volumes", value: vol }]}
        rowsLabel="Largest volumes" rows={[...m.ct].sort((a, b) => b.vol - a.vol).slice(0, 3).map((c) => ({ name: c.name, value: c.vol }))} />
    </div>
  );
}

export function Lab() {
  const [live, setLive] = useState(true);
  const [split, setSplit] = useState(true);
  const m = useLive(live);
  const up = 6 * 86400 + 4 * 3600 + m.tick;
  return (
    <SplitCtx.Provider value={split}>
    <AppShell>
      <PageHeading crumbs={[{ label: "Home", href: "#" }, { label: "Resources" }]} title="Resources" meta={<><IconText icon="server">homeserver · 8 cores · 16 GB</IconText><IconText icon="clock">Up {Math.floor(up / 86400)}d {Math.floor((up % 86400) / 3600)}h</IconText><IconText icon="project">{m.ct.length} containers running</IconText><span className="inline-flex items-center gap-2 text-body text-mute"><Dot tone="progress" pulse={live} />{live ? `Live · tick ${m.tick}` : "Paused"}</span></>} actions={<><Switch checked={split} onCheckedChange={setSplit} label="By container" boxed /><Switch checked={live} onCheckedChange={setLive} label="Live" boxed /></>} />
      <div className="mt-6 space-y-5">
        <ResourceBands>{RES.map((r) => <div key={r.id}><Band m={m} r={r} /></div>)}</ResourceBands>
        <StorageRow m={m} />
      </div>
    </AppShell>
    </SplitCtx.Provider>
  );
}
