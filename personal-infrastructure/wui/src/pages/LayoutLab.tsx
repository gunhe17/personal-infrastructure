import { Avatar, Badge, Breadcrumb, Button, Card, cn, DeviceList, Dot, Icon, IconButton, IconText, type IconName, ListRow, NavList, PageHeading, ResourceBand, ResourceBands, SearchInput, SectionHeading, Separator, StatusDot, Tabs, Tile, Toolbar } from "@/ui";
import { useState } from "react";

// Layout Lab — 서비스 전체의 뼈대 후보(사용자 요청 2026-09-09). 관리자 콘솔들이 쓰는 다섯 가지를 우리 키트로.
// 조사 대상: Vercel·Railway(상단 바 + 가운데 폭) · Grafana·Portainer·Proxmox(왼쪽 사이드바) · Linear·Sentry·Cloudflare(아이콘 레일 + 보조 내비)
//           · GitHub(상단 바 + 대상 탭) · Fly.io 로그·k8s 대시보드(목록–상세 분할).

/** 기능 지도(.claude/reference/ui-feature-map.md)에서 온 최상위 이동. 홈서버 하나를 혼자 관리하는 사람 기준. */
const NAV: { value: string; label: string; icon: IconName; count?: number }[] = [
  { value: "overview", label: "Overview", icon: "insight" },
  { value: "projects", label: "Projects", icon: "project", count: 4 },
  { value: "deployments", label: "Deployments", icon: "deploy" },
  { value: "domains", label: "Domains", icon: "domain", count: 3 },
  { value: "databases", label: "Databases", icon: "database" },
  { value: "storage", label: "Storage", icon: "volume" },
  { value: "backups", label: "Backups", icon: "backup" },
  { value: "edge", label: "Edge", icon: "edge" },
  { value: "jobs", label: "Jobs", icon: "job" },
  { value: "resources", label: "Resources", icon: "monitor" },
  { value: "audit", label: "Audit", icon: "audit" },
  { value: "settings", label: "Settings", icon: "settings" },
];
const PRIMARY = NAV.slice(0, 6), SECONDARY = NAV.slice(6);
const SPARK = Array.from({ length: 60 }, (_, i) => Math.round((34 + Math.sin(i / 9) * 12 + Math.sin(i / 3) * 4) * 10) / 10);
const DEVICES = [{ name: "Internal disk", used: 428, total: 512, history: Array.from({ length: 30 }, (_, i) => 407 + i * 0.74) }, { name: "External SSD", used: 638, total: 2000, history: Array.from({ length: 30 }, (_, i) => 548 + i * 3) }];

/** 화면 속 본문 — 어느 레이아웃에 넣어도 같은 내용이라 뼈대만 비교된다. */
function Body({ dense }: { dense?: boolean }) {
  return (
    <div className={cn("space-y-5", dense && "space-y-4")}>
      <PageHeading crumbs={[{ label: "Home", href: "#" }, { label: "Overview" }]} title="Overview"
        meta={<><IconText icon="server">homeserver · 8 cores · 16 GB</IconText><IconText icon="clock">Up 6d 4h</IconText><span className="inline-flex items-center gap-2 text-body text-mute"><Dot tone="progress" pulse />Live</span></>}
        actions={<Button variant="primary" size="sm">New project</Button>} />
      <ResourceBands>
        <div><ResourceBand label="CPU" value="34%" points={SPARK} pct={34} max={100} format={(v) => `${v}%`} parts={[{ name: "worker", value: "18%", share: 18 }, { name: "api", value: "11%", share: 11 }]} /></div>
      </ResourceBands>
      {/* 장치 목록은 3열(180 + 그래프 + 160)이라 600 아래에서 접힌다 — 넓은 쪽에 둔다 */}
      <div className="grid grid-cols-[1fr_340px] gap-5">
        <DeviceList devices={DEVICES} />
        <Card title="Recent deployments">
          <div className="divide-y divide-line [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
            {[["api", "2m ago", "running"], ["blog", "1h ago", "running"], ["worker", "6h ago", "failed"]].map(([n, t, st]) => (
              <div key={n} className="flex items-center justify-between gap-4 py-3">
                <ListRow lead={<Tile size="sm">{n[0].toUpperCase()}</Tile>} title={n} sub={t} />
                <Badge tone={st === "failed" ? "failed" : "running"} size="sm">{st}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/** 1280×800 규격 프레임 — 템플릿과 같은 방식으로 50% 축소해 나란히 비교한다. */
function Frame({ children }: { children: React.ReactNode }) {
  return <div className="h-[800px] w-[1280px] overflow-hidden rounded-card bg-bg ring-1 ring-line" style={{ zoom: 0.5 }}>{children}</div>;
}
function Option({ id, title, from, fit, children }: { id: string; title: string; from: string; fit: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-16 first:mt-0">
      <SectionHeading title={title} description={<><span className="text-text">참고</span> {from} · <span className="text-text">맞는 경우</span> {fit}</>} />
      {children}
    </section>
  );
}
const Brand = ({ mini }: { mini?: boolean }) => (
  <span className="flex min-w-0 items-center gap-3 text-body font-medium text-text"><Avatar name="P" size={24} />{!mini && <span className="truncate">personal-infrastructure</span>}</span>
);
const User = () => <div className="flex items-center gap-4"><StatusDot tone="running">edge up</StatusDot><Avatar name="gunhee" size={32} /></div>;

/** L1 — 상단 바 + 가운데 폭(지금 AppShell). Vercel·Railway. */
function L1() {
  return (
    <Frame>
      <div className="mx-auto w-full max-w-[1168px] px-6 pt-4">
        <Card pad="px-6 py-0" className="flex h-16 items-center justify-between gap-6">
          <Brand />
          <nav className="flex items-center gap-1">{PRIMARY.map((n, i) => <span key={n.value} className={cn("rounded-control px-3 py-2 text-body interactive", i === 0 ? "bg-card-2 font-medium text-text" : "text-mute")}>{n.label}</span>)}<IconButton size="sm" label="더" icon="more" /></nav>
          <User />
        </Card>
      </div>
      <div className="mx-auto w-full max-w-[1168px] px-6 py-8"><Body /></div>
    </Frame>
  );
}

/** L2 — 왼쪽 사이드바 240 고정. Grafana·Portainer·Proxmox. */
function L2() {
  const [cur, setCur] = useState("overview");
  return (
    <Frame>
      <div className="flex h-full">
        <aside className="flex w-[240px] shrink-0 flex-col gap-6 bg-card p-4">
          <div className="px-2 pt-2"><Brand /></div>
          <SearchInput placeholder="Search  ⌘K" />
          <NavList items={PRIMARY} value={cur} onValueChange={setCur} />
          <Separator />
          <NavList items={SECONDARY} value={cur} onValueChange={setCur} />
          <div className="mt-auto px-2"><User /></div>
        </aside>
        <main className="min-w-0 flex-1 overflow-hidden p-8"><Body /></main>
      </div>
    </Frame>
  );
}

/** L3 — 아이콘 레일 64 + 구역 내비 200. Linear·Sentry·Cloudflare. */
function L3() {
  const [cur, setCur] = useState("resources");
  return (
    <Frame>
      <div className="flex h-full">
        <nav className="flex w-16 shrink-0 flex-col items-center gap-2 bg-card py-4">
          <Avatar name="P" size={32} />
          <span className="my-1 h-px w-6 bg-line" />
          {PRIMARY.map((n, i) => <IconButton key={n.value} size="md" label={n.label} icon={n.icon} variant={i === 0 ? "secondary" : "ghost"} />)}
          <span className="mt-auto"><Avatar name="gunhee" size={32} /></span>
        </nav>
        <aside className="flex w-[200px] shrink-0 flex-col gap-4 bg-card-2 p-3 surface-2">
          <p className="px-2 pt-1 text-body font-medium text-text">System</p>
          <NavList items={SECONDARY} value={cur} onValueChange={setCur} />
        </aside>
        <main className="min-w-0 flex-1 overflow-hidden p-8"><Body /></main>
      </div>
    </Frame>
  );
}

/** L4 — 상단 바 + 대상 탭. GitHub 저장소처럼 "지금 보는 대상" 안에서 탭으로 옮긴다. */
function L4() {
  return (
    <Frame>
      <div className="bg-card">
        <div className="mx-auto flex h-16 w-full max-w-[1168px] items-center justify-between gap-6 px-6"><Brand /><SearchInput className="max-w-md flex-1" placeholder="Search  ⌘K" /><User /></div>
        <div className="mx-auto w-full max-w-[1168px] px-6">
          <div className="flex items-center gap-3 pb-4">
            <Breadcrumb items={[{ label: "homeserver", href: "#" }, { label: "api" }]} />
            <Badge tone="running" size="sm">running</Badge>
          </div>
          <Tabs value="overview" onValueChange={() => {}} tabs={[{ value: "overview", label: "Overview" }, { value: "deploy", label: "Deployments", count: 12 }, { value: "domains", label: "Domains", count: 3 }, { value: "storage", label: "Storage" }, { value: "logs", label: "Logs" }, { value: "settings", label: "Settings" }]} />
        </div>
      </div>
      <div className="mx-auto w-full max-w-[1168px] px-6 py-8"><Body /></div>
    </Frame>
  );
}

/** L5 — 사이드바 + 목록–상세 분할. Fly.io 로그·k8s 대시보드. */
function L5() {
  return (
    <Frame>
      <div className="flex h-full">
        <nav className="flex w-16 shrink-0 flex-col items-center gap-2 bg-card py-4">
          <Avatar name="P" size={32} />
          <span className="my-1 h-px w-6 bg-line" />
          {PRIMARY.map((n, i) => <IconButton key={n.value} size="md" label={n.label} icon={n.icon} variant={i === 1 ? "secondary" : "ghost"} />)}
          <span className="mt-auto"><Avatar name="gunhee" size={32} /></span>
        </nav>
        <aside className="flex w-[280px] shrink-0 flex-col gap-3 bg-card p-4">
          <Toolbar start={<SearchInput placeholder="Filter projects" />} />
          <div className="flex flex-col gap-1">
            {[["api", "running"], ["blog", "running"], ["worker", "failed"], ["postgres", "running"]].map(([n, st], i) => (
              <button key={n} type="button" className={cn("flex items-center justify-between gap-3 rounded-control px-3 py-2 text-start interactive", i === 0 && "bg-card-2")}>
                <ListRow lead={<Tile size="sm">{n[0].toUpperCase()}</Tile>} title={n} sub="dockerfile" />
                <Dot tone={st === "failed" ? "failed" : "running"} />
              </button>
            ))}
          </div>
        </aside>
        <main className="min-w-0 flex-1 overflow-hidden p-8">
          <div className="mb-5 flex items-center gap-3"><Icon name="project" /><span className="text-title text-text">api</span><Badge tone="running" size="sm">running</Badge></div>
          <Body dense />
        </main>
      </div>
    </Frame>
  );
}

export function LayoutLab() {
  return (
    <div className="min-h-full bg-bg">
      <div className="mx-auto w-full max-w-[1400px] px-6 py-10">
        <PageHeading crumbs={[{ label: "Home", href: "#" }, { label: "Lab" }, { label: "Layout" }]} title="Service layout"
          meta={<><IconText icon="layers">Five admin-console skeletons · 1280 × 800 at 50%</IconText><IconText icon="project">Same content in every frame</IconText></>} />
        <div className="mt-8">
          <Option id="l1" title="L1 · Top bar + centered container" from="Vercel · Railway — 지금 AppShell" fit="구역이 예닐곱 이하일 때. 화면 폭을 본문이 다 쓴다. 구역이 늘면 상단 바가 넘친다"><L1 /></Option>
          <Option id="l2" title="L2 · Left sidebar 240" from="Grafana · Portainer · Proxmox" fit="구역이 열 개 넘고 자주 옮겨 다닐 때. 현재 위치가 늘 보인다. 본문 폭 240 손해"><L2 /></Option>
          <Option id="l3" title="L3 · Icon rail 64 + section nav 200" from="Linear · Sentry · Cloudflare" fit="최상위는 아이콘으로 접고 구역 안 항목만 펼친다. 두 단 내비라 깊은 구조에 강하다"><L3 /></Option>
          <Option id="l4" title="L4 · Top bar + object tabs" from="GitHub 저장소" fit="'프로젝트 하나'가 작업 단위일 때. 탭이 그 대상의 모든 면을 연다. 전역 구역은 상단 바로"><L4 /></Option>
          <Option id="l5" title="L5 · Rail + list–detail" from="Fly.io 로그 · k8s 대시보드" fit="목록에서 고르고 바로 옆에서 본다. 프로젝트·배포·로그처럼 오가며 비교할 때"><L5 /></Option>
        </div>
      </div>
    </div>
  );
}
