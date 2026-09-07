// [분자] Select = Input 트리거 + Icon + 팝업 레시피
import { Select as Base } from "@base-ui/react/select";
import { cn } from "@/lib/cn";
import { Icon } from "@/ui/0-tokens/icon";
import { ITEM, POPUP } from "@/ui/0-tokens/recipes";
import { inputClass } from "@/ui/1-atoms/input";

/** [분자] Select = Input 모양 트리거 + Icon(chevron) + 팝업 레시피 + Icon(check). 44/36. */
export function Select<T extends string>({ value, onValueChange, items, placeholder = "선택", dense, className, ...props }: { value: T | null; onValueChange: (value: T) => void; items: { value: T; label: string }[]; placeholder?: string; dense?: boolean; className?: string; "aria-label"?: string; id?: string }) {
  return (
    <Base.Root value={value} onValueChange={(v) => v !== null && onValueChange(v as T)} items={items}>
      <Base.Trigger {...props} className={cn(inputClass, "flex cursor-pointer items-center justify-between gap-3 text-start data-[placeholder]:text-mute", dense ? "h-9" : "h-11", className)}>
        <Base.Value placeholder={placeholder} className="truncate" />
        <Base.Icon className="text-mute"><Icon name="chevronDown" size="sm" className="flip-open" /></Base.Icon>
      </Base.Trigger>
      <Base.Portal>
        <Base.Positioner sideOffset={8} alignItemWithTrigger={false} className="z-30 outline-none">
          <Base.Popup className={cn("max-h-72 min-w-[var(--anchor-width)] overflow-y-auto enter-drop", POPUP)}>
            <Base.List>
              {items.map((it) => (
                <Base.Item key={it.value} value={it.value} className={cn(ITEM, "justify-between")}>
                  <Base.ItemText>{it.label}</Base.ItemText>
                  <Base.ItemIndicator className="text-accent"><Icon name="check" size="sm" /></Base.ItemIndicator>
                </Base.Item>
              ))}
            </Base.List>
          </Base.Popup>
        </Base.Positioner>
      </Base.Portal>
    </Base.Root>
  );
}
