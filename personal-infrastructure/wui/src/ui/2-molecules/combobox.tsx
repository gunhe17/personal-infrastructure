// [분자] Combobox = Input + IconButton × 2 + 팝업 레시피
import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import { cn } from "@/lib/cn";
import { Icon } from "@/ui/0-tokens/icon";
import { ITEM, POPUP } from "@/ui/0-tokens/recipes";
import { Input } from "@/ui/1-atoms/input";
import { IconButton } from "@/ui/2-molecules/icon-button";

/** [분자] Combobox = Input + IconButton(지우기·열기) + 팝업 레시피 + Icon(check). 프로젝트·도메인 고르기. */
export function Combobox<T extends { value: string; label: string }>({ items, value, onValueChange, placeholder = "검색해서 선택", className, ...props }: { items: T[]; value: T | null; onValueChange: (v: T | null) => void; placeholder?: string; className?: string; "aria-label"?: string }) {
  return (
    <BaseCombobox.Root items={items} value={value} onValueChange={onValueChange} itemToStringLabel={(it: T) => it.label}>
      <BaseCombobox.InputGroup className={cn("relative", className)}>
        <BaseCombobox.Input render={<Input />} placeholder={placeholder} {...props} className="pe-20" />
        <div className="absolute inset-y-0 end-1.5 flex items-center gap-0.5">
          <BaseCombobox.Clear render={<IconButton size="sm" label="지우기" icon="close" className="data-[disabled]:pointer-events-none data-[disabled]:opacity-0!" />} />
          <BaseCombobox.Trigger render={<IconButton size="sm" label="열기" icon="chevronDown" iconClassName="flip-open" />} />
        </div>
      </BaseCombobox.InputGroup>
      <BaseCombobox.Portal>
        <BaseCombobox.Positioner sideOffset={8} className="z-30 outline-none">
          <BaseCombobox.Popup className={cn("max-h-72 w-[var(--anchor-width)] overflow-y-auto enter-drop", POPUP)}>
            <BaseCombobox.Empty className="px-3 py-3 text-body text-mute empty:hidden">없음</BaseCombobox.Empty>
            <BaseCombobox.List>
              {(item: T) => (
                <BaseCombobox.Item key={item.value} value={item} className={cn(ITEM, "justify-between")}>
                  {item.label}
                  <BaseCombobox.ItemIndicator className="text-accent"><Icon name="check" size="sm" /></BaseCombobox.ItemIndicator>
                </BaseCombobox.Item>
              )}
            </BaseCombobox.List>
          </BaseCombobox.Popup>
        </BaseCombobox.Positioner>
      </BaseCombobox.Portal>
    </BaseCombobox.Root>
  );
}
