import { useEffect, useRef, useState } from "react";
import { toneOf, Container, InputGroup, FormRow, FormActions, ActionPanel, NavList, SectionHeading, List, Calendar, PageHeading, SignInCard, DetailScreen, SettingsScreen, Link, ButtonGroup, AvatarGroup, Meter, Tracker, Steps, Timeline, KeyValue, CopyField, RadioCards, Fieldset, Sheet, Command, Analytics, EdgeRequests, RecentDeploys, DeviceList, ResourceBand, ResourceBands, TopProjects, Spinner, Icon, ICONS, type IconName, IconButton, Dot, Track, SEG, ITEM, IconText, Accordion, Avatar, Badge, Breadcrumb, Button, Callout, Card, Checkbox, Chip, Code, Combobox, ConfirmDialog, Dialog, Donut, DotMatrix, EmptyState, Field, FilterTabs, Gauge, InlineCode, Input, Kbd, ListRow, LogViewer, Menu, MenuItem, MenuLabel, MenuSeparator, Mono, Notice, NumberField, Pagination, Popover, Progress, RadioGroup, SearchInput, Select, Separator, Skeleton, Slider, Sparkline, Stat, StatTrend, StatusDot, Switch, Tabs, Textarea, Tile, ToastProvider, ToggleGroup, Toolbar, Tooltip, TooltipProvider, TopBar, useToast} from "@/ui";

// Figma 식 캔버스 — 상자 없이 원자 요소를 세로 한 줄로. 다크가 기본, 라이트 토글. 줌·레이어 목록.
type Row = { id: string; name: string; env: string; status: "running" | "deploying" | "failed" | "created"; port: number | null; commit: string; pct: number };
const ROWS: Row[] = [{ id: "1", name: "api", env: "연속 배포 7일", status: "running", port: 80, commit: "a1b2c3d", pct: 88 }, { id: "2", name: "blog", env: "연속 배포 4일", status: "deploying", port: 80, commit: "e4f5a6b", pct: 23 }, { id: "3", name: "worker", env: "연속 배포 13일", status: "failed", port: 3000, commit: "0c9d8e7", pct: 28 }, { id: "4", name: "draft", env: "아직 배포 없음", status: "created", port: null, commit: "", pct: 0 }];
const COLORS: [string, string][] = [["bg", "var(--bg)"], ["card", "var(--card)"], ["card-2", "var(--card-2)"], ["card-3", "var(--card-3)"], ["text", "var(--text)"], ["body", "var(--body)"], ["mute", "var(--mute)"], ["line", "var(--line)"], ["pill-on", "var(--pill-on)"], ["accent", "var(--accent)"], ["info", "var(--info)"], ["good", "var(--good)"], ["warn", "var(--warn)"], ["bad", "var(--bad)"]];
const DOTS = ["6월", "7월", "8월"].map((label, mi) => ({ label, cells: Array.from({ length: 28 }, (_, i) => (i * 7 + mi * 3) % 5 < 3) }));
// 간격 척도 — 숫자는 관계를 말한다. 같은 관계면 어디서나 같은 숫자.
const SPACING: [number, string, string][] = [
  [2, "한 몸 안의 틈", "NumberField 트랙 p-0.5 · 콤보박스 버튼 사이"],
  [4, "같은 컨트롤 안 부품", "Track p-1 · 페이지 번호 사이 · Kbd 짝 · 아코디언 행 사이 · 제목↔부제"],
  [6, "팝업 안쪽", "Menu·Select·Combobox 팝업 p-1.5 · 항목은 붙여 쌓는다(40px 행)"],
  [8, "아이콘↔글자 · 라벨↔컨트롤 · 팝업↔트리거", "IconText · StatusDot · Button 안 아이콘 · Field 라벨/힌트 · sideOffset 8 · 카드 p-2(아코디언)"],
  [12, "같은 요소 나열", "버튼 줄 · 배지 · 칩 · 라디오 항목 · Notice 쌓기 · 툴바 안 · 모달 바닥 버튼 · 토스트 사이 · 체크 상자↔라벨"],
  [16, "다른 요소 나열 · 행 안", "ListRow 의 타일↔글↔값 · 폼 필드 사이 · 카드 헤더 제목↔액션 · Dialog 본문 위 · Stat 라벨↔값"],
  [20, "카드 안 행 사이 · 카드 사이", "ListRow 쌓기 · Progress 쌓기 · 카드 격자 gap-5 · 툴바↔목록 · Popover p-5"],
  [24, "카드 안쪽 · 헤더↔본문 · 라벨 있는 인라인 컨트롤 나열", "Card p-6 · 헤더 mb-6 · Tabs↔패널 · 스위치·체크 줄 gap-6 · 토스트 화면 가장자리"],
  [32, "카드 안 큰 묶음 사이", "지표↔게이지 · 게이지↔점 행렬 · Dialog 본문↔바닥"],
  [48, "섹션 사이(앱 페이지)", "페이지 머리↔첫 카드 · 큰 묶음 사이 — 캔버스는 56/96"],
];
const TYPE = ["display", "title-lg", "title", "body-lg", "body", "caption", "code"] as const;

type State = { filter: "all" | "running"; tab: "overview" | "deploys" | "env"; on: boolean; engine: "postgres" | "redis" | "minio" | null; dialog: boolean; confirm: boolean; check: boolean; radio: "acme" | "self" | "none"; port: number | null; cpu: number; pick: { value: string; label: string } | null; view: "grid" | "list"; page: number; sheet: boolean; cmd: boolean; stack: "dockerfile" | "static" | "node"; day: string; nav: string; notice: boolean };
type Set = React.Dispatch<React.SetStateAction<State>>;
/** 모션 원자 보드 — index.css 의 이름 하나마다 한 줄. 토글·재생으로 직접 본다. Row 는 밖에 둔다 — 렌더 안에서 만들면 자식이 매번 다시 마운트되어 전이가 끊긴다. */
const Row = ({ name, dur, note, children }: { name: string; dur: string; note: string; children: React.ReactNode }) => (
  <div className="grid grid-cols-[150px_1fr] items-start gap-4 border-b border-line py-4 last:border-b-0">
    <div><p className="font-mono text-caption text-text">{name}</p><p className="font-mono text-[11px] text-mute">{dur}</p><p className="mt-1 text-caption text-mute">{note}</p></div>
    <div className="flex min-w-0 flex-col items-start gap-3">{children}</div>
  </div>
);
function MotionBoard() {
  const [on, setOn] = useState(true);
  const [replay, setReplay] = useState(0);
  const [tab, setTab] = useState<"a" | "b" | "c">("a");
  const [dlg, setDlg] = useState(false);
  const [slow, setSlow] = useState(false);
  // 슬로모션 — 길이 토큰만 ×5. 모든 원자가 var(--duration-*) 를 읽으므로 hover(100ms)처럼 눈으로 못 쫓는 것도 보인다.
  useEffect(() => {
    const st = document.documentElement.style, k = slow ? 5 : 1;
    ([["fast", 100], ["base", 200], ["slow", 300], ["exit", 150]] as const).forEach(([n, ms]) => st.setProperty(`--duration-${n}`, `${ms * k}ms`));
  }, [slow]);
  const focusLikeKeyboard = () => {
    const els = [...document.querySelectorAll<HTMLElement>('#motion input[placeholder], #motion [role=tab], #motion button')].slice(0, 6);
    let i = 0; const step = () => { els[i % els.length]?.focus({ focusVisible: true } as FocusOptions); i += 1; if (i < els.length) window.setTimeout(step, 700); }; step();
  };
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-3"><Button size="sm" onClick={() => setReplay((n) => n + 1)}>등장 다시 재생</Button><Button size="sm" onClick={() => setOn((v) => !v)}>상태 뒤집기</Button><Button size="sm" onClick={focusLikeKeyboard}>포커스 순회(키보드처럼)</Button><Switch checked={slow} onCheckedChange={setSlow} label="슬로모션 ×5" boxed /></div>
      <Row name="pressable" dur="hover 100 · press 0 → 100" note="Button · IconButton · SEG · Switch · Checkbox · Radio"><Button variant="primary">눌러 보기</Button><IconButton label="더" icon="more" variant="secondary" /><Track><span className={`${SEG} bg-pill-on text-on-pill`}>칸</span><span className={SEG}>칸</span></Track></Row>
      <Row name="interactive" dur="hover 100 → 200 · press 0" note="MenuItem · ListRow · Accordion · 링크"><Card className="w-full space-y-1 p-1.5"><div className={ITEM} tabIndex={0}>항목 하나</div><div className={ITEM} tabIndex={0}>항목 둘</div></Card><Card className="w-full p-3"><ListRow onClick={() => {}} lead={<Tile size="sm">A</Tile>} title="api" sub="onClick 행" value="4,120" /></Card></Row>
      <Row name="focus-in" dur="색 200" note="Input · Button · SEG · 손잡이"><Input placeholder="포커스" className="w-56" /><Button variant="primary">primary</Button><Track><span className={`${SEG} bg-pill-on text-on-pill`} tabIndex={0}>칸</span></Track></Row>
      <Row name="enter-fade" dur="in 200 · out 150" note="Tooltip · 백드롭"><div key={`f${replay}`} className="animate-fade-in rounded-tile bg-card-2 px-4 py-3 text-body text-text ring-1 ring-line">opacity 0 → 1</div></Row>
      <Row name="enter-drop" dur="in 200 · out 150" note="Menu · Select · Combobox · Popover"><div key={`p${replay}`} className="origin-top animate-pop-in rounded-tile bg-card-2 px-4 py-3 text-body text-text ring-1 ring-line">scale .96 → 1</div><Menu trigger={<Button size="sm">실제로 열기<Icon name="chevronDown" size="sm" className="flip-open" /></Button>}><MenuItem>하나</MenuItem><MenuItem>둘</MenuItem></Menu></Row>
      <Row name="enter-modal" dur="in 200 · out 150" note="Dialog"><Button size="sm" onClick={() => setDlg(true)}>실제로 열기</Button><Dialog open={dlg} onOpenChange={setDlg} title="모달 등장" description="scale .96 → 1, 닫힐 땐 120ms ease-in." footer={<Button onClick={() => setDlg(false)}>닫기</Button>} /></Row>
      <Row name="enter-slide" dur="in 200 · out 150" note="Toast"><div key={`s${replay}`} className="animate-slide-up rounded-tile bg-card-2 px-4 py-3 text-body text-text ring-1 ring-line">8px 아래 → 제자리</div></Row>
      <Row name="move" dur="base 200" note="Switch · Checkbox · Radio"><Switch checked={on} onCheckedChange={setOn} label="스위치" /><Checkbox checked={on} onCheckedChange={setOn} label="체크" /></Row>
      <Row name="check-in" dur="in 200 · out 150" note="Checkbox · Radio 표시"><RadioGroup aria-label="check-in" value={on ? "a" : "b"} onValueChange={(v) => setOn(v === "a")} items={[{ value: "a", label: "하나" }, { value: "b", label: "둘" }]} className="flex-row gap-6" /></Row>
      <Row name="grow" dur="slow 300" note="Progress · 핀 · Slider · Donut · Gauge"><Progress className="w-full" label="디스크" value={on ? 72 : 28} /><Tabs value={tab} onValueChange={setTab} tabs={[{ value: "a", label: "개요" }, { value: "b", label: "배포" }, { value: "c", label: "설정" }]} /><FilterTabs value={on ? "a" : "b"} onValueChange={(v) => setOn(v === "a")} items={[{ value: "a", label: "주" }, { value: "b", label: "월" }]} /><Slider aria-label="손잡이" value={on ? 72 : 28} onValueChange={() => {}} className="w-64" /><Donut value={on ? 88 : 20} /><Gauge className="h-10 w-full" value={on ? 0.72 : 0.3} start="10k" end="200k" /></Row>
      <Row name="flip-open · unfold" dur="in 200 · out 150" note="Accordion"><Accordion className="w-full" items={[{ value: "a", title: "열어 보기", hint: "패널", content: <p>panel</p> }]} /></Row>
      <Row name="flip-open" dur="base 200" note="Select · Combobox · Menu · Popover"><Select value={null} onValueChange={() => {}} placeholder="열기" items={[{ value: "a", label: "하나" }, { value: "b", label: "둘" }]} className="w-56" /></Row>
      <Row name="tint" dur="base 200" note="StatusDot · Badge · Chip"><StatusDot tone={on ? "running" : "failed"}>{on ? "돌고 있음" : "실패"}</StatusDot><Badge tone={on ? "running" : "progress"}>{on ? "ok" : "building"}</Badge><Chip active={on}>필터</Chip></Row>
      <Row name="appear" dur="base 200" note="로그 줄 · 탭 패널 · busy"><div key={`a${replay}`} className="appear text-body text-text">새 줄</div><Button size="sm" busy={on}>{on ? "저장 중" : "저장"}</Button></Row>
      <Row name="theme" dur="slow 300" note="다크 ↔ 라이트"><Button size="sm" onClick={() => document.querySelector<HTMLButtonElement>('[aria-label="라이트로"],[aria-label="다크로"]')?.click()}>테마 바꿔 보기</Button></Row>
      <Row name="pulse · spin" dur="반복" note="Dot · Skeleton · Spinner"><StatusDot tone="progress">배포 중</StatusDot><Skeleton className="h-6 w-32" /><Spinner className="text-text" /></Row>
      <Row name="zoom" dur="base 200" note="캔버스 ⌘± · ⌘0"><span className="text-body text-mute">우하단 −/+</span></Row>
    </div>
  );
}

function ToastDemo() {
  const toast = useToast();
  return <div className="flex items-center gap-3"><Button onClick={() => toast.add({ title: "배포를 큐에 넣었다", description: "api · 워커가 곧 집어간다", type: "success" })}>성공 토스트</Button><Button onClick={() => toast.add({ title: "엣지 리로드 실패", description: ":80 을 다른 프로세스가 듣고 있다", type: "error" })}>오류 토스트</Button><Button variant="ghost" onClick={() => toast.add({ title: "인증서 갱신 중", type: "warning" })}>주의</Button></div>;
}
const PROJECTS = ROWS.map((r) => ({ value: r.id, label: `${r.name} · ${r.env}` }));
type Item = { id: string; label: string; frame?: boolean; render: (s: State, set: Set) => React.ReactNode };
// ITEMS 는 SECTIONS 와 같은 순서(0 토큰 → 4 템플릿, 그 안은 묶음 순)로 정렬해 둔다. 섹션 > 묶음(컨트롤·표시·바탕·차트·팝업…) > 컴포넌트 > 변형. 간격이 관계를 말한다 — 변형끼리 24, 다른 컴포넌트 56, 묶음 80, 섹션 96.
type Cell = { title: string; items: string[] };
type RowDef = { title: string; cells: Cell[] };

const ITEMS: Item[] = [
  // ── 0 토큰
  // 색 · 모양
  { id: "color", label: "색", render: () => <div className="flex flex-wrap gap-3">{COLORS.map(([n, v]) => <div key={n} className="w-[92px]"><div className="h-12 rounded-tile ring-1 ring-line" style={{ background: v }} /><p className="mt-2 truncate text-caption text-text">{n}</p></div>)}</div> },
  { id: "gauge-token", label: "그라데이션 / gauge", render: () => <div className="h-12 rounded-tile" style={{ background: "var(--gauge)" }} /> },
  { id: "type", label: "타이포", render: () => <div className="space-y-3">{TYPE.map((n) => <div key={n} className="flex items-baseline gap-4"><span className="w-24 shrink-0 font-mono text-caption text-mute">{n}</span><span className={`text-${n} text-text`}>{n === "display" ? "125,693" : "4개 중 3개가 돌고 있습니다."}</span></div>)}</div> },
  { id: "shape", label: "radius / card · tile · control · button · popup", render: () => <div className="flex items-end gap-4"><div className="flex size-32 items-end rounded-card bg-card p-4 text-caption text-mute">16</div><div className="flex size-24 items-end rounded-tile bg-card-2 p-3 text-caption text-mute">10</div><div className="flex h-11 w-40 items-center rounded-control bg-card-2 px-4 text-caption text-mute">10</div><div className="flex h-10 items-center rounded-button bg-pill-on px-5 text-caption text-on-pill">10</div><div className="flex h-16 w-24 items-end rounded-popup bg-card-2 p-3 text-caption text-mute">12</div></div> },
  { id: "spacing", label: "간격", render: () => <div className="divide-y divide-line">{SPACING.map(([px, role, where]) => <div key={px} className="grid grid-cols-[56px_120px_1fr] items-center gap-4 py-3"><span className="font-mono text-caption text-text">{px}</span><span className="h-3 rounded-sm bg-accent" style={{ width: px }} /><span className="text-caption text-mute" title={where}>{role}</span></div>)}</div> },
  // 아이콘
  { id: "icon", label: "Icon / 세트", render: () => <div className="grid grid-cols-6 gap-3">{(Object.keys(ICONS) as IconName[]).map((n) => <div key={n} className="flex flex-col items-center gap-2 rounded-tile bg-card py-3 text-text"><Icon name={n} /><span className="font-mono text-[11px] text-mute">{n}</span></div>)}</div> },
  { id: "icon-size", label: "Icon / sm · md · lg", render: () => <div className="flex items-center gap-6"><span className="flex items-center gap-2 text-text"><Icon name="deploy" size="sm" />sm</span><span className="flex items-center gap-2 text-text"><Icon name="deploy" />md</span><span className="flex items-center gap-2 text-text"><Icon name="deploy" size="lg" />lg</span></div> },
  { id: "icon-color", label: "Icon / currentColor", render: () => <div className="flex items-center gap-4"><Icon name="check" className="text-good" /><Icon name="warning" className="text-warn" /><Icon name="close" className="text-bad" /><Icon name="info" className="text-accent" /><Icon name="clock" className="text-mute" /></div> },
  // ── 1 원자
  // 모션 · 인터랙션
  { id: "motion", label: "모션 원자", render: () => <MotionBoard /> },
  { id: "cursor", label: "커서 / pointer · text · grab · not-allowed", render: () => <div className="grid grid-cols-4 gap-3 text-caption text-mute"><div className="cursor-pointer rounded-tile bg-card p-3"><p className="text-text">pointer</p>버튼 · 행 · 링크 · 스위치</div><div className="cursor-text rounded-tile bg-card p-3"><p className="text-text">text</p>Input · Textarea</div><div className="cursor-grab rounded-tile bg-card p-3 active:cursor-grabbing"><p className="text-text">grab</p>Slider 손잡이</div><div className="cursor-not-allowed rounded-tile bg-card p-3"><p className="text-text">not-allowed</p>disabled</div></div> },
  // ── 1 원자
  // 컨트롤
  { id: "button", label: "Button / primary · secondary · ghost · danger · busy · disabled", render: () => <div className="flex items-center gap-3"><Button variant="primary">전체 통계</Button><Button>취소</Button><Button variant="ghost">로그 보기</Button><Button variant="danger">삭제</Button><Button busy>저장 중</Button><Button disabled>비활성</Button></div> },
  { id: "button-sm", label: "Button / sm", render: () => <div className="flex items-center gap-3"><Button variant="primary" size="sm"><Icon name="deploy" size="sm" />배포</Button><Button size="sm">취소</Button><Button variant="ghost" size="sm">로그</Button><Button variant="danger" size="sm">삭제</Button></div> },
  { id: "spinner", label: "Spinner", render: () => <div className="flex items-center gap-4 text-text"><Spinner /><Spinner className="size-6" /><Button busy>저장 중</Button></div> },
  { id: "input-dense", label: "Input / dense", render: () => <Input dense placeholder="36px" /> },
  { id: "input-disabled", label: "Input / disabled", render: () => <Input disabled value="읽기 전용" readOnly /> },
  { id: "textarea", label: "Textarea", render: () => <Textarea placeholder="-----BEGIN CERTIFICATE-----" /> },
  { id: "switch", label: "Switch / on · off · disabled · boxed", render: (s, set) => <div className="flex flex-wrap items-center gap-6"><Switch checked={s.on} onCheckedChange={(on) => set((v) => ({ ...v, on }))} label="secret 으로 저장" /><Switch checked={false} onCheckedChange={() => {}} label="꺼짐" /><Switch checked={true} onCheckedChange={() => {}} label="비활성" disabled /><Switch boxed checked={s.on} onCheckedChange={(on) => set((v) => ({ ...v, on }))} label="인사이트" /></div> },
  { id: "radio", label: "RadioGroup", render: (s, set) => <RadioGroup aria-label="TLS" value={s.radio} onValueChange={(radio) => set((v) => ({ ...v, radio }))} items={[{ value: "acme", label: "acme", hint: "Let's Encrypt 로 자동 발급" }, { value: "self", label: "self_signed", hint: "로컬 테스트" }, { value: "none", label: "none" }]} /> },
  { id: "slider", label: "Slider", render: (s, set) => <Slider aria-label="CPU" value={s.cpu} onValueChange={(cpu) => set((v) => ({ ...v, cpu }))} format={(v) => `${v}%`} /> },
  { id: "progress", label: "Progress / accent · good · warn · bad", render: () => <div className="space-y-5"><Progress label="디스크" value={72} /><Progress label="메모리" value={38} tone="good" /><Progress label="CPU" value={87} tone="warn" /><Progress label="인증서 잔여" value={12} tone="bad" /></div> },
  // 표시
  { id: "dot-atom", label: "Dot / running · progress · failed · idle · info", render: () => <div className="flex items-center gap-4"><Dot tone="running" /><Dot tone="progress" /><Dot tone="failed" /><Dot tone="idle" /><Dot tone="info" /></div> },
  { id: "badge", label: "Badge / running · progress · failed · idle", render: () => <div className="flex items-center gap-3"><Badge tone="running"><Icon name="chart" size="sm" />dockerfile</Badge><Badge tone="progress">building</Badge><Badge tone="failed">failed</Badge><Badge tone="idle">stopped</Badge></div> },
  { id: "tile", label: "Tile / md · sm", render: () => <div className="flex items-center gap-4"><Tile>A</Tile><Tile><Icon name="project" /></Tile><Tile><Icon name="database" /></Tile><span className="w-px self-stretch bg-line" /><Tile size="sm">A</Tile><Tile size="sm"><Icon name="project" size="sm" /></Tile><Tile size="sm"><Icon name="database" size="sm" /></Tile></div> },
  { id: "avatar", label: "Avatar / 24 · 40 · 56", render: () => <div className="flex items-center gap-4"><Avatar name="gunhee" size={24} /><Avatar name="gunhee" size={40} /><Avatar name="gunhee" size={56} /></div> },
  { id: "kbd", label: "Kbd", render: () => <div className="flex items-center gap-3"><span className="flex items-center gap-1"><Kbd>⌘</Kbd><Kbd>K</Kbd></span><span className="flex items-center gap-1"><Kbd>⌘</Kbd><Kbd>0</Kbd></span><Kbd>Esc</Kbd></div> },
  { id: "separator", label: "Separator / 가로 · 세로 · label", render: () => <div className="flex h-6 items-center gap-6"><div className="w-40"><Separator /></div><Separator vertical /><div className="w-64"><Separator>또는</Separator></div></div> },
  { id: "code", label: "Code", render: () => <Code>{"pi token create web \\\n  --scope project_read --scope deploy"}</Code> },
  { id: "inline-code", label: "InlineCode", render: () => <p className="text-body text-sub">서버에서 <InlineCode>pi project create</InlineCode> 로 만든다.</p> },
  { id: "skeleton", label: "Skeleton", render: () => <Card className="space-y-3"><Skeleton className="h-6 w-40" /><Skeleton className="h-4 w-64" /><Skeleton className="h-12 w-full" /></Card> },
  // 바탕
  { id: "track", label: "Track", render: () => <Track><span className={`${SEG} bg-pill-on text-on-pill`}>칸</span><span className={SEG}>칸</span><span className={SEG}>칸</span></Track> },
  { id: "card", label: "Card", render: () => <Card title="상위 프로젝트" subtitle="178 개 배포" actions={<IconButton label="더" icon="more" />}><p className="text-body text-mute">본문 슬롯 — 여기에 ListRow·Stat·폼을 쌓는다.</p></Card> },
  { id: "callout", label: "Callout", render: () => <Callout title="secret 은 한 번만 보입니다">pi_a8f3… — 지금 복사해 두세요.</Callout> },
  // 차트
  { id: "sparkline", label: "Sparkline / accent · good · bad", render: () => <div className="flex items-center gap-8"><Sparkline points={[3, 5, 4, 7, 6, 9, 8, 11]} /><Sparkline points={[2, 4, 3, 6, 8, 7, 9, 12]} tone="good" /><Sparkline points={[9, 8, 8, 6, 7, 5, 4, 3]} tone="bad" /></div> },
  { id: "donut", label: "Donut", render: () => <div className="flex items-center gap-6 text-body-lg tabular-nums"><span className="flex items-center gap-3"><Donut value={88} />88%</span><span className="flex items-center gap-3"><Donut value={23} />23%</span><span className="flex items-center gap-3"><Donut value={0} />0%</span></div> },
  { id: "gauge", label: "Gauge", render: () => <Gauge value={0.72} start="10k" end="200k" /> },
  // 팝업
  { id: "tooltip", label: "Tooltip", render: () => <div className="flex items-center gap-3"><Tooltip content="127.0.0.1:20000 → 80"><Button variant="ghost">루프백</Button></Tooltip><Tooltip content="설정"><IconButton label="설정" variant="secondary" icon="settings" /></Tooltip></div> },
  // ── 2 분자
  // ── 2 분자
  // 컨트롤
  { id: "icon-button", label: "IconButton / ghost · secondary · primary · danger · sm · md · lg", render: () => <div className="flex flex-wrap items-center gap-3"><IconButton label="더" icon="more" /><IconButton label="검색" variant="secondary" icon="search" /><IconButton label="배포" variant="primary" icon="play" /><IconButton label="삭제" variant="danger" icon="trash" /><span className="w-px self-stretch bg-line" /><IconButton size="sm" label="복사" variant="secondary" icon="copy" /><IconButton label="복사" variant="secondary" icon="copy" /><IconButton size="lg" label="복사" variant="secondary" icon="copy" /><span className="w-px self-stretch bg-line" /><IconButton label="인사이트" variant="secondary" icon="insight" iconClassName="text-warn" /><IconButton label="비활성" variant="secondary" disabled icon="settings" /></div> },
  { id: "icon-text", label: "IconText", render: () => <div className="flex items-center gap-6"><IconText icon="calendar">5월 16일</IconText><IconText icon="clock">3분 전</IconText><IconText icon="domain">app.example.com</IconText></div> },
  { id: "search", label: "SearchInput", render: () => <SearchInput placeholder="이름·그룹·소스 검색" /> },
  { id: "input", label: "Field / hint", render: () => <Field label="호스트" hint="DNS 가 이 박스를 가리켜야 합니다"><Input placeholder="app.example.com" /></Field> },
  { id: "input-error", label: "Field / error", render: () => <Field label="포트" error="1–65535 사이여야 합니다"><Input defaultValue="99999" aria-invalid="true" /></Field> },
  { id: "checkbox", label: "Checkbox / on · off · disabled", render: (s, set) => <div className="flex flex-wrap items-center gap-6"><Checkbox checked={s.check} onCheckedChange={(check) => set((v) => ({ ...v, check }))} label="자동 배포" /><Checkbox checked={false} onCheckedChange={() => {}} label="꺼짐" /><Checkbox checked disabled onCheckedChange={() => {}} label="비활성" /></div> },
  { id: "select", label: "Select", render: (s, set) => <Select value={s.engine} onValueChange={(engine) => set((v) => ({ ...v, engine }))} items={[{ value: "postgres", label: "Postgres 16" }, { value: "redis", label: "Redis 7" }, { value: "minio", label: "MinIO" }]} /> },
  { id: "select-dense", label: "Select / dense", render: () => <Select dense value={null} onValueChange={() => {}} placeholder="선택" items={[{ value: "acme", label: "acme" }, { value: "none", label: "none" }]} /> },
  { id: "number", label: "NumberField", render: (s, set) => <div className="w-52"><NumberField aria-label="포트" value={s.port} onValueChange={(port) => set((v) => ({ ...v, port }))} min={1} max={65535} /></div> },
  { id: "combobox", label: "Combobox", render: (s, set) => <Combobox aria-label="프로젝트" items={PROJECTS} value={s.pick} onValueChange={(pick) => set((v) => ({ ...v, pick }))} placeholder="프로젝트 검색" /> },
  // 세그먼트 · 내비
  { id: "filter", label: "FilterTabs", render: (s, set) => <FilterTabs value={s.filter} onValueChange={(filter) => set((v) => ({ ...v, filter }))} items={[{ value: "all", label: "전체", count: 4 }, { value: "running", label: "돌고 있음", count: 1 }]} /> },
  { id: "tabs", label: "Tabs / count", render: (s, set) => <Tabs value={s.tab} onValueChange={(tab) => set((v) => ({ ...v, tab }))} tabs={[{ value: "overview", label: "개요" }, { value: "deploys", label: "배포", count: 12 }, { value: "env", label: "환경변수", count: 3 }]}><p className="text-body text-sub">{s.tab} 패널</p></Tabs> },
  { id: "toggle", label: "ToggleGroup", render: (s, set) => <ToggleGroup aria-label="보기" value={s.view} onValueChange={(view) => set((v) => ({ ...v, view }))} items={[{ value: "grid", label: "격자" }, { value: "list", label: "목록" }]} /> },
  { id: "chip", label: "Chip / active · removable", render: () => <div className="flex flex-wrap gap-3"><Chip active>돌고 있음</Chip><Chip onRemove={() => {}}>스택: dockerfile</Chip><Chip onRemove={() => {}}>그룹: api</Chip><Chip>전체</Chip></div> },
  { id: "toolbar", label: "Toolbar", render: (s, set) => <Toolbar className="mb-0" start={<FilterTabs value={s.filter} onValueChange={(filter) => set((v) => ({ ...v, filter }))} items={[{ value: "all", label: "주" }, { value: "running", label: "월" }]} />} end={<><SearchInput placeholder="검색" className="w-52" /><Button variant="primary" size="sm">전체 통계</Button></>} /> },
  { id: "breadcrumb", label: "Breadcrumb", render: () => <Breadcrumb items={[{ label: "프로젝트", href: "#" }, { label: "api", href: "#" }, { label: "production" }]} /> },
  { id: "pagination", label: "Pagination", render: (s, set) => <Pagination page={s.page} pages={12} onPageChange={(page) => set((v) => ({ ...v, page }))} /> },
  // 표시
  { id: "dot", label: "StatusDot / running · progress · failed · idle", render: () => <div className="flex items-center gap-6"><StatusDot tone="running">돌고 있음</StatusDot><StatusDot tone="progress">배포 중</StatusDot><StatusDot tone="failed">실패</StatusDot><StatusDot tone="idle">미배포</StatusDot></div> },
  { id: "notice", label: "Notice / progress · failed · info", render: () => <div className="space-y-3"><Notice>인증서가 12일 뒤 만료됩니다 — 워커가 갱신을 시도합니다.</Notice><Notice tone="failed">엣지가 :80 을 잡지 못했습니다 — 다른 프로세스가 듣고 있습니다.</Notice><Notice tone="info">20% 목표에 가까워졌습니다.</Notice></div> },
  { id: "dots", label: "DotMatrix", render: () => <DotMatrix groups={DOTS} /> },
  { id: "listrow", label: "ListRow", render: () => <Card className="space-y-5">{ROWS.slice(0, 3).map((r) => <ListRow key={r.id} lead={<Tile>{r.name[0].toUpperCase()}</Tile>} title={r.name} sub={r.env} value={r.pct * 47} />)}</Card> },
  { id: "stat", label: "Stat", render: () => <div className="grid grid-cols-2 gap-5"><Stat label="지난 24시간 요청" value="125,693" note="엣지로 들어온 것" delta="20% 목표에 가까워짐" /><Stat label="프로젝트" value="4" note="3개 돌고 있음" /></div> },
  { id: "stat-trend", label: "StatTrend / up · down", render: () => <div className="grid grid-cols-2 gap-5"><StatTrend label="지난 24시간 요청" value="125,693" delta="12%" up points={[3, 5, 4, 7, 6, 9, 8, 11]} /><StatTrend label="p95 응답" value="184ms" delta="8ms" points={[9, 8, 8, 6, 7, 5, 4, 3]} /></div> },
  // 팝업
  { id: "menu", label: "Menu", render: () => <div className="flex items-center gap-3"><Menu trigger={<Button>동작<Icon name="chevronDown" size="sm" className="flip-open" /></Button>}><MenuLabel>api · production</MenuLabel><MenuItem>열기</MenuItem><MenuItem>다시 배포</MenuItem><MenuItem>로그 보기</MenuItem><MenuSeparator /><MenuItem danger>프로젝트 삭제</MenuItem></Menu><Menu align="start" trigger={<IconButton label="더" variant="secondary" icon="more" />}><MenuItem>복사</MenuItem><MenuItem disabled>붙여넣기</MenuItem></Menu></div> },
  { id: "popover", label: "Popover", render: () => <Popover trigger={<Button>포트 20000<Icon name="chevronDown" size="sm" className="flip-open" /></Button>} title="루프백 포트" description="엣지가 이 포트로 넘긴다. 컨테이너 안에선 80.">
    <div className="flex items-center gap-3"><Mono className="text-text">127.0.0.1:20000</Mono><Button size="sm" variant="ghost">복사</Button></div></Popover> },
  { id: "dialog", label: "Dialog", render: (s, set) => <><Button onClick={() => set((v) => ({ ...v, dialog: true }))}>모달 열기</Button>
    <Dialog open={s.dialog} onOpenChange={(dialog) => set((v) => ({ ...v, dialog }))} title="도메인 붙이기" description="DNS 가 이 박스를 가리키면 엣지가 받습니다." footer={<><Button onClick={() => set((v) => ({ ...v, dialog: false }))}>취소</Button><Button variant="primary" onClick={() => set((v) => ({ ...v, dialog: false }))}>붙이기</Button></>}><div className="space-y-5"><Field label="호스트"><Input placeholder="app.example.com" autoFocus /></Field><Field label="TLS"><Select value="acme" onValueChange={() => {}} items={[{ value: "acme", label: "acme (Let's Encrypt)" }, { value: "self_signed", label: "self_signed" }, { value: "none", label: "none" }]} /></Field></div></Dialog></> },
  { id: "confirm", label: "ConfirmDialog", render: (s, set) => <><Button variant="danger" onClick={() => set((v) => ({ ...v, confirm: true }))}>삭제 확인</Button>
    <ConfirmDialog open={s.confirm} onOpenChange={(confirm) => set((v) => ({ ...v, confirm }))} title="api 를 지울까요?" description="컨테이너·포트 예약·도메인이 같이 사라집니다. 볼륨은 남습니다." onConfirm={() => set((v) => ({ ...v, confirm: false }))} /></> },
  { id: "accordion", label: "Accordion", render: () => <Accordion items={[{ value: "limits", title: "리소스 제한", hint: "CPU · 메모리", content: <div className="grid grid-cols-2 gap-4"><Field label="CPU"><Input placeholder="0.5" /></Field><Field label="메모리 MB"><Input placeholder="512" /></Field></div> }, { value: "git", title: "푸시 투 디플로이", hint: "GitHub 웹훅", content: <Field label="저장소 URL"><Input placeholder="https://github.com/…" /></Field> }, { value: "danger", title: "위험 구역", hint: "프로젝트 삭제", content: <Button variant="danger">프로젝트 삭제</Button> }]} /> },
  { id: "toast", label: "Toast / success · error · warning", render: () => <ToastDemo /> },
  // 표면
  { id: "empty", label: "EmptyState", render: () => <Card pad="p-0"><EmptyState title="아직 프로젝트가 없습니다" action={<Button variant="primary" size="sm">새 프로젝트</Button>}>서버에서 <InlineCode>pi project create</InlineCode> 로 만들어도 여기 나타납니다.</EmptyState></Card> },
  { id: "log", label: "LogViewer / streaming", render: () => <LogViewer state="streaming" lines={[{ id: 1, stream: "build", line: "#5 [1/2] FROM docker.io/library/nginx:alpine" }, { id: 2, stream: "build", line: "#7 exporting to image done" }, { id: 3, stream: "run", line: "started api at 127.0.0.1:20000 -> 80" }, { id: 4, stream: "error", line: "warn: EXPOSE 없음, 감지된 포트 80 사용" }, { id: 5, stream: "audit", line: "listening on :80" }]} /> },
  { id: "link", label: "Link / 기본 · external", render: () => <p className="text-body text-sub">문서는 <Link href="#">여기</Link>, 소스는 <Link href="#" external>GitHub</Link></p> },
  { id: "button-group", label: "ButtonGroup", render: () => <ButtonGroup><Button>하루</Button><Button>주</Button><Button>월</Button></ButtonGroup> },
  { id: "copy-field", label: "CopyField", render: () => <CopyField value="pi_a8f3c1d9e2b74f60" /> },
  { id: "radio-cards", label: "RadioCards", render: (s, set) => <RadioCards aria-label="스택" value={s.stack} onValueChange={(stack) => set((v) => ({ ...v, stack }))} items={[{ value: "dockerfile", label: "Dockerfile", hint: "있는 그대로 빌드", icon: "project" }, { value: "static", label: "정적", hint: "빌드 결과만 서빙", icon: "domain" }, { value: "node", label: "Node", hint: "감지된 런타임", icon: "bolt" }]} /> },
  { id: "fieldset", label: "Fieldset", render: () => <Fieldset title="리소스 제한" hint="컨테이너 하나에 줄 몫"><Field label="CPU"><Input placeholder="0.5" /></Field><Field label="메모리 MB"><Input placeholder="512" /></Field></Fieldset> },
  { id: "avatar-group", label: "AvatarGroup / max 4", render: () => <AvatarGroup names={["gunhee", "api", "blog", "worker", "draft", "cron"]} /> },
  { id: "meter", label: "Meter", render: () => <Meter label="디스크" total={256} unit="G" parts={[{ label: "이미지", value: 84, tone: "info" }, { label: "볼륨", value: 52, tone: "running" }, { label: "백업", value: 31, tone: "progress" }]} /> },
  { id: "tracker", label: "Tracker / 30일", render: () => <Tracker items={Array.from({ length: 30 }, (_, i) => ({ tone: i === 7 ? "failed" : i === 19 ? "progress" : "running", label: `${i + 1}일 · ${i === 7 ? "장애 12분" : i === 19 ? "느림" : "정상"}` }))} /> },
  { id: "steps", label: "Steps / done · current · upcoming · failed", render: () => <div className="space-y-6"><Steps items={[{ label: "큐", hint: "0.2s", state: "done" }, { label: "빌드", hint: "41s", state: "done" }, { label: "시작", hint: "헬스체크 대기", state: "current" }, { label: "라우팅", state: "upcoming" }]} /><Steps items={[{ label: "큐", state: "done" }, { label: "빌드", hint: "exit 1", state: "failed" }, { label: "시작", state: "upcoming" }, { label: "라우팅", state: "upcoming" }]} /></div> },
  { id: "timeline", label: "Timeline", render: () => <Timeline items={[{ time: "14:02:11", title: "api 배포 시작", description: "a1b2c3d · gunhee", tone: "info" }, { time: "14:02:52", title: "빌드 완료", tone: "running" }, { time: "14:03:04", title: "헬스체크 실패 — 재시도 1/3", tone: "failed" }, { time: "14:03:20", title: "라우팅 · :80 → 20000", tone: "running" }]} /> },
  { id: "key-value", label: "KeyValue", render: () => <KeyValue items={[{ label: "호스트", value: "app.example.com", mono: true }, { label: "포트", value: "127.0.0.1:20000 → 80", mono: true }, { label: "커밋", value: "a1b2c3d", mono: true }, { label: "상태", value: <StatusDot tone="running">돌고 있음</StatusDot> }]} /> },
  { id: "sheet", label: "Sheet", render: (s, set) => <><Button onClick={() => set((v) => ({ ...v, sheet: true }))}>시트 열기</Button><Sheet open={s.sheet} onOpenChange={(sheet) => set((v) => ({ ...v, sheet }))} title="api 설정" description="production" footer={<><Button onClick={() => set((v) => ({ ...v, sheet: false }))}>취소</Button><Button variant="primary" onClick={() => set((v) => ({ ...v, sheet: false }))}>저장</Button></>}><Fieldset title="도메인"><Field label="호스트"><Input placeholder="app.example.com" /></Field></Fieldset></Sheet></> },
  { id: "command", label: "Command / ⌘K", render: (s, set) => <><Button onClick={() => set((v) => ({ ...v, cmd: true }))}>명령 팔레트<Kbd>⌘</Kbd><Kbd>K</Kbd></Button><Command open={s.cmd} onOpenChange={(cmd) => set((v) => ({ ...v, cmd }))} items={[{ id: "1", label: "api", hint: "프로젝트", icon: "project", onSelect: () => {} }, { id: "2", label: "blog", hint: "프로젝트", icon: "project", onSelect: () => {} }, { id: "3", label: "새 배포", icon: "deploy", keys: ["⌘", "D"], onSelect: () => {} }, { id: "4", label: "로그 보기", icon: "log", onSelect: () => {} }, { id: "5", label: "설정", icon: "settings", keys: ["⌘", ","], onSelect: () => {} }]} /></> },
  { id: "container", label: "Container / 1120", render: () => <Container className="rounded-tile bg-card py-3 text-center text-caption text-mute">max 1120 + 24</Container> },
  { id: "card-footer", label: "Card / footer", render: () => <Card title="도메인" subtitle="app.example.com" footer={<><Button size="sm">취소</Button><Button size="sm" variant="primary">저장</Button></>}><p className="text-body text-sub">본문</p></Card> },
  { id: "avatar-status", label: "Avatar / status", render: () => <div className="flex items-center gap-4"><Avatar name="gunhee" status="running" /><Avatar name="blog" status="progress" /><Avatar name="worker" status="failed" /><Avatar name="draft" status="idle" size={56} /></div> },
  { id: "switch-hint", label: "Switch / hint", render: (s, set) => <Switch checked={s.on} onCheckedChange={(on) => set((v) => ({ ...v, on }))} label="자동 배포" hint="main 에 푸시하면 바로 배포" /> },
  { id: "checkbox-hint", label: "Checkbox / hint", render: (s, set) => <Checkbox checked={s.check} onCheckedChange={(check) => set((v) => ({ ...v, check }))} label="이메일 알림" hint="배포 실패·인증서 만료 때만" /> },
  { id: "input-group", label: "InputGroup / prefix · suffix · end", render: () => <div className="space-y-6"><InputGroup prefix="https://" suffix=".example.com" defaultValue="api" /><InputGroup prefix="포트" defaultValue="8080" suffix="tcp" /><InputGroup placeholder="도메인" end={<Button>붙이기</Button>} /></div> },
  { id: "form-row", label: "FormRow · FormActions", render: () => <div><div className="divide-y divide-line"><FormRow label="이름" hint="URL 과 컨테이너 이름"><Input defaultValue="api" /></FormRow><FormRow label="포트" hint="컨테이너가 듣는 포트"><Input defaultValue="80" className="w-40" /></FormRow></div><FormActions className="mt-6"><Button>취소</Button><Button variant="primary">저장</Button></FormActions></div> },
  { id: "action-panel", label: "ActionPanel / 옆 · 아래", render: () => <div className="space-y-5"><ActionPanel title="지금 백업" description="볼륨과 데이터베이스를 스냅샷으로" action={<Button variant="primary">백업</Button>} /><ActionPanel below title="웹훅 URL" description="GitHub 저장소 설정에 붙여 넣는다" action={<CopyField value="https://app.example.com/hooks/gh/8f3c" />} /></div> },
  { id: "nav-list", label: "NavList", render: (s, set) => <NavList className="w-[220px]" value={s.nav} onValueChange={(nav) => set((v) => ({ ...v, nav }))} items={[{ value: "general", label: "일반", icon: "settings" }, { value: "build", label: "빌드", icon: "project" }, { value: "domains", label: "도메인", icon: "domain", count: 1 }, { value: "env", label: "환경변수", icon: "secret", count: 3 }]} /> },
  { id: "section-heading", label: "SectionHeading", render: () => <SectionHeading title="도메인" description="이 프로젝트로 오는 호스트" actions={<Button size="sm" variant="primary">붙이기</Button>} /> },
  { id: "list", label: "List", render: () => <List>{ROWS.slice(0, 3).map((r) => <ListRow key={r.id} lead={<Tile size="sm">{r.name[0].toUpperCase()}</Tile>} title={r.name} sub={r.env} end={<><Badge tone={toneOf(r.status)} size="sm">{r.status}</Badge><IconButton size="sm" label="더" icon="more" /></>} />)}</List> },
  { id: "listrow-end", label: "ListRow / end", render: () => <Card><ListRow lead={<Avatar name="gunhee" status="running" />} title="gunhee" sub="owner" end={<><Badge tone="idle" size="sm">admin</Badge><IconButton size="sm" label="더" icon="more" /></>} /></Card> },
  { id: "timeline-lead", label: "Timeline / avatar", render: () => <Timeline items={[{ time: "14:02", title: "gunhee 가 배포 #48 을 시작", lead: <Avatar name="gunhee" size={24} /> }, { time: "14:03", title: "worker 가 헬스체크 통과", lead: <Avatar name="worker" size={24} /> }]} /> },
  { id: "notice-action", label: "Notice / action · dismiss", render: (s, set) => s.notice ? <Notice tone="progress" action={<Button size="sm" variant="ghost">갱신</Button>} onDismiss={() => set((v) => ({ ...v, notice: false }))}>인증서가 12일 뒤 만료됩니다</Notice> : <Button size="sm" onClick={() => set((v) => ({ ...v, notice: true }))}>다시 보이기</Button> },
  { id: "calendar", label: "Calendar", render: (s, set) => <Calendar initialMonth={new Date(2026, 8, 1)} selected={s.day} onSelect={(day) => set((v) => ({ ...v, day }))} marks={{ "2026-09-03": "running", "2026-09-08": "failed", "2026-09-15": "progress" }} /> },
  { id: "page-heading", label: "PageHeading", render: () => <PageHeading crumbs={[{ label: "프로젝트", href: "#" }, { label: "api" }]} title="api" meta={<><StatusDot tone="running">돌고 있음</StatusDot><IconText icon="domain">app.example.com</IconText></>} actions={<><Button>로그</Button><Button variant="primary">다시 배포</Button></>} /> },
  { id: "sign-in", label: "SignInCard", render: () => <SignInCard className="w-[400px]" onSubmit={() => {}} /> },
  { id: "x-detail", label: "DetailScreen / 상세", frame: true, render: () => <DetailScreen /> },
  { id: "x-settings", label: "SettingsScreen / 설정", frame: true, render: () => <SettingsScreen /> },
  // ── 3 유기체
  // ── 3 유기체
  // 셸
  { id: "topbar", label: "TopBar", render: () => <TopBar search={<SearchInput placeholder="검색  ⌘K" />} status={<StatusDot tone="running">엣지 up</StatusDot>} avatar={<Avatar name="gunhee" size={36} />} /> },
  // 카드
  { id: "o-top", label: "TopProjects", render: () => <div className="w-[340px]"><TopProjects /></div> },
  { id: "o-edge", label: "EdgeRequests", render: () => <EdgeRequests /> },
  { id: "o-deploys", label: "RecentDeploys", render: () => <RecentDeploys /> },
  // 리소스 — 확정 규격(2026-09-09)
  { id: "o-band", label: "ResourceBand / 기본 · 토글", render: () => <div className="space-y-6"><ResourceBand label="CPU" value="34%" points={BAND_TOTAL} parts={BAND_PARTS} pct={34} max={100} format={(v) => `${v}%`} /><ResourceBand label="Disk I/O" value="11.1 MB/s" points={wave(3, 60, 11, 5)} parts={[{ name: "worker", value: "4.7 MB/s", share: 22, points: wave(6, 60, 5, 3) }, { name: "postgres", value: "3.9 MB/s", share: 18, points: wave(11, 60, 4, 2) }]} pct={55} format={(v) => `${v}M`} modes={[{ value: "sum", label: "Total" }, { value: "a", label: "Read" }, { value: "b", label: "Write" }]} /></div> },
  { id: "o-bands", label: "ResourceBands / 카드", render: () => <div><ResourceBands><div><ResourceBand label="CPU" value="34%" points={BAND_TOTAL} parts={BAND_PARTS} pct={34} max={100} format={(v) => `${v}%`} /></div><div><ResourceBand label="Memory" value="3.5 GB" points={wave(7, 60, 3.5, 0.4)} parts={[{ name: "api", value: "1.6 GB", share: 10 }, { name: "postgres", value: "0.9 GB", share: 6 }]} pct={22} max={16} format={(v) => `${v}G`} /></div></ResourceBands></div> },
  { id: "o-devices", label: "DeviceList / 마운트 목록", render: () => <DeviceList devices={[{ name: "Internal disk", used: 428, total: 512, history: RISE(407, 0.74) }, { name: "External SSD", used: 1300, total: 2000, history: RISE(1213, 3.0) }, { name: "Backup HDD", used: 1204, total: 4000, history: RISE(1150, 1.9) }]} /> },
  // ── 4 템플릿
  // ── 4 템플릿
  // 분석 대시보드
  { id: "x-analytics", label: "Analytics / 홈", frame: true, render: () => <Analytics /> },
];
const BY_ID = Object.fromEntries(ITEMS.map((it) => [it.id, it]));
// 묶음 이름·순서는 컴포넌트 라이브러리들의 공통 어휘를 따른다(MUI·Ant Design·Chakra·Polaris 가 쓰는 역할 분류):
// 동작 → 입력 → 표시 → 피드백 → 내비게이션 → 오버레이 → 표면. 층(0~4)이 세로 축, 역할이 가로 축이라
// "어느 층의 무슨 역할" 로 한 번에 찾힌다. 묶음 안은 컴포넌트 이름 알파벳 순, 같은 컴포넌트의 변형은 붙여 둔다.
const SECTIONS: RowDef[] = [
  { title: "0 토큰", cells: [
    { title: "색 · 모양", items: ["color", "gauge-token", "type", "shape", "spacing"] },
    { title: "아이콘", items: ["icon", "icon-size", "icon-color"] },
    { title: "모션 · 커서", items: ["motion", "cursor"] },
  ] },
  { title: "1 원자", cells: [
    { title: "동작", items: ["button", "button-sm", "link"] },
    { title: "입력", items: ["input-dense", "input-disabled", "radio", "slider", "switch", "switch-hint", "textarea"] },
    { title: "표시", items: ["avatar", "avatar-status", "badge", "code", "donut", "dot-atom", "gauge", "inline-code", "kbd", "sparkline", "tile"] },
    { title: "피드백", items: ["progress", "skeleton", "spinner"] },
    { title: "오버레이", items: ["tooltip"] },
    { title: "표면", items: ["callout", "card", "card-footer", "container", "separator", "track"] },
  ] },
  { title: "2 분자", cells: [
    { title: "동작", items: ["button-group", "chip", "icon-button"] },
    { title: "입력", items: ["calendar", "checkbox", "checkbox-hint", "combobox", "copy-field", "fieldset", "form-row", "input", "input-error", "input-group", "number", "radio-cards", "search", "select", "select-dense"] },
    { title: "표시", items: ["accordion", "avatar-group", "dot", "dots", "icon-text", "key-value", "list", "listrow", "listrow-end", "meter", "stat", "stat-trend", "steps", "timeline", "timeline-lead", "tracker"] },
    { title: "피드백", items: ["empty", "log", "notice", "notice-action", "toast"] },
    { title: "내비게이션", items: ["breadcrumb", "filter", "nav-list", "pagination", "tabs", "toggle", "toolbar"] },
    { title: "오버레이", items: ["command", "confirm", "dialog", "menu", "popover", "sheet"] },
    { title: "표면", items: ["action-panel", "section-heading"] },
  ] },
  { title: "3 유기체", cells: [
    { title: "셸", items: ["page-heading", "sign-in", "topbar"] },
    { title: "카드", items: ["o-deploys", "o-edge", "o-top"] },
    { title: "리소스", items: ["o-band", "o-bands", "o-devices"] },
  ] },
  { title: "4 템플릿", cells: [
    { title: "화면 1280 × 800 · 50%", items: ["x-analytics", "x-detail", "x-settings"] },
  ] },
];

// 리소스 유기체 캔버스 샘플 — 고정 시계열(캔버스는 움직이지 않는다)
const wave = (seed: number, n: number, base: number, amp: number) => Array.from({ length: n }, (_, i) => Math.max(0, Math.round((base + Math.sin((i + seed) / 9) * amp + Math.sin((i + seed) / 3) * amp * 0.3) * 10) / 10));
const BAND_TOTAL = wave(0, 60, 34, 12);
// 저장 장치 표본 — 세 상태(정상·주의·경고)가 한 보드에서 다 보이게. 용량은 천천히 자란다.
const RISE = (base: number, step: number) => Array.from({ length: 30 }, (_, i) => Math.round((base + i * step) * 10) / 10);
const BAND_PARTS = [
  { name: "worker", value: "18%", share: 18, points: wave(4, 60, 18, 8) },
  { name: "api", value: "11%", share: 11, points: wave(9, 60, 11, 4) },
  { name: "postgres", value: "4%", share: 4, points: wave(15, 60, 4, 2) },
];

const ZOOM_KEY = "pi-canvas-zoom";
const clamp = (z: number) => Math.min(2, Math.max(0.25, z));

export function Canvas() {
  const [state, set] = useState<State>({ filter: "all", tab: "overview", on: true, engine: "postgres", dialog: false, confirm: false, check: true, radio: "acme", port: 8080, cpu: 50, pick: null, view: "grid", page: 3, sheet: false, cmd: false, stack: "dockerfile", day: "2026-09-12", nav: "general", notice: true });
  const main = useRef<HTMLElement>(null);
  const content = useRef<HTMLDivElement>(null);
  // 줌은 DOM 에 직접 건다 — 리액트 렌더를 기다리면 스크롤 보정과 한 프레임 어긋나 튄다. 상태는 표시용.
  const zoomRef = useRef(1);
  const [label, setLabel] = useState(100);
  const [theme, setTheme] = useState<"dark" | "light">(() => (localStorage.getItem("pi-theme") === "light" ? "light" : "dark"));
  useEffect(() => {
    const html = document.documentElement;
    if (html.dataset.theme && html.dataset.theme !== theme) { html.dataset.themeFade = ""; window.setTimeout(() => delete html.dataset.themeFade, 320); }
    html.dataset.theme = theme; localStorage.setItem("pi-theme", theme);
  }, [theme]);
  const anim = useRef(0);

  /** 한 번에 적용 — 기준점(커서 또는 화면 가운데)이 제자리에 있도록 같은 프레임에서 스크롤을 보정한다. */
  const apply = (next: number, at?: { x: number; y: number }) => {
    const el = main.current, box = content.current; if (!el || !box) return;
    const z = clamp(next), prev = zoomRef.current; if (z === prev) return;
    const r = el.getBoundingClientRect();
    const px = at ? at.x - r.left : el.clientWidth / 2, py = at ? at.y - r.top : el.clientHeight / 2;
    const k = z / prev, left = (el.scrollLeft + px) * k - px, top = (el.scrollTop + py) * k - py;
    zoomRef.current = z; box.style.zoom = String(z); el.scrollLeft = left; el.scrollTop = top;
    setLabel(Math.round(z * 100)); localStorage.setItem(ZOOM_KEY, String(z));
  };
  /** 버튼·단축키는 160ms 이징으로 — 뚝뚝 끊기지 않게. 100% 근처는 100 으로 붙인다. */
  const animateTo = (target: number, at?: { x: number; y: number }) => {
    cancelAnimationFrame(anim.current);
    const from = zoomRef.current, to = clamp(Math.abs(target - 1) < 0.04 ? 1 : target), t0 = performance.now();
    const step = (now: number) => { const t = Math.min(1, (now - t0) / 160), e = 1 - Math.pow(1 - t, 3); apply(from + (to - from) * e, at); if (t < 1) anim.current = requestAnimationFrame(step); };
    anim.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    const el = main.current; if (!el) return;
    const saved = Number(localStorage.getItem(ZOOM_KEY)); if (saved >= 0.25 && saved <= 2 && saved !== 1) { zoomRef.current = 1; apply(saved); }
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return; e.preventDefault(); cancelAnimationFrame(anim.current);
      // 트랙패드 핀치는 작은 delta 가 연속으로, 마우스 휠은 큰 delta 가 드문드문 — 둘 다 부드럽게
      const d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      apply(zoomRef.current * Math.exp(-Math.max(-40, Math.min(40, d)) * 0.004), { x: e.clientX, y: e.clientY });
    };
    const onKey = (e: KeyboardEvent) => { if (!(e.metaKey || e.ctrlKey)) return; if (e.key === "=" || e.key === "+") { e.preventDefault(); animateTo(zoomRef.current * 1.2); } else if (e.key === "-") { e.preventDefault(); animateTo(zoomRef.current / 1.2); } else if (e.key === "0") { e.preventDefault(); animateTo(1); } };
    el.addEventListener("wheel", onWheel, { passive: false }); window.addEventListener("keydown", onKey);
    return () => { el.removeEventListener("wheel", onWheel); window.removeEventListener("keydown", onKey); cancelAnimationFrame(anim.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <TooltipProvider>
      <ToastProvider>
      <div className="relative h-dvh bg-bg text-text">
        {/* 떠 있는 도구 — 우하단. 테마 · 줌. 사이드바는 없다(사용자 결정 2026-09-08). */}
        <div className="absolute bottom-5 end-5 z-20 flex items-center gap-1 rounded-popup bg-card p-1 ring-1 ring-line" role="group" aria-label="캔버스 도구">
          <IconButton size="sm" label={theme === "dark" ? "라이트로" : "다크로"} icon={theme === "dark" ? "moon" : "sun"} onClick={() => setTheme(theme === "dark" ? "light" : "dark")} />
          <IconButton size="sm" label="Lab" icon="insight" onClick={() => { location.hash = "#lab"; }} />
          <IconButton size="sm" label="Storage Lab" icon="volume" onClick={() => { location.hash = "#storage"; }} />
          <span className="mx-0.5 h-5 w-px bg-line" />
          <IconButton size="sm" label="축소" icon="remove" onClick={() => animateTo(zoomRef.current / 1.2)} />
          <Button size="sm" variant="ghost" aria-label="원래 크기" onClick={() => animateTo(1)} className="min-w-12 px-1.5 font-mono tabular-nums">{label}%</Button>
          <IconButton size="sm" label="확대" icon="add" onClick={() => animateTo(zoomRef.current * 1.2)} />
        </div>
        <main ref={main} className="h-full overflow-auto bg-bg [background-image:radial-gradient(var(--grid)_1px,transparent_1px)] [background-size:24px_24px]" aria-label="캔버스">
          {/* 리듬: 라벨→요소 8, 같은 컴포넌트의 변형끼리 24, 다른 컴포넌트 56, 섹션 96(+hairline). 라벨 트랙 120, 라벨↔콘텐츠 40, 콘텐츠 960(2026-09-09: 640 에서 넓힘 — 리소스 유기체를 축소 없이 100% 로 보려고). */}
          <div ref={content} className="grid items-start gap-x-10 p-12" style={{ gridTemplateColumns: "120px 960px" }}>
            {SECTIONS.map((row, si) => (
              <div key={row.title} className={`col-span-2 grid items-start gap-x-10 ${si > 0 ? "mt-24 border-t border-line pt-12" : ""}`} style={{ gridTemplateColumns: "subgrid" }}>
                {/* 왼쪽 목차 — 층 이름 + 그 층의 역할 묶음. 어느 층의 무슨 역할인지 한 눈에 보이고 눌러서 건너뛴다. */}
                <div className="sticky top-0 py-1">
                  <p className="font-mono text-caption uppercase tracking-wide text-text">{row.title}</p>
                  <nav className="mt-3 space-y-1">
                    {row.cells.map((cell, ci) => (
                      <a key={cell.title} href={`#g-${si}-${ci}`} className="-mx-2 flex items-baseline justify-between gap-2 rounded-[6px] px-2 py-1 font-mono text-[11px] leading-4 text-mute interactive">
                        <span className="truncate">{cell.title}</span><span className="tabular-nums opacity-60">{cell.items.length}</span>
                      </a>
                    ))}
                  </nav>
                </div>
                <div>
                  {row.cells.map((cell, ci) => (
                    <div key={cell.title} id={`g-${si}-${ci}`} className={`scroll-mt-12 ${ci > 0 ? "mt-20" : ""}`}>
                      <p className="mb-6 flex items-center gap-3 font-mono text-caption text-text">{cell.title}<span className="text-mute">{cell.items.length}</span><span className="h-px flex-1 bg-line" /></p>
                      {cell.items.map((id, i, ids) => {
                        const it = BY_ID[id];
                        const prev = i > 0 ? BY_ID[ids[i - 1]] : null;
                        const head = (l: string) => l.split(/ [/=] /)[0];
                        const same = prev && head(prev.label) === head(it.label);
                        return (
                          <div key={id} id={id} data-item className={i === 0 ? "" : same ? "mt-6" : "mt-14"}>
                            <p className="mb-2 truncate font-mono text-caption text-mute">{it.label}</p>
                            {/* 템플릿(frame)만 규격 화면 1280×800 을 50% 로 축소한다. 그 외 컴포넌트는 전부 100% — 축소해 놓으면 캔버스 안에서 크기가 서로 어긋나 보인다(사용자 지적 2026-09-09). */}
                            {it.frame ? <div className="h-[800px] w-[1280px] overflow-hidden rounded-card bg-bg ring-1 ring-line" style={{ zoom: 0.5 }}>{it.render(state, set)}</div> : it.render(state, set)}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
      </ToastProvider>
    </TooltipProvider>
  );
}
