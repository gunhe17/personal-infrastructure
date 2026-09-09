// [유기체] AppShell = SideNav 한 열 + 본문
import { cn } from "@/lib/cn";

/**
 * [유기체] AppShell — 서비스 뼈대(사용자 결정 2026-09-09: 왼쪽 한 열 + 본문, 상단 바 없음).
 * `nav` 에 `SideNav` 를 넣는다. 사이드바 240 이 브랜드·프로젝트·항목·사용자를 다 지므로 본문은 안쪽 여백만 가진다.
 * 좁은 화면(< lg)에서는 사이드바가 위로 올라간다. 높이는 `min-h-dvh` — 본문이 짧아도 사이드바가 화면 끝까지 선다.
 */
export function AppShell({ nav, className, children }: { nav?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex min-h-dvh flex-col bg-bg lg:flex-row", className)}>
      {nav}
      <main className="min-w-0 flex-1 p-5 sm:p-8">{children}</main>
    </div>
  );
}
