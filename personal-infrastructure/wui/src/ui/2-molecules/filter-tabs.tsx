// [분자] FilterTabs = SlideTrack + SEG
import { cn } from "@/lib/cn";
import { SEG, SEG_SM } from "@/ui/0-tokens/recipes";
import { SlideTrack } from "@/ui/1-atoms/track";

/** [분자] FilterTabs = SlideTrack + SEG(aria-pressed). 로컬 필터용. `size="sm"` 은 32 높이, 칸 같은 폭 — 카드 안 좁은 열에. */
export function FilterTabs<T extends string>({ value, onValueChange, items, size = "md", className }: { value: T; onValueChange: (v: T) => void; items: { value: T; label: React.ReactNode; count?: number }[]; size?: "md" | "sm"; className?: string }) {
  return (
    <SlideTrack role="group" className={className}>
      {items.map((it) => (
        <button key={it.value} type="button" onClick={() => onValueChange(it.value)} aria-pressed={value === it.value} className={cn(size === "sm" ? SEG_SM : SEG, value === it.value && "text-on-pill")}>
          {it.label}{it.count !== undefined && <span className="tabular-nums opacity-70">{it.count}</span>}
        </button>
      ))}
    </SlideTrack>
  );
}
