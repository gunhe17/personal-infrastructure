// [분자] NavList = 세로 내비(Icon + 라벨 + 개수). 설정 화면 왼쪽처럼 페이지 안의 이동. 앱 셸 사이드바가 아니다.
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "@/ui/0-tokens/icon";

export function NavList({ items, value, onValueChange, className }: { items: { value: string; label: React.ReactNode; icon?: IconName; count?: number }[]; value: string; onValueChange: (v: string) => void; className?: string }) {
  return (
    <nav className={cn("flex flex-col gap-1", className)}>
      {items.map((it) => (
        <button key={it.value} type="button" onClick={() => onValueChange(it.value)} aria-current={it.value === value ? "page" : undefined}
          className={cn("flex h-10 items-center gap-3 rounded-control px-3 text-body interactive", it.value === value ? "bg-card-2 font-medium text-text" : "text-mute hover:text-text")}>
          {it.icon && <Icon name={it.icon} />}<span className="flex-1 text-start">{it.label}</span>{it.count !== undefined && <span className="font-mono text-caption tabular-nums text-mute">{it.count}</span>}
        </button>
      ))}
    </nav>
  );
}
