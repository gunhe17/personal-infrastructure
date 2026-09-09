import { Avatar, Badge, Button, Card, cn, DeviceList, Dot, Icon, IconButton, IconText, type IconName, ListRow, NavList, PageHeading, ResourceBand, ResourceBands, SearchInput, SectionHeading, StatusDot, Tile } from "@/ui";

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

/** 확정 구조(사용자 결정 2026-09-09) — [프로젝트 레일][프로젝트 항목 200][본문]. 1열은 아이콘 레일 64 가 기본이고, 이름이 필요할 때 넓힌다. */
function Shell({ one, two, overlay }: { one: React.ReactNode; two?: React.ReactNode; overlay?: React.ReactNode }) {
  return (
    <Frame>
      <div className="relative flex h-full">
        {one}
        {two !== undefined && <aside className="flex w-[200px] shrink-0 flex-col gap-4 bg-card-2 p-3 surface-2">{two}</aside>}
        <main className="min-w-0 flex-1 overflow-hidden p-8"><Body /></main>
        {overlay}
      </div>
    </Frame>
  );
}

/** 프로젝트 레일 — 접히면 64(이니셜), 펼치면 220(이름·스택·상태). 같은 목록이 폭만 바뀐다. */
function Rail({ wide, onToggle }: { wide?: boolean; onToggle?: React.ReactNode }) {
  return (
    <nav className={cn("flex shrink-0 flex-col gap-2 bg-card py-4", wide ? "w-[220px] px-3" : "w-16 items-center")}>
      <span className={cn("flex items-center gap-3", wide ? "px-2" : "")}><Avatar name="P" size={32} />{wide && <span className="truncate text-body font-medium text-text">homeserver</span>}</span>
      <span className={cn("my-1 h-px bg-line", wide ? "w-full" : "w-6")} />
      {PROJECTS.map((p, i) => wide ? (
        <button key={p.name} type="button" className={cn("flex items-center gap-3 rounded-control px-2 py-2 text-start interactive", i === 0 && "bg-card-2")}>
          <Tile size="sm">{p.name[0].toUpperCase()}</Tile>
          <span className="min-w-0 flex-1"><span className="block truncate text-body font-medium text-text">{p.name}</span><span className="block truncate text-caption text-mute">{p.stack}</span></span>
          <Dot tone={p.tone} />
        </button>
      ) : (
        <span key={p.name} className="relative">
          <Tile size="sm" className={cn(i !== 0 && "bg-card-3 text-mute")}>{p.name[0].toUpperCase()}</Tile>
          {p.tone === "failed" && <Dot tone="failed" className="absolute -end-0.5 -top-0.5 ring-2 ring-card" />}
        </span>
      ))}
      {wide ? <Button size="sm" variant="ghost" className="justify-start"><Icon name="add" size="sm" />New project</Button> : <IconButton size="md" label="새 프로젝트" icon="add" variant="ghost" />}
      <span className={cn("mt-auto flex gap-2", wide ? "items-center px-2" : "flex-col items-center")}>{onToggle}<Avatar name="gunhee" size={32} /></span>
    </nav>
  );
}
const Items = () => (
  <>
    <div className="px-2 pt-1"><p className="text-body font-medium text-text">api</p><p className="text-caption text-mute">dockerfile</p></div>
    <NavList items={ITEMS} value="overview" onValueChange={() => {}} />
  </>
);
const Pair = ({ children }: { children: React.ReactNode }) => <div className="flex flex-wrap gap-5">{children}</div>;
const Note = ({ children }: { children: React.ReactNode }) => <p className="mb-3 font-mono text-caption text-mute">{children}</p>;

/** X1 — 고정 확장. 토글을 누르면 레일이 220 으로 넓어지고 본문이 그만큼 밀린다. 상태는 기억한다. */
function X1() {
  return (
    <Pair>
      <div><Note>접힘 64 · 본문 1016</Note><Shell one={<Rail onToggle={<IconButton size="md" label="펼치기" icon="chevronRight" variant="ghost" />} />} two={<Items />} /></div>
      <div><Note>펼침 220 · 본문 860</Note><Shell one={<Rail wide onToggle={<IconButton size="sm" label="접기" icon="chevronLeft" variant="ghost" />} />} two={<Items />} /></div>
    </Pair>
  );
}

/** X2 — hover 오버레이. 레일은 64 그대로, 포인터를 올리면 이름 패널이 본문 위로 뜬다. 본문 폭이 변하지 않는다. */
function X2() {
  return (
    <Shell
      one={<Rail />}
      two={<Items />}
      overlay={
        <div className="absolute inset-y-0 start-16 z-10 w-[220px] rounded-e-card bg-popup p-3 ring-1 ring-line enter-side">
          <p className="px-2 pb-2 pt-1 text-caption text-mute">Projects</p>
          <div className="flex flex-col gap-1">
            {PROJECTS.map((p, i) => (
              <span key={p.name} className={cn("flex items-center gap-3 rounded-control px-2 py-2", i === 0 && "bg-card-2")}>
                <Tile size="sm">{p.name[0].toUpperCase()}</Tile>
                <span className="min-w-0 flex-1 truncate text-body font-medium text-text">{p.name}</span>
                <Dot tone={p.tone} />
              </span>
            ))}
          </div>
        </div>
      }
    />
  );
}

/** X3 — 스위처 팝오버. 확장 상태 자체가 없다. 현재 프로젝트 타일을 누르면 검색이 있는 목록이 뜬다. */
function X3() {
  return (
    <Shell
      one={<Rail />}
      two={<Items />}
      overlay={
        <div className="absolute start-[72px] top-[88px] z-10 w-[280px] rounded-popup bg-popup p-1.5 ring-1 ring-line enter-drop">
          <div className="p-1.5"><SearchInput placeholder="Search projects" /></div>
          {PROJECTS.map((p, i) => (
            <span key={p.name} className={cn("flex h-10 items-center gap-3 rounded-control px-3", i === 0 && "bg-card-2")}>
              <Tile size="sm">{p.name[0].toUpperCase()}</Tile>
              <span className="min-w-0 flex-1 truncate text-body text-text">{p.name}</span>
              {i === 0 ? <Icon name="check" size="sm" className="text-accent" /> : <Dot tone={p.tone} />}
            </span>
          ))}
          <span className="mt-1.5 flex h-10 items-center gap-3 rounded-control px-3 text-body text-mute"><Icon name="add" size="sm" />New project</span>
        </div>
      }
    />
  );
}

/** X4 — 펼치면 두 열이 하나로. 220 안에서 고른 프로젝트만 항목을 펼친다(아코디언). 열이 셋에서 둘로 줄어 본문이 넓어진다. */
function X4() {
  return (
    <Shell
      one={
        <nav className="flex w-[240px] shrink-0 flex-col gap-1 bg-card p-3">
          <span className="flex items-center gap-3 px-2 py-1"><Avatar name="P" size={32} /><span className="truncate text-body font-medium text-text">homeserver</span></span>
          <span className="my-1 h-px w-full bg-line" />
          {PROJECTS.map((p, i) => (
            <div key={p.name}>
              <button type="button" className={cn("flex w-full items-center gap-3 rounded-control px-2 py-2 text-start interactive", i === 0 && "bg-card-2")}>
                <Tile size="sm">{p.name[0].toUpperCase()}</Tile>
                <span className="min-w-0 flex-1 truncate text-body font-medium text-text">{p.name}</span>
                {i === 0 ? <Icon name="chevronDown" size="sm" className="text-mute" /> : <Dot tone={p.tone} />}
              </button>
              {i === 0 && <div className="ms-4 mt-1 border-s border-line ps-2"><NavList items={ITEMS} value="overview" onValueChange={() => {}} /></div>}
            </div>
          ))}
          <div className="mt-auto px-2"><User /></div>
        </nav>
      }
    />
  );
}

export function LayoutLab() {
  return (
    <div className="min-h-full bg-bg">
      <div className="mx-auto w-full max-w-[1400px] px-6 py-10">
        <PageHeading crumbs={[{ label: "Home", href: "#" }, { label: "Lab" }, { label: "Layout" }]} title="Icon rail + items"
          meta={<><IconText icon="layers">확정 구조 — [프로젝트 레일 64][항목 200][본문]</IconText><IconText icon="project">1열을 넓히는 네 가지 · 1280 × 800 at 50%</IconText></>} />
        <div className="mt-8">
          <Option id="x1" title="X1 · Pinned expand" from="토글로 64 ↔ 220. 본문이 그만큼 밀리고 상태를 기억한다(Linear · VS Code)" fit="프로젝트가 많아 이름을 계속 보고 싶을 때. 평소엔 접어 두고 필요할 때 고정"><X1 /></Option>
          <Option id="x2" title="X2 · Hover overlay" from="레일은 64 그대로, 포인터를 올리면 이름 패널이 본문 위로 뜬다(enter-side)" fit="본문 폭을 한 번도 잃지 않는다. 대신 이름은 손을 올려야만 보인다"><X2 /></Option>
          <Option id="x3" title="X3 · Switcher popover" from="확장 상태 없이 타일을 누르면 검색 있는 목록(enter-drop)" fit="프로젝트가 스무 개 넘어가면 스크롤보다 검색이 빠르다. 레일은 최근 것만"><X3 /></Option>
          <Option id="x4" title="X4 · Merge into one column" from="펼치면 240 한 열에 프로젝트 + 고른 것의 항목(아코디언)" fit="열이 셋에서 둘로 줄어 본문이 넓어진다. 트리 구조가 그대로 보인다"><X4 /></Option>
        </div>
      </div>
    </div>
  );
}
