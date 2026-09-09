// [분자] ListRow = 앞머리 + 제목/부제 + 값
import { cn } from "@/lib/cn";

/** [분자] ListRow = 앞머리(Tile·Avatar) + 제목/부제 + 우측 값. 카드 안 목록. onClick 이 있으면 행 전체가 interactive(카드 안쪽 여백만큼 밖으로 나가 hover 바탕이 꽉 찬다). */
export function ListRow({ lead, title, sub, value, end, onClick, className }: { lead?: React.ReactNode; title: React.ReactNode; sub?: React.ReactNode; value?: React.ReactNode; end?: React.ReactNode; onClick?: () => void; className?: string }) {
  const body = <>{lead}<div className="min-w-0 flex-1"><p className="truncate text-body font-medium text-text">{title}</p>{sub && <p className="truncate text-caption text-mute">{sub}</p>}</div>{value !== undefined && <span className="text-body tabular-nums text-text">{value}</span>}{end && <span className="flex shrink-0 items-center gap-2">{end}</span>}</>;
  if (onClick) return <button type="button" onClick={onClick} className={cn("-mx-3 flex w-[calc(100%+24px)] items-center gap-4 rounded-control px-3 py-2 text-start interactive", className)}>{body}</button>;
  return <div className={cn("flex items-center gap-4", className)}>{body}</div>;
}
