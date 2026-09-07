// [템플릿] Analytics = AppShell + PageHeading + TopProjects | EdgeRequests + RecentDeploys — 홈 화면
import { EdgeRequests } from "@/ui/3-organisms/edge-requests";
import { RecentDeploys } from "@/ui/3-organisms/recent-deploys";
import { TopProjects } from "@/ui/3-organisms/top-projects";
import { Button } from "@/ui/1-atoms/button";
import { StatusDot } from "@/ui/2-molecules/status-dot";
import { AppShell } from "@/ui/3-organisms/app-shell";
import { PageHeading } from "@/ui/3-organisms/page-heading";

/** [템플릿] Analytics = AppShell + PageHeading + 2열(340 · 1fr) — TopProjects | EdgeRequests + RecentDeploys. 홈 화면. 템플릿 규격(1280×800, AppShell, Container 1168)을 따른다. */
export function Analytics() {
  return (
    <AppShell>
      <PageHeading title="대시보드" meta={<StatusDot tone="running">엣지 up · 3개 돌고 있음</StatusDot>} actions={<Button variant="primary">새 프로젝트</Button>} />
      <div className="mt-6 grid grid-cols-[340px_1fr] items-start gap-5">
        <TopProjects />
        <div className="flex flex-col gap-5"><EdgeRequests /><RecentDeploys /></div>
      </div>
    </AppShell>
  );
}
