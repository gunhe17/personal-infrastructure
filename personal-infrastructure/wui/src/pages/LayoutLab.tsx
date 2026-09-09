import { Avatar, Badge, Button, Card, cn, DeviceList, Dot, IconButton, IconText, type IconName, ListRow, NavList, PageHeading, ResourceBand, ResourceBands, SearchInput, SectionHeading, Separator, StatusDot, Tile } from "@/ui";

// Layout Lab — 서비스 전체의 뼈대 후보(사용자 요청 2026-09-09). 관리자 콘솔들이 쓰는 다섯 가지를 우리 키트로.
// 조사 대상: Vercel·Railway(상단 바 + 가운데 폭) · Grafana·Portainer·Proxmox(왼쪽 사이드바) · Linear·Sentry·Cloudflare(아이콘 레일 + 보조 내비)
//           · GitHub(상단 바 + 대상 탭) · Fly.io 로그·k8s 대시보드(목록–상세 분할).

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
      {/* 장치 목록은 3열(180 + 그래프 + 160)이라 600 아래에서 접힌다. 사이드바가 420 을 가져가면 본문에 2열을 둘 수 없다 — 전체 폭으로. */}
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

/** 프로젝트 열에 서는 것 — 홈서버에 배포된 것들. */
const PROJECTS = [
  { name: "api", stack: "dockerfile", tone: "running" as const },
  { name: "blog", stack: "static", tone: "running" as const },
  { name: "worker", stack: "node", tone: "failed" as const },
  { name: "postgres", stack: "db", tone: "running" as const },
];
/** 2열 — 고른 프로젝트 안에서 옮겨 다니는 곳. */
const ITEMS: { value: string; label: string; icon: IconName; count?: number }[] = [
  { value: "overview", label: "Overview", icon: "insight" },
  { value: "deployments", label: "Deployments", icon: "deploy", count: 12 },
  { value: "domains", label: "Domains", icon: "domain", count: 3 },
  { value: "storage", label: "Storage", icon: "volume" },
  { value: "logs", label: "Logs", icon: "log" },
  { value: "settings", label: "Settings", icon: "settings" },
];
/** 프로젝트에 속하지 않는 것 — 호스트 전체. 어디에 두느냐가 변형의 차이다. */
const SYSTEM: { value: string; label: string; icon: IconName }[] = [
  { value: "resources", label: "Resources", icon: "monitor" },
  { value: "backups", label: "Backups", icon: "backup" },
  { value: "edge", label: "Edge", icon: "edge" },
  { value: "jobs", label: "Jobs", icon: "job" },
  { value: "audit", label: "Audit", icon: "audit" },
];

/** 확정 구조 — [프로젝트 열][프로젝트 항목 열][본문]. 두 열의 폭·바탕·내용만 변형마다 다르다. */
function Shell({ one, two, twoBg = "bg-card-2 surface-2" }: { one: React.ReactNode; two: React.ReactNode; twoBg?: string }) {
  return (
    <Frame>
      <div className="flex h-full">
        {one}
        <aside className={cn("flex w-[200px] shrink-0 flex-col gap-4 p-3", twoBg)}>{two}</aside>
        <main className="min-w-0 flex-1 overflow-hidden p-8"><Body /></main>
      </div>
    </Frame>
  );
}
const ProjectNav = ({ head }: { head?: React.ReactNode }) => (
  <>
    {head}
    <NavList items={ITEMS} value="overview" onValueChange={() => {}} />
  </>
);

/** S1 — 아이콘 레일 64 + 항목 200. Slack 워크스페이스 · Linear 팀. 1열이 가장 좁아 본문이 넓다. */
function S1() {
  return (
    <Shell
      one={
        <nav className="flex w-16 shrink-0 flex-col items-center gap-2 bg-card py-4">
          <Avatar name="P" size={32} />
          <span className="my-1 h-px w-6 bg-line" />
          {PROJECTS.map((p, i) => (
            <span key={p.name} className="relative">
              <Tile size="sm" className={cn(i !== 0 && "bg-card-3 text-mute")}>{p.name[0].toUpperCase()}</Tile>
              {p.tone === "failed" && <Dot tone="failed" className="absolute -end-0.5 -top-0.5 ring-2 ring-card" />}
            </span>
          ))}
          <IconButton size="md" label="새 프로젝트" icon="add" variant="ghost" />
          <span className="mt-auto flex flex-col items-center gap-2"><IconButton size="md" label="시스템" icon="server" variant="ghost" /><Avatar name="gunhee" size={32} /></span>
        </nav>
      }
      two={<ProjectNav head={<div className="px-2 pt-1"><p className="text-body font-medium text-text">api</p><p className="text-caption text-mute">dockerfile</p></div>} />}
    />
  );
}

/** S2 — 이름 열 220 + 항목 200. 둘 다 글자라 어느 프로젝트인지 늘 보인다. 본문 폭 420 손해. */
function S2() {
  return (
    <Shell
      one={
        <aside className="flex w-[220px] shrink-0 flex-col gap-3 bg-card p-3">
          <div className="flex items-center justify-between gap-2 px-2 pt-1"><Brand /><IconButton size="sm" label="새 프로젝트" icon="add" /></div>
          <SearchInput placeholder="Filter" />
          <div className="flex flex-col gap-1">
            {PROJECTS.map((p, i) => (
              <button key={p.name} type="button" className={cn("flex items-center gap-3 rounded-control px-3 py-2 text-start interactive", i === 0 && "bg-card-2")}>
                <Tile size="sm">{p.name[0].toUpperCase()}</Tile>
                <span className="min-w-0 flex-1"><span className="block truncate text-body font-medium text-text">{p.name}</span><span className="block truncate text-caption text-mute">{p.stack}</span></span>
                <Dot tone={p.tone} />
              </button>
            ))}
          </div>
          <div className="mt-auto px-2"><User /></div>
        </aside>
      }
      two={<ProjectNav />}
    />
  );
}

/** S3 — 이름 열 + 항목 열을 같은 바탕(card)으로. 두 열이 한 덩어리로 보이고 본문만 떠오른다. */
function S3() {
  return (
    <Shell
      twoBg="bg-card"
      one={
        <aside className="flex w-[220px] shrink-0 flex-col gap-3 bg-card p-3">
          <div className="px-2 pt-1"><Brand /></div>
          <div className="flex flex-col gap-1">
            {PROJECTS.map((p, i) => (
              <button key={p.name} type="button" className={cn("flex items-center gap-3 rounded-control px-3 py-2 text-start interactive", i === 0 && "bg-card-2 surface-2")}>
                <Tile size="sm">{p.name[0].toUpperCase()}</Tile>
                <span className="min-w-0 flex-1 truncate text-body font-medium text-text">{p.name}</span>
                <Dot tone={p.tone} />
              </button>
            ))}
          </div>
          <div className="mt-auto px-2"><User /></div>
        </aside>
      }
      two={<><span className="mx-1 h-full w-px bg-line" /><ProjectNav head={<p className="px-2 pt-1 text-caption text-mute">api</p>} /></>}
    />
  );
}

/** S4 — 레일 + 항목, 항목 열 위에 프로젝트 머리(이름 · 상태 · 동작)를 고정. 지금 무엇을 보고 있는지가 2열에서 끝난다. */
function S4() {
  return (
    <Shell
      one={
        <nav className="flex w-16 shrink-0 flex-col items-center gap-2 bg-card py-4">
          <Avatar name="P" size={32} />
          <span className="my-1 h-px w-6 bg-line" />
          {PROJECTS.map((p, i) => <Tile key={p.name} size="sm" className={cn(i !== 0 && "bg-card-3 text-mute")}>{p.name[0].toUpperCase()}</Tile>)}
          <IconButton size="md" label="새 프로젝트" icon="add" variant="ghost" />
          <span className="mt-auto"><Avatar name="gunhee" size={32} /></span>
        </nav>
      }
      two={
        <>
          <div className="rounded-control bg-card p-3">
            <div className="flex items-center justify-between gap-2"><span className="truncate text-body font-medium text-text">api</span><Badge tone="running" size="sm">running</Badge></div>
            <p className="mt-1 truncate font-mono text-caption text-mute">app.example.com</p>
            <div className="mt-3 flex gap-2"><Button size="sm" variant="secondary" className="flex-1">Deploy</Button><IconButton size="sm" label="더" icon="more" /></div>
          </div>
          <NavList items={ITEMS} value="overview" onValueChange={() => {}} />
        </>
      }
    />
  );
}

/** S5 — 1열은 프로젝트, 그 아래 구분선 하나로 시스템. 전역과 프로젝트의 경계를 1열이 말한다. */
function S5() {
  return (
    <Shell
      one={
        <aside className="flex w-[220px] shrink-0 flex-col gap-3 bg-card p-3">
          <div className="px-2 pt-1"><Brand /></div>
          <p className="px-3 text-caption text-mute">Projects</p>
          <div className="flex flex-col gap-1">
            {PROJECTS.map((p, i) => (
              <button key={p.name} type="button" className={cn("flex items-center gap-3 rounded-control px-3 py-2 text-start interactive", i === 0 && "bg-card-2")}>
                <Tile size="sm">{p.name[0].toUpperCase()}</Tile>
                <span className="min-w-0 flex-1 truncate text-body font-medium text-text">{p.name}</span>
                <Dot tone={p.tone} />
              </button>
            ))}
          </div>
          <Separator className="my-1" />
          <p className="px-3 text-caption text-mute">System</p>
          <NavList items={SYSTEM} value="none" onValueChange={() => {}} />
          <div className="mt-auto px-2"><User /></div>
        </aside>
      }
      two={<ProjectNav head={<div className="px-2 pt-1"><p className="text-body font-medium text-text">api</p><p className="text-caption text-mute">dockerfile</p></div>} />}
    />
  );
}

export function LayoutLab() {
  return (
    <div className="min-h-full bg-bg">
      <div className="mx-auto w-full max-w-[1400px] px-6 py-10">
        <PageHeading crumbs={[{ label: "Home", href: "#" }, { label: "Lab" }, { label: "Layout" }]} title="Two-column sidebar"
          meta={<><IconText icon="layers">[프로젝트][프로젝트 항목][본문] · 확정 구조</IconText><IconText icon="project">Same body in every frame · 1280 × 800 at 50%</IconText></>} />
        <div className="mt-8">
          <Option id="s1" title="S1 · Icon rail + items" from="Slack 워크스페이스 · Linear 팀 — 1열 64" fit="본문이 가장 넓다(1016). 프로젝트가 열 개 넘어도 세로로 버틴다. 대신 이니셜만으로 골라야 한다"><S1 /></Option>
          <Option id="s2" title="S2 · Named list + items" from="Notion · Obsidian — 1열 220 + 2열 200" fit="어느 프로젝트인지 늘 보이고 스택·상태까지 한 줄에. 본문 폭 420 손해"><S2 /></Option>
          <Option id="s3" title="S3 · One surface, two columns" from="두 열을 같은 card 바탕으로 묶고 hairline 하나로 나눔" fit="사이드바가 한 덩어리로 읽히고 본문만 떠오른다. 열 경계가 약해 이동 단계가 흐려질 수 있다"><S3 /></Option>
          <Option id="s4" title="S4 · Rail + project header" from="2열 위에 이름 · 상태 · 도메인 · 배포 버튼을 얹음" fit="지금 무엇을 보고 있는지가 2열에서 끝난다. 본문 머리에서 같은 정보를 뺄 수 있다"><S4 /></Option>
          <Option id="s5" title="S5 · Projects over system" from="1열을 Projects / System 둘로 나눠 전역 구역을 아래에" fit="프로젝트에 속하지 않는 것(리소스·백업·엣지·잡·감사)의 자리가 분명하다"><S5 /></Option>
        </div>
      </div>
    </div>
  );
}
