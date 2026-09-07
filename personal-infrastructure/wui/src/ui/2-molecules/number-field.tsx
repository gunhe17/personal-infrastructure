// [분자] NumberField = IconButton + Input + IconButton
import { NumberField as BaseNumber } from "@base-ui/react/number-field";
import { IconButton } from "@/ui/2-molecules/icon-button";

/** [분자] NumberField = IconButton(−) + Input(mono, 가운데) + IconButton(+) 을 card-2 트랙에. 포트·CPU·메모리. */
export function NumberField({ value, onValueChange, min, max, step, className, ...props }: { value: number | null; onValueChange: (v: number | null) => void; min?: number; max?: number; step?: number; className?: string; "aria-label"?: string; id?: string }) {
  return (
    <BaseNumber.Root value={value} onValueChange={onValueChange} min={min} max={max} step={step} format={{ useGrouping: false }} className={className} {...props}>
      <BaseNumber.Group className="flex h-11 items-center rounded-control bg-[var(--c2)] p-0.5 surface-2 outline outline-2 outline-offset-2 outline-transparent transition-[outline-color] duration-(--duration-base) focus-within:outline-accent">
        <BaseNumber.Decrement aria-label="줄이기" render={<IconButton label="줄이기" icon="remove" />} />
        <BaseNumber.Input className="h-full min-w-0 flex-1 bg-transparent text-center font-mono text-body tabular-nums text-text outline-none focus-visible:outline-0" />
        <BaseNumber.Increment aria-label="늘리기" render={<IconButton label="늘리기" icon="add" />} />
      </BaseNumber.Group>
    </BaseNumber.Root>
  );
}
