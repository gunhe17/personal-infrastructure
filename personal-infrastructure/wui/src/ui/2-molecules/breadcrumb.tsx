// [분자] Breadcrumb
import { cn } from "@/lib/cn";

/** [분자] Breadcrumb = 링크·텍스트 + `/`(mute). 마지막만 text. */
export function Breadcrumb({ items, className }: { items: { label: React.ReactNode; href?: string }[]; className?: string }) {
  return (
    <nav aria-label="경로" className={cn("flex items-center gap-2 text-body", className)}>
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <span className="text-mute" aria-hidden="true">/</span>}
          {it.href && i < items.length - 1 ? <a href={it.href} className="-mx-1.5 rounded-[6px] px-1.5 text-mute interactive hover:text-text">{it.label}</a> : <span className={i === items.length - 1 ? "font-medium text-text" : "text-mute"}>{it.label}</span>}
        </span>
      ))}
    </nav>
  );
}
