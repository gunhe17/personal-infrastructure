// [원자] Slider
import { Slider as BaseSlider } from "@base-ui/react/slider";
import { cn } from "@/lib/cn";

/** [원자] Slider — 트랙 card-3 8px, 채움 accent, 손잡이 흰 20 + accent 링, 우측 mono 값. */
export function Slider({ value, onValueChange, min = 0, max = 100, step = 1, format, className, ...props }: { value: number; onValueChange: (v: number) => void; min?: number; max?: number; step?: number; format?: (v: number) => string; className?: string; "aria-label"?: string }) {
  return (
    <BaseSlider.Root value={value} onValueChange={(v) => onValueChange(Array.isArray(v) ? v[0] : v)} min={min} max={max} step={step} className={cn("flex items-center gap-4", className)}>
      <BaseSlider.Control className="flex h-6 flex-1 cursor-pointer touch-none items-center">
        <BaseSlider.Track className="relative h-2 w-full rounded-full bg-card-3">
          <BaseSlider.Indicator className="rounded-full bg-accent" />
          <BaseSlider.Thumb aria-label={props["aria-label"]} className="size-5 cursor-grab rounded-full bg-white [&>input]:cursor-[inherit] shadow-[0_0_0_2px_var(--accent)] focus-in hover:scale-110 active:scale-110 active:cursor-grabbing" />
        </BaseSlider.Track>
      </BaseSlider.Control>
      <BaseSlider.Value className="w-14 text-end font-mono text-body tabular-nums text-text">{format ? (_, v) => format(Array.isArray(v) ? v[0] : v) : undefined}</BaseSlider.Value>
    </BaseSlider.Root>
  );
}
