// [분자] FilterTabs = SlideTrack + SEG
import { cn } from "@/lib/cn";
import { SEG } from "@/ui/0-tokens/recipes";
import { SlideTrack } from "@/ui/1-atoms/track";

/** [분자] FilterTabs = SlideTrack + SEG(aria-pressed). 로컬 필터용. */
export function FilterTabs<T extends string>({ value, onValueChange, items, className }: { value: T; onValueChange: (v: T) => void; items: { value: T; label: React.ReactNode; count?: number }[]; className?: string }) {
  return (
    <SlideTrack role="group" className={className}>
      {items.map((it) => (
        <button key={it.value} type="button" onClick={() => onValueChange(it.value)} aria-pressed={value === it.value} className={cn(SEG, value === it.value && "text-on-pill")}>
          {it.label}{it.count !== undefined && <span className="tabular-nums opacity-70">{it.count}</span>}
        </button>
      ))}
    </SlideTrack>
  );
}
