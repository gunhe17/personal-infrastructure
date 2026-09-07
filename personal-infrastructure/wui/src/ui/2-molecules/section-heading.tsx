// [분자] SectionHeading = 구역 제목(22) + 설명 + 오른쪽 동작, 아래 line. 페이지 안 큰 묶음의 머리.
import { cn } from "@/lib/cn";

export function SectionHeading({ title, description, actions, className }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-6 flex items-end justify-between gap-6 border-b border-line pb-4", className)}>
      <div className="min-w-0"><h2 className="text-title text-text">{title}</h2>{description && <p className="mt-1 text-body text-mute">{description}</p>}</div>
      {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
    </div>
  );
}
