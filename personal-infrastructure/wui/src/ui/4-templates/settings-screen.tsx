// [템플릿] SettingsScreen = AppShell + PageHeading + NavList(왼쪽 220) + FormRow 폼 + ActionPanel(위험) + FormActions.
import { useState } from "react";
import { Button } from "@/ui/1-atoms/button";
import { Input } from "@/ui/1-atoms/input";
import { Switch } from "@/ui/1-atoms/switch";
import { ActionPanel } from "@/ui/2-molecules/action-panel";
import { FormActions, FormRow } from "@/ui/2-molecules/form-row";
import { InputGroup } from "@/ui/2-molecules/input-group";
import { NavList } from "@/ui/2-molecules/nav-list";
import { RadioCards } from "@/ui/2-molecules/radio-cards";
import { SectionHeading } from "@/ui/2-molecules/section-heading";
import { PageHeading } from "@/ui/3-organisms/page-heading";
import { AppShell } from "@/ui/3-organisms/app-shell";
import { StatusDot } from "@/ui/2-molecules/status-dot";
import { SideNav } from "@/ui/3-organisms/side-nav";
import { Avatar } from "@/ui/1-atoms/avatar";

const PROJECTS = [{ value: "api", label: "api" }, { value: "blog", label: "blog", tone: "running" as const }, { value: "worker", label: "worker", tone: "failed" as const }, { value: "postgres", label: "postgres", tone: "running" as const }];
const ITEMS = [{ value: "overview", label: "Overview", icon: "insight" as const }, { value: "deployments", label: "Deployments", icon: "deploy" as const, count: 12 }, { value: "domains", label: "Domains", icon: "domain" as const, count: 3 }, { value: "storage", label: "Storage", icon: "volume" as const }, { value: "logs", label: "Logs", icon: "log" as const }, { value: "settings", label: "Settings", icon: "settings" as const }];
const SYSTEM = [{ value: "resources", label: "Resources", icon: "monitor" as const }, { value: "backups", label: "Backups", icon: "backup" as const }, { value: "edge", label: "Edge", icon: "edge" as const }, { value: "jobs", label: "Jobs", icon: "job" as const }, { value: "audit", label: "Audit", icon: "audit" as const }];

export function SettingsScreen() {
  const [nav, setNav] = useState("general"), [auto, setAuto] = useState(true), [stack, setStack] = useState("dockerfile");
  return (
    <AppShell nav={<SideNav projects={PROJECTS} project="api" items={ITEMS} item="settings" system={SYSTEM} status={<StatusDot tone="running">edge up</StatusDot>} user={<Avatar name="gunhee" size={32} />} />}>
      <PageHeading crumbs={[{ label: "프로젝트", href: "#" }, { label: "api", href: "#" }, { label: "설정" }]} title="설정" />
      <div className="mt-6 grid grid-cols-[220px_1fr] gap-8">
        <NavList value={nav} onValueChange={setNav} items={[{ value: "general", label: "일반", icon: "settings" }, { value: "build", label: "빌드", icon: "project" }, { value: "domains", label: "도메인", icon: "domain", count: 1 }, { value: "env", label: "환경변수", icon: "secret", count: 3 }, { value: "danger", label: "위험 구역", icon: "warning" }]} />
        <div className="space-y-8">
          <div>
            <SectionHeading title="일반" description="이름과 배포 방식" />
            <div className="divide-y divide-line">
              <FormRow label="이름" hint="URL 과 컨테이너 이름에 쓴다"><InputGroup prefix="https://" suffix=".example.com" defaultValue="api" /></FormRow>
              <FormRow label="자동 배포" hint="main 에 푸시하면 바로 배포"><Switch checked={auto} onCheckedChange={setAuto} label="켜기" hint="GitHub 웹훅이 큐에 넣는다" /></FormRow>
              <FormRow label="스택"><RadioCards aria-label="스택" value={stack} onValueChange={setStack} items={[{ value: "dockerfile", label: "Dockerfile", hint: "있는 그대로" }, { value: "static", label: "정적" }, { value: "node", label: "Node" }]} /></FormRow>
              <FormRow label="포트" hint="컨테이너가 듣는 포트"><Input defaultValue="80" className="w-40" /></FormRow>
            </div>
            <FormActions className="mt-6"><Button>취소</Button><Button variant="primary">저장</Button></FormActions>
          </div>
          <ActionPanel title="프로젝트 삭제" description="컨테이너·포트 예약·도메인이 같이 사라진다. 볼륨은 남는다." action={<Button variant="danger">삭제</Button>} />
        </div>
      </div>
    </AppShell>
  );
}
