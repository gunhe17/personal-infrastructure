// [분자] ToggleGroup = SlideTrack + SEG
import { Toggle as BaseToggle } from "@base-ui/react/toggle";
import { ToggleGroup as BaseToggleGroup } from "@base-ui/react/toggle-group";
import { cn } from "@/lib/cn";
import { SEG } from "@/ui/0-tokens/recipes";
import { SlideTrack } from "@/ui/1-atoms/track";

/** [분자] ToggleGroup = SlideTrack + SEG(data-pressed). 격자/목록 같은 보기 전환. */
export function ToggleGroup<T extends string>({ value, onValueChange, items, className, ...props }: { value: T; onValueChange: (v: T) => void; items: { value: T; label: React.ReactNode; "aria-label"?: string }[]; className?: string; "aria-label"?: string }) {
  return (
    <BaseToggleGroup value={[value]} onValueChange={(v) => v[0] && onValueChange(v[0] as T)} render={<SlideTrack />} className={className} {...props}>
      {items.map((it) => <BaseToggle key={it.value} value={it.value} aria-label={it["aria-label"]} className={cn(SEG, "min-w-10 justify-center data-[pressed]:text-on-pill")}>{it.label}</BaseToggle>)}
    </BaseToggleGroup>
  );
}
