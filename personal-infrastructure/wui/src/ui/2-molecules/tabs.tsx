// [분자] Tabs = SlideTrack + SEG
import { Tabs as Base } from "@base-ui/react/tabs";
import { cn } from "@/lib/cn";
import { SEG } from "@/ui/0-tokens/recipes";
import { SlideTrack } from "@/ui/1-atoms/track";

/** [분자] Tabs = SlideTrack + SEG. 핀은 SlideTrack 이 움직인다. */
export function Tabs<T extends string>({ value, onValueChange, tabs, className, children }: { value: T; onValueChange: (v: T) => void; tabs: { value: T; label: React.ReactNode; count?: number }[]; className?: string; children?: React.ReactNode }) {
  return (
    <Base.Root value={value} onValueChange={(v) => onValueChange(v as T)} className={className}>
      <Base.List render={<SlideTrack />}>
        {tabs.map((t) => (
          <Base.Tab key={t.value} value={t.value} className={cn(SEG, "data-[active]:text-on-pill")}>
            {t.label}{t.count !== undefined && <span className="tabular-nums opacity-70">{t.count}</span>}
          </Base.Tab>
        ))}
      </Base.List>
      {children && <div key={value} className="pt-6 appear">{children}</div>}
    </Base.Root>
  );
}

export const TabPanel = Base.Panel;
