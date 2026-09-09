import { AppShell, Avatar, Button, Card, EmptyState, Icon, IconText, InlineCode, PageHeading, SideNav, StatusDot } from "@/ui";
import { signOut } from "@/lib/session";

const SYSTEM = [
  { value: "resources", label: "Resources", icon: "monitor" as const },
  { value: "backups", label: "Backups", icon: "backup" as const },
  { value: "edge", label: "Edge", icon: "edge" as const },
  { value: "jobs", label: "Jobs", icon: "job" as const },
  { value: "audit", label: "Audit", icon: "audit" as const },
  { value: "settings", label: "Settings", icon: "settings" as const },
];

/** 홈 — 아직 프로젝트가 하나도 없는 상태. 셸은 서고 본문이 다음 한 걸음만 말한다. */
export function Home() {
  return (
    <AppShell nav={
      <SideNav projects={[]} project="" items={[]} item="home" system={SYSTEM}
        status={<StatusDot tone="running">edge up</StatusDot>}
        user={<button type="button" aria-label="Sign out" onClick={() => { signOut(); location.hash = "#login"; }}><Avatar name="gunhee" size={32} /></button>} />
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
