// [분자] RadioCards = 카드 모양 라디오(card-2 → 선택 card-3 + Icon check). 스택·엔진·플랜 고르기.
import { Radio } from "@base-ui/react/radio";
import { RadioGroup as Base } from "@base-ui/react/radio-group";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "@/ui/0-tokens/icon";

export function RadioCards<T extends string>({ value, onValueChange, items, columns = 3, className, ...props }: { value: T; onValueChange: (v: T) => void; items: { value: T; label: React.ReactNode; hint?: React.ReactNode; icon?: IconName }[]; columns?: 2 | 3 | 4; className?: string; "aria-label"?: string }) {
  return (
    <Base value={value} onValueChange={(v) => onValueChange(v as T)} className={cn("grid gap-3", { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" }[columns], className)} {...props}>
      {items.map((it) => (
        <Radio.Root key={it.value} value={it.value} className="group relative flex flex-col items-start gap-2 rounded-control bg-card-2 p-4 text-start pressable move data-[checked]:bg-card-3">
          {it.icon && <Icon name={it.icon} className="text-mute group-data-[checked]:text-accent tint" />}
          <span className="text-body font-medium text-text">{it.label}</span>
          {it.hint && <span className="text-caption text-mute">{it.hint}</span>}
          <Radio.Indicator keepMounted className="absolute end-3 top-3 flex size-5 items-center justify-center rounded-full bg-accent text-white check-in"><Icon name="check" size="sm" className="size-3" /></Radio.Indicator>
        </Radio.Root>
      ))}
    </Base>
  );
}
