// [원자] RadioGroup
import { Radio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import { cn } from "@/lib/cn";

/** [원자] RadioGroup — 24px 원, 체크되면 accent + 흰 점. 힌트 줄 가능. */
export function RadioGroup<T extends string>({ value, onValueChange, items, className, ...props }: { value: T; onValueChange: (v: T) => void; items: { value: T; label: React.ReactNode; hint?: React.ReactNode }[]; className?: string; "aria-label"?: string }) {
  return (
    <BaseRadioGroup value={value} onValueChange={(v) => onValueChange(v as T)} className={cn("flex flex-col gap-3", className)} {...props}>
      {items.map((it) => (
        <label key={it.value} className="flex cursor-pointer items-start gap-3 text-body text-text">
          <Radio.Root value={it.value} className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-card-3 pressable move data-[checked]:bg-accent">
            <Radio.Indicator keepMounted className="size-2.5 rounded-full bg-white check-in" />
          </Radio.Root>
          <span>{it.label}{it.hint && <span className="block text-caption text-mute">{it.hint}</span>}</span>
        </label>
      ))}
    </BaseRadioGroup>
  );
}
