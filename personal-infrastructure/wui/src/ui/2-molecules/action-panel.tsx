// [분자] ActionPanel = Card + 제목/설명 + 오른쪽(또는 아래) 동작. "백업 지금 만들기" · "프로젝트 삭제" 같은 한 가지 일.
import { cn } from "@/lib/cn";
import { Card } from "@/ui/1-atoms/card";

export function ActionPanel({ title, description, action, below, children, className }: { title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; below?: boolean; children?: React.ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <div className={cn("flex gap-6", below ? "flex-col" : "items-center justify-between")}>
        <div className="min-w-0"><p className="text-body font-medium text-text">{title}</p>{description && <p className="mt-1 text-caption text-mute">{description}</p>}</div>
        {action && <div className={cn("flex shrink-0 items-center gap-3", below && "w-full [&>*]:flex-1")}>{action}</div>}
      </div>
      {children && <div className="mt-5">{children}</div>}
    </Card>
  );
}
