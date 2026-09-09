import { Accordion, AreaChart, AppShell, Card, cn, Container, Dot, FilterTabs, Meter, Sheet, Sparkline, Switch, IconText, KeyValue, ListRow, PageHeading, Progress, SectionHeading, Tile } from "@/ui";
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
const fmtGB = (v: number) => v >= 1024 ? `${(v / 1024).toFixed(2)} TB` : v >= 1 ? `${v.toFixed(1)} GB` : `${Math.round(v * 1024)} MB`;
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

/** 리소스 띠 — 요약 한 줄: 이름·값 · 시계열 · 상위 3. 네 변형이 같은 띠를 쓴다. */
function Band({ m, r, dense }: { m: Metrics; r: (typeof RES)[number]; dense?: boolean }) {
  const h = hostOf(m.h, r.id);
  return (
    <div className={cn("grid items-center gap-8", dense ? "grid-cols-[140px_1fr_240px]" : "grid-cols-[160px_1fr_260px]")}>
      <div><p className="text-body text-mute">{r.label}</p><p className="mt-1 text-title tabular-nums text-text">{h.value}</p><p className="text-caption text-mute">{h.sub}</p></div>
      <div className="ps-8"><AreaChart series={h.series} max={h.max} height={64} format={h.fmt} /></div>
      <div className="space-y-1.5">{topOf(m.ct, r).map((c) => <div key={c.name} className="grid grid-cols-[80px_1fr_80px] items-center gap-2"><span className="truncate text-caption text-text">{c.name}</span><Progress value={r.pct(c)} tone={r.tone(c)} className="[&>div:first-child]:hidden" /><span className="text-end font-mono text-caption tabular-nums text-mute">{r.unit(c)}</span></div>)}</div>
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
      <div><p className="mb-3 text-caption text-mute">컨테이너 전체 · {r.label} 순</p><div className="divide-y divide-line">{rows.map((c) => <div key={c.name} className="grid grid-cols-[200px_1fr_1fr_140px] items-center gap-4 py-2 text-body [&>*:not(:first-child)]:justify-self-end"><ListRow lead={<Tile size="sm">{c.name[0].toUpperCase()}</Tile>} title={c.name} sub={c.stack} />{cols[r.id](c).map((x, i) => <div key={i} className="w-full text-end">{x}</div>)}</div>)}</div></div>
    </div>
  );
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
  const m = useLive(live);
  return (
    <AppShell>
      <PageHeading crumbs={[{ label: "캔버스", href: "#" }, { label: "Lab" }]} title="리소스" meta={<><IconText icon="insight">가로 띠 4단 + 세부 드러내기 — 경우의 수 넷</IconText><span className="inline-flex items-center gap-2 text-body text-mute"><Dot tone="progress" pulse={live} />{live ? `실시간 흉내 · 1초 · ${m.tick}번째` : "멈춤"}</span></>} actions={<Switch checked={live} onCheckedChange={setLive} label="실시간" boxed />} />
      <div className="mt-8">
        <Option id="v2a" title="V2-a · 행 펼침" from="아코디언 — 띠가 곧 트리거" fit="궁금한 리소스만 그 자리에서. 여러 개 동시에 열어 비교"><V2a m={m} /></Option>
        <Option id="v2b" title="V2-b · 오른쪽 서랍" from="Sheet — 요약은 뒤에 남는다" fit="요약을 잃지 않고 깊이 볼 때. 서랍 안에서 범위·목록"><V2b m={m} /></Option>
        <Option id="v2c" title="V2-c · 전체 스위치" from="'자세히' 하나로 모두 펼침 — 두 상태" fit="클릭 없이 훑고 싶을 때. 넷을 한 번에 비교"><V2c m={m} /></Option>
        <Option id="v2d" title="V2-d · 아래 도킹 패널" from="활성 상태 보기의 아래 패널 — 선택된 띠가 바뀐다" fit="띠 넷은 항상 보이고 세부는 하나만. 가장 안정된 레이아웃"><V2d m={m} /></Option>
      </div>
      <Container className="mt-16 px-0"><Card title="추천"><KeyValue items={[{ label: "선택", value: "V2-d — 띠 넷은 늘 보이고 세부는 아래 하나. 활성 상태 보기와 같은 손맛, 레이아웃이 흔들리지 않는다" }, { label: "차선", value: "V2-a — 비교가 필요하면 둘을 동시에 펼친다. 대신 화면이 길어진다" }, { label: "새 API", value: "컨테이너별 디스크 r/w·네트워크 rx/tx(docker stats) · 가동시간·재시작 · 시계열 샘플" }]} /></Card></Container>
    </AppShell>
  );
}
