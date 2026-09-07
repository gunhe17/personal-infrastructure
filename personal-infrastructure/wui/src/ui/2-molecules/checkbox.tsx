// [분자] Checkbox = 상자 + Icon(check) + 라벨
import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { cn } from "@/lib/cn";
import { Icon } from "@/ui/0-tokens/icon";

/** [분자] Checkbox = 24px 상자 + Icon(check) + 라벨. */
export function Checkbox({ checked, onCheckedChange, label, hint, disabled, className }: { checked: boolean; onCheckedChange: (v: boolean) => void; label?: React.ReactNode; hint?: React.ReactNode; disabled?: boolean; className?: string }) {
  return (
    <label className={cn("inline-flex gap-3 text-body text-text", hint ? "items-start" : "items-center", disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer", className)}>
      <BaseCheckbox.Root checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} className="flex size-6 items-center justify-center rounded-[8px] bg-card-3 text-white pressable move data-[checked]:bg-accent">
        <BaseCheckbox.Indicator keepMounted className="check-in"><Icon name="check" size="sm" /></BaseCheckbox.Indicator>
      </BaseCheckbox.Root>
      {hint ? <span><span className="block">{label}</span><span className="block text-caption text-mute">{hint}</span></span> : label}
    </label>
  );
}
