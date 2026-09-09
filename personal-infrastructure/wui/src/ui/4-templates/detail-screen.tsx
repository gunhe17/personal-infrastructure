// [템플릿] DetailScreen = AppShell + PageHeading + Tabs + (KeyValue · Steps · Meter · Timeline) 카드 격자. 프로젝트 상세.
import { useState } from "react";
import { Button } from "@/ui/1-atoms/button";
import { Card } from "@/ui/1-atoms/card";
import { IconButton } from "@/ui/2-molecules/icon-button";
import { IconText } from "@/ui/2-molecules/icon-text";
import { KeyValue } from "@/ui/2-molecules/key-value";
import { Meter } from "@/ui/2-molecules/meter";
import { StatusDot } from "@/ui/2-molecules/status-dot";
import { Steps } from "@/ui/2-molecules/steps";
import { Tabs } from "@/ui/2-molecules/tabs";
import { Timeline } from "@/ui/2-molecules/timeline";
import { PageHeading } from "@/ui/3-organisms/page-heading";
import { AppShell } from "@/ui/3-organisms/app-shell";
import { SideNav } from "@/ui/3-organisms/side-nav";

const PROJECTS = [{ value: "api", label: "api" }, { value: "blog", label: "blog", tone: "running" as const }, { value: "worker", label: "worker", tone: "failed" as const }, { value: "postgres", label: "postgres", tone: "running" as const }];
const ITEMS = [{ value: "overview", label: "Overview", icon: "insight" as const }, { value: "deployments", label: "Deployments", icon: "deploy" as const, count: 12 }, { value: "domains", label: "Domains", icon: "domain" as const, count: 3 }, { value: "storage", label: "Storage", icon: "volume" as const }, { value: "logs", label: "Logs", icon: "log" as const }, { value: "settings", label: "Settings", icon: "settings" as const }];
const SYSTEM = [{ value: "resources", label: "Resources", icon: "monitor" as const }, { value: "backups", label: "Backups", icon: "backup" as const }, { value: "edge", label: "Edge", icon: "edge" as const }, { value: "jobs", label: "Jobs", icon: "job" as const }, { value: "audit", label: "Audit", icon: "audit" as const }];

export function DetailScreen() {
  const [tab, setTab] = useState("overview");
  return (
    <AppShell nav={<SideNav projects={PROJECTS} project="api" items={ITEMS} item="overview" system={SYSTEM} profile={{ name: "gunhee", sub: "admin" }} />}>
      <PageHeading crumbs={[{ label: "프로젝트", href: "#" }, { label: "api" }]} title="api" meta={<><StatusDot tone="running">돌고 있음</StatusDot><IconText icon="domain">app.example.com</IconText><IconText icon="clock">3분 전 배포</IconText></>} actions={<><Button>로그</Button><Button variant="primary">다시 배포</Button><IconButton label="더" icon="more" variant="secondary" /></>} />
      <Tabs className="mt-6" value={tab} onValueChange={setTab} tabs={[{ value: "overview", label: "개요" }, { value: "deploys", label: "배포", count: 12 }, { value: "env", label: "환경변수", count: 3 }, { value: "domains", label: "도메인", count: 1 }]} />
      <div className="mt-6 grid grid-cols-2 gap-5">
        <Card title="정보"><KeyValue items={[{ label: "호스트", value: "app.example.com", mono: true }, { label: "포트", value: "127.0.0.1:20000 → 80", mono: true }, { label: "커밋", value: "a1b2c3d", mono: true }, { label: "스택", value: "dockerfile" }]} /></Card>
        <Card title="마지막 배포" subtitle="#48 · 41s"><Steps items={[{ label: "큐", hint: "0.2s", state: "done" }, { label: "빌드", hint: "41s", state: "done" }, { label: "시작", hint: "헬스체크", state: "current" }, { label: "라우팅", state: "upcoming" }]} /></Card>
        <Card title="리소스"><Meter label="디스크" total={20} unit="G" parts={[{ label: "이미지", value: 6, tone: "info" }, { label: "볼륨", value: 4, tone: "running" }]} /></Card>
        <Card title="활동"><Timeline items={[{ time: "14:02", title: "배포 #48 시작", tone: "info" }, { time: "14:03", title: "헬스체크 통과", tone: "running" }, { time: "13:10", title: "도메인 붙임 · app.example.com", tone: "idle" }]} /></Card>
      </div>
    </AppShell>
  );
}
