// [유기체] AppShell = TopBar(Container 안) + Container 본문. stacked layout — 사이드바 없음.
import { cn } from "@/lib/cn";
import { Container } from "@/ui/1-atoms/container";
import { TopBar } from "@/ui/3-organisms/top-bar";

export function AppShell({ topbar, className, children }: { topbar?: React.ComponentProps<typeof TopBar>; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("min-h-full bg-bg", className)}>
      <Container className="pt-4"><TopBar {...topbar} /></Container>
      <Container className="py-6 sm:py-8">{children}</Container>
    </div>
  );
}
