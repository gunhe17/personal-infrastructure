// [분자] RingGauge = Donut(크게) + 가운데 값 + 아래 라벨. 사용률 하나를 한눈에.
import { cn } from "@/lib/cn";
import { Donut } from "@/ui/1-atoms/donut";

export function RingGauge({ value, label, detail, size = 96, className }: { value: number; label: string; detail?: React.ReactNode; size?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <Donut value={value} size={size} />
        <span className="absolute inset-0 flex items-center justify-center text-title tabular-nums text-text">{Math.round(value)}%</span>
      </div>
      <span className="text-body text-text">{label}</span>
      {detail && <span className="font-mono text-caption tabular-nums text-mute">{detail}</span>}
    </div>
  );
}
