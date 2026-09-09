import { AppShell, Button, Card, EmptyState, Icon, IconText, InlineCode, Menu, MenuItem, MenuSeparator, PageHeading, SideNav } from "@/ui";
import { signOut } from "@/lib/session";

const SYSTEM = [
  { value: "resources", label: "Resources", icon: "monitor" as const },
  { value: "backups", label: "Backups", icon: "backup" as const },
  { value: "edge", label: "Edge", icon: "edge" as const },
  { value: "jobs", label: "Jobs", icon: "job" as const },
  { value: "audit", label: "Audit", icon: "audit" as const },
  { value: "settings", label: "Settings", icon: "settings" as const },
];

/** 프로필 줄 끝의 메뉴 — 계정과 세션을 여기서 끝낸다. */
function ProfileMenu() {
  return (
    <Menu align="start" trigger={<span className="flex size-6 items-center justify-center rounded-[6px] text-mute" aria-label="계정 메뉴"><Icon name="more" size="sm" /></span>}>
      <MenuItem onClick={() => { location.hash = "#home"; }}><Icon name="settings" size="sm" />Settings</MenuItem>
      <MenuItem onClick={() => { location.hash = "#home"; }}><Icon name="credential" size="sm" />Change password</MenuItem>
      <MenuSeparator />
      <MenuItem danger onClick={() => { signOut(); location.hash = "#login"; }}><Icon name="logout" size="sm" />Sign out</MenuItem>
    </Menu>
  );
}

/** 홈 — 아직 프로젝트가 하나도 없는 상태. 셸은 서고 본문이 다음 한 걸음만 말한다. */
export function Home() {
  return (
    <AppShell nav={
      <SideNav projects={[]} project="" items={[]} item="home" system={SYSTEM}
        profile={{ name: "gunhee", sub: "admin", end: <ProfileMenu /> }} />
    }>
      <PageHeading title="Home" meta={<><IconText icon="server">homeserver · 8 cores · 16 GB</IconText><IconText icon="clock">Up 6d 4h</IconText></>} />
      <div className="mt-6 space-y-5">
        <Card>
          <EmptyState title="No projects yet" action={<Button variant="primary"><Icon name="add" size="sm" />New project</Button>}>
            A project is a folder or a git URL this server builds and runs. Add one and it appears here with its deployments, domains and logs.
          </EmptyState>
        </Card>
        <Card title="Next steps">
          <ol className="space-y-3 text-body text-sub">
            <li className="flex gap-3"><span className="font-mono text-caption text-mute">1</span>Point the CLI at this server — <InlineCode>pi context set http://homeserver:20000</InlineCode></li>
            <li className="flex gap-3"><span className="font-mono text-caption text-mute">2</span>Create a project — <InlineCode>pi project create ./app --port 3000</InlineCode></li>
            <li className="flex gap-3"><span className="font-mono text-caption text-mute">3</span>Deploy it — <InlineCode>pi deploy start app</InlineCode></li>
          </ol>
        </Card>
      </div>
    </AppShell>
  );
}
