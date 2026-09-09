// [유기체] TopBar = Card + Avatar + SearchInput + StatusDot + Avatar
import { cn } from "@/lib/cn";
import { Avatar } from "@/ui/1-atoms/avatar";
import { Card } from "@/ui/1-atoms/card";

/** [유기체] TopBar = Card(64, 가로) + Avatar(로고 24) + 이름 + SearchInput 슬롯 + StatusDot·Avatar 슬롯. */
export function TopBar({ name = "personal-infrastructure", search, status, avatar, className }: { name?: string; search?: React.ReactNode; status?: React.ReactNode; avatar?: React.ReactNode; className?: string }) {
  return (
    <Card className={cn("flex h-16 items-center justify-between gap-4 px-4 py-0 sm:gap-6 sm:px-6", className)}>
      <span className="flex min-w-0 items-center gap-3 text-body-lg font-medium text-text"><Avatar name="P" size={24} /><span className="truncate">{name}</span></span>
      {search && <div className="hidden flex-1 justify-center md:flex"><div className="w-full max-w-md">{search}</div></div>}
      <div className="flex items-center gap-4">{status}{avatar}</div>
    </Card>
  );
}
