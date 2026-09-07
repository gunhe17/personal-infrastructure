// [분자] KeyValue = 라벨(mute) + 값 줄. 상세 페이지의 정의 목록. 기술 값은 Mono.
import { cn } from "@/lib/cn";
import { Mono } from "@/ui/1-atoms/code";

export function KeyValue({ items, className }: { items: { label: string; value: React.ReactNode; mono?: boolean }[]; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-[160px_1fr] gap-x-4 gap-y-3", className)}>
      {items.map((it) => <div key={it.label} className="contents"><dt className="text-body text-mute">{it.label}</dt><dd className="min-w-0 truncate text-body text-text">{it.mono ? <Mono className="text-text">{it.value}</Mono> : it.value}</dd></div>)}
    </dl>
  );
}
