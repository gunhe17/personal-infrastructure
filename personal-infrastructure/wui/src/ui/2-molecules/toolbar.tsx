// [분자] Toolbar — 슬롯 셋
import { cn } from "@/lib/cn";

/** [분자] Toolbar = 좌 FilterTabs 슬롯 + 우 SearchInput·Button 슬롯. 목록 카드 밖 위. */
export function Toolbar({ start, end, className }: { start?: React.ReactNode; end?: React.ReactNode; className?: string }) {
  return <div className={cn("mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}><div className="flex flex-wrap items-center gap-3">{start}</div><div className="flex items-center gap-3">{end}</div></div>;
}
