// [분자] Pagination = Track + IconButton × 2 + Button(square)
import { cn } from "@/lib/cn";
import { Button } from "@/ui/1-atoms/button";
import { Track } from "@/ui/1-atoms/track";
import { IconButton } from "@/ui/2-molecules/icon-button";

/** [분자] Pagination = Track + IconButton(‹ ›) + Button(square, 현재만 primary). */
export function Pagination({ page, pages, onPageChange, className }: { page: number; pages: number; onPageChange: (p: number) => void; className?: string }) {
  const around = [...new Set([1, page - 1, page, page + 1, pages].filter((p) => p >= 1 && p <= pages))].sort((a, b) => a - b);
  return (
    <Track role="navigation" aria-label="페이지" className={cn("gap-1", className)}>
      <IconButton label="이전" icon="chevronLeft" disabled={page <= 1} onClick={() => onPageChange(page - 1)} />
      {around.map((p, i) => <span key={p} className="flex items-center">{i > 0 && around[i - 1] !== p - 1 && <span className="px-1 text-mute">…</span>}<Button square variant={p === page ? "primary" : "ghost"} aria-current={p === page ? "page" : undefined} onClick={() => onPageChange(p)} className="tabular-nums">{p}</Button></span>)}
      <IconButton label="다음" icon="chevronRight" disabled={page >= pages} onClick={() => onPageChange(page + 1)} />
    </Track>
  );
}
