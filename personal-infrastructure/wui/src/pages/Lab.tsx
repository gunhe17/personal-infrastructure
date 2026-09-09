import { AreaChart, AppShell, Badge, Card, Container, FilterTabs, IconText, KeyValue, List, ListRow, Meter, PageHeading, Progress, RingGauge, SectionHeading, Sparkline, StatusDot, Tile, Tracker, type Series } from "@/ui";
import { useState } from "react";

// Lab — 결정 전 후보를 실제 크기로 나란히 본다. 여기 있는 것은 아직 키트가 아니다. 선택되면 유기체/템플릿으로 옮긴다.
const rnd = (seed: number) => { let x = seed; return () => { x = (x * 9301 + 49297) % 233280; return x / 233280; }; };
const walk = (seed: number, n: number, base: number, amp: number) => { const r = rnd(seed); let v = base; return Array.from({ length: n }, () => { v = Math.max(0, v + (r() - 0.5) * amp); return Math.round(v * 10) / 10; }); };
const H = { cpu: walk(1, 48, 22, 12), mem: walk(2, 48, 6.1, 0.6), disk: walk(3, 48, 212, 0.4), net_in: walk(4, 48, 12, 8), net_out: walk(5, 48, 3, 3) };
const X24 = ["00", "03", "06", "09", "12", "15", "18", "21", "24"];
const CT = [
  { name: "api", stack: "dockerfile", cpu: 12, mem: 1.4, memLimit: 2, uptime: "6일 4시간", restarts: 0, status: "running", spark: walk(11, 24, 12, 6) },
  { name: "blog", stack: "static", cpu: 1, mem: 0.1, memLimit: 0.5, uptime: "14일", restarts: 0, status: "running", spark: walk(12, 24, 1, 1) },
  { name: "worker", stack: "node", cpu: 34, mem: 2.9, memLimit: 3, uptime: "3시간", restarts: 3, status: "running", spark: walk(13, 24, 30, 14) },
  { name: "postgres", stack: "db", cpu: 4, mem: 0.9, memLimit: 2, uptime: "14일", restarts: 0, status: "running", spark: walk(14, 24, 4, 2) },
  { name: "edge", stack: "caddy", cpu: 2, mem: 0.2, memLimit: 0.5, uptime: "14일", restarts: 0, status: "running", spark: walk(15, 24, 2, 1) },
] as const;
const DISK = [{ label: "이미지", value: 84, tone: "info" }, { label: "볼륨", value: 96, tone: "running" }, { label: "백업", value: 32, tone: "progress" }] as const;

function Option({ id, title, from, fit, children }: { id: string; title: string; from: string; fit: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-16 first:mt-0">
      <SectionHeading title={title} description={<><span className="text-text">근거</span> {from} · <span className="text-text">맞는 경우</span> {fit}</>} />
      {children}
    </section>
  );
}

/** A — 지표 카드 + 스파크라인. 큰 숫자가 주인공, 추세는 옆에. */
function OptionA() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-5">
        <Card><p className="text-body text-mute">CPU</p><p className="mt-4 text-display tabular-nums text-text">23<span className="text-title text-mute">%</span></p><div className="mt-3 flex items-end gap-4"><Badge size="sm" tone="running">8 코어</Badge><div className="min-w-0 flex-1"><Sparkline fluid points={H.cpu} height={40} className="block w-full" /></div></div></Card>
        <Card><p className="text-body text-mute">메모리</p><p className="mt-4 text-display tabular-nums text-text">6.1<span className="text-title text-mute">/16 GB</span></p><div className="mt-3 flex items-end gap-4"><Badge size="sm" tone="running">38%</Badge><div className="min-w-0 flex-1"><Sparkline fluid points={H.mem} height={40} className="block w-full" /></div></div></Card>
        <Card><p className="text-body text-mute">디스크</p><p className="mt-4 text-display tabular-nums text-text">212<span className="text-title text-mute">/512 GB</span></p><div className="mt-3 flex items-end gap-4"><Badge size="sm" tone="progress">41% · 남은 300</Badge><div className="min-w-0 flex-1"><Sparkline fluid points={H.disk} tone="warn" height={40} className="block w-full" /></div></div></Card>
        <Card><p className="text-body text-mute">네트워크</p><p className="mt-4 text-display tabular-nums text-text">12<span className="text-title text-mute"> Mb/s</span></p><div className="mt-3 flex items-end gap-4"><Badge size="sm" tone="idle">↑ 3 Mb/s</Badge><div className="min-w-0 flex-1"><Sparkline fluid points={H.net_in} tone="good" height={40} className="block w-full" /></div></div></Card>
      </div>
      <Card title="컨테이너별" subtitle="지난 24시간 평균 CPU · 최대 메모리">
        <div className="space-y-4">
          {CT.map((c) => (
            <div key={c.name} className="grid grid-cols-[200px_1fr_1fr_96px] items-center gap-6">
              <ListRow lead={<Tile size="sm">{c.name[0].toUpperCase()}</Tile>} title={c.name} sub={c.stack} />
              <Progress label="CPU" value={c.cpu} tone={c.cpu > 30 ? "warn" : "accent"} />
              <Progress label={`메모리 ${c.mem} / ${c.memLimit} GB`} value={(c.mem / c.memLimit) * 100} tone={c.mem / c.memLimit > 0.9 ? "bad" : "good"} />
              <IconText icon="clock">{c.uptime}</IconText>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/** B — 링 게이지. 사용률 넷을 원으로, 디스크는 칸으로 쪼갠다. */
function OptionB() {
  return (
    <div className="space-y-5">
      <Card>
        <div className="grid grid-cols-4">
          <RingGauge value={23} label="CPU" detail="8 코어 · 부하 1.8" />
          <RingGauge value={38} label="메모리" detail="6.1 / 16 GB" />
          <RingGauge value={41} label="디스크" detail="212 / 512 GB" />
          <RingGauge value={12} label="네트워크" detail="↓12 ↑3 Mb/s" />
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-5">
        <Card title="디스크" subtitle="512 GB 중"><Meter total={512} unit="G" parts={[...DISK]} /></Card>
        <Card title="메모리" subtitle="16 GB 중"><Meter total={16} unit="G" parts={[{ label: "api", value: 1.4, tone: "info" }, { label: "worker", value: 2.9, tone: "progress" }, { label: "postgres", value: 0.9, tone: "running" }, { label: "그 외", value: 0.9, tone: "idle" }]} /></Card>
      </div>
      <List title="컨테이너">
        {CT.map((c) => <ListRow key={c.name} lead={<Tile size="sm">{c.name[0].toUpperCase()}</Tile>} title={c.name} sub={c.stack} value={<span className="font-mono text-body">{c.cpu}% · {c.mem} GB</span>} end={<StatusDot tone={c.restarts ? "progress" : "running"} muted>{c.restarts ? `재시작 ${c.restarts}` : c.uptime}</StatusDot>} />)}
      </List>
    </div>
  );
}

/** C — 시계열 중심. 범위를 고르고 네 그래프를 읽는다. */
function OptionC() {
  const [range, setRange] = useState("24h");
  const net: Series[] = [{ name: "들어옴", points: H.net_in, tone: "good" }, { name: "나감", points: H.net_out, tone: "accent" }];
  const cpu: Series[] = [{ name: "호스트", points: H.cpu, tone: "accent" }, { name: "worker", points: CT[2].spark.concat(CT[2].spark), tone: "warn" }];
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><div className="flex items-center gap-5"><StatusDot tone="running">엣지 up</StatusDot><IconText icon="clock">가동 14일 6시간</IconText><IconText icon="server">부하 1.8 · 8 코어</IconText></div><FilterTabs value={range} onValueChange={setRange} items={[{ value: "1h", label: "1시간" }, { value: "24h", label: "24시간" }, { value: "7d", label: "7일" }]} /></div>
      <div className="grid grid-cols-2 gap-5">
        <Card title="CPU" subtitle="% · 호스트와 가장 바쁜 컨테이너"><div className="ps-8"><AreaChart series={cpu} max={100} format={(v) => `${v}%`} xLabels={X24} /></div></Card>
        <Card title="메모리" subtitle="GB · 16 GB 중"><div className="ps-8"><AreaChart series={[{ name: "사용", points: H.mem, tone: "info" }]} max={16} format={(v) => `${v}G`} xLabels={X24} /></div></Card>
        <Card title="디스크" subtitle="GB · 512 GB 중"><div className="ps-8"><AreaChart series={[{ name: "사용", points: H.disk, tone: "warn" }]} max={512} format={(v) => `${v}G`} xLabels={X24} /></div></Card>
        <Card title="네트워크" subtitle="Mb/s"><div className="ps-8"><AreaChart series={net} format={(v) => `${v}`} xLabels={X24} /></div></Card>
      </div>
    </div>
  );
}

/** D — 컨테이너 중심. 호스트 총량은 얇은 띠로, 행마다 스파크라인. */
function OptionD() {
  return (
    <div className="space-y-5">
      <Card>
        <div className="grid grid-cols-3 gap-8">
          <Progress label="CPU · 8 코어" value={23} />
          <Progress label="메모리 · 6.1 / 16 GB" value={38} tone="good" />
          <Progress label="디스크 · 212 / 512 GB" value={41} tone="warn" />
        </div>
      </Card>
      <List title="컨테이너 5" subtitle="CPU 는 지난 24시간, 메모리는 최대치">
        {CT.map((c) => (
          <div key={c.name} className="grid grid-cols-[180px_1fr_120px_140px_120px_100px] items-center gap-4">
            <ListRow lead={<Tile size="sm">{c.name[0].toUpperCase()}</Tile>} title={c.name} sub={c.stack} />
            <Sparkline fluid points={c.spark} tone={c.cpu > 30 ? "warn" : "accent"} height={32} className="block w-full" />
            <span className="font-mono text-body tabular-nums text-text">{c.cpu}%</span>
            <div><span className="font-mono text-body tabular-nums text-text">{c.mem} / {c.memLimit} GB</span><Progress value={(c.mem / c.memLimit) * 100} tone={c.mem / c.memLimit > 0.9 ? "bad" : "good"} className="mt-1 [&>div:first-child]:hidden" /></div>
            <IconText icon="clock">{c.uptime}</IconText>
            {c.restarts ? <Badge size="sm" tone="progress">재시작 {c.restarts}</Badge> : <StatusDot tone="running" muted>안정</StatusDot>}
          </div>
        ))}
      </List>
      <Card title="30일 가동" subtitle="하루 한 칸 — 재시작이나 다운이 있으면 색이 바뀐다"><Tracker items={Array.from({ length: 30 }, (_, i) => ({ tone: i === 7 ? "failed" : i === 27 ? "progress" : "running", label: `${i + 1}일` }))} /></Card>
    </div>
  );
}

export function Lab() {
  return (
    <AppShell>
      <PageHeading crumbs={[{ label: "캔버스", href: "#" }, { label: "Lab" }]} title="이 PC 의 리소스 현황 — 후보 넷" meta={<><IconText icon="insight">같은 데이터, 네 가지 표현. 하나를 고르면 홈 화면 유기체가 된다.</IconText></>} />
      <div className="mt-8">
        <Option id="a" title="A · 지표 카드 + 스파크라인" from="Beszel 의 네 핵심 지표 · PatternFly KPI 카드(큰 숫자 + 스파크라인)" fit="한눈에 '지금' 을 보고 싶을 때. 추세는 힌트만"><OptionA /></Option>
        <Option id="b" title="B · 링 게이지 + 칸 나누기" from="Synology · Proxmox 의 사용률 원 · Tremor Category Bar" fit="'얼마나 찼나' 가 핵심일 때. 디스크·메모리를 누가 먹는지까지"><OptionB /></Option>
        <Option id="c" title="C · 시계열 그래프" from="Netdata · Grafana 의 시간축 · 범위 선택" fit="'언제 튀었나' 를 찾을 때. 밤새 무슨 일이 있었는지"><OptionC /></Option>
        <Option id="d" title="D · 컨테이너 중심 표" from="Portainer · Beszel 의 컨테이너 목록(행마다 CPU·메모리·가동)" fit="'누가 문제인가' 를 찾을 때. 재시작·가동시간이 같이 보인다"><OptionD /></Option>
      </div>
      <Container className="mt-16 px-0"><Card title="추천"><KeyValue items={[{ label: "홈 화면", value: "A 의 지표 카드 4장을 맨 위에, 그 아래 D 의 컨테이너 표. '지금' + '누가' 를 한 화면에" }, { label: "리소스 상세", value: "C 의 시계열 4장 + B 의 디스크·메모리 칸 나누기. '언제' + '얼마나' 는 눌러서" }, { label: "새 API", value: "가동시간·재시작 횟수(docker inspect) · 볼륨 크기 · 시계열 샘플(현재 usage 는 24h 집계뿐)" }]} /></Card></Container>
    </AppShell>
  );
}
