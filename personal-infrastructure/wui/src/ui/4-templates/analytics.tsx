// [템플릿] Analytics = AppShell + PageHeading + TopProjects | EdgeRequests + RecentDeploys — 홈 화면
import { EdgeRequests } from "@/ui/3-organisms/edge-requests";
import { RecentDeploys } from "@/ui/3-organisms/recent-deploys";
import { TopProjects } from "@/ui/3-organisms/top-projects";
import { Button } from "@/ui/1-atoms/button";
import { StatusDot } from "@/ui/2-molecules/status-dot";
import { AppShell } from "@/ui/3-organisms/app-shell";
import { SideNav } from "@/ui/3-organisms/side-nav";
import { Avatar } from "@/ui/1-atoms/avatar";
import { PageHeading } from "@/ui/3-organisms/page-heading";

const PROJECTS = [{ value: "api", label: "api" }, { value: "blog", label: "blog", tone: "running" as const }, { value: "worker", label: "worker", tone: "failed" as const }, { value: "postgres", label: "postgres", tone: "running" as const }];
const ITEMS = [{ value: "overview", label: "Overview", icon: "insight" as const }, { value: "deployments", label: "Deployments", icon: "deploy" as const, count: 12 }, { value: "domains", label: "Domains", icon: "domain" as const, count: 3 }, { value: "storage", label: "Storage", icon: "volume" as const }, { value: "logs", label: "Logs", icon: "log" as const }, { value: "settings", label: "Settings", icon: "settings" as const }];
const SYSTEM = [{ value: "resources", label: "Resources", icon: "monitor" as const }, { value: "backups", label: "Backups", icon: "backup" as const }, { value: "edge", label: "Edge", icon: "edge" as const }, { value: "jobs", label: "Jobs", icon: "job" as const }, { value: "audit", label: "Audit", icon: "audit" as const }];

/** [템플릿] Analytics = AppShell + PageHeading + 2열(340 · 1fr) — TopProjects | EdgeRequests + RecentDeploys. 홈 화면. 템플릿 규격(1280×800, AppShell, Container 1168)을 따른다. */
export function Analytics() {
  return (
    <AppShell nav={<SideNav projects={PROJECTS} project="api" items={ITEMS} item="overview" system={SYSTEM} status={<StatusDot tone="running">edge up</StatusDot>} user={<Avatar name="gunhee" size={32} />} />}>
      <PageHeading title="대시보드" meta={<StatusDot tone="running">엣지 up · 3개 돌고 있음</StatusDot>} actions={<Button variant="primary">새 프로젝트</Button>} />
      <div className="mt-6 grid grid-cols-[340px_1fr] items-start gap-5">
        <TopProjects />
        <div className="flex flex-col gap-5"><EdgeRequests /><RecentDeploys /></div>
      </div>
    </AppShell>
  );
}
