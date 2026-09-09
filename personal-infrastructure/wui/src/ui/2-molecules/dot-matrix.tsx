// [분자] DotMatrix = Dot 격자
import { cn } from "@/lib/cn";
import { Dot } from "@/ui/1-atoms/dot";

/** [분자] DotMatrix = Dot(info / idle) × 7열 × 기간 라벨. */
export function DotMatrix({ groups, className }: { groups: { label: string; cells: boolean[] }[]; className?: string }) {
  return (
    <div className={cn("flex gap-6", className)}>
      {groups.map((g) => (
        <div key={g.label}><p className="mb-3 text-body text-mute">{g.label}</p>
          <div className="grid grid-cols-7 gap-x-4 gap-y-3">{g.cells.map((on, i) => <Dot key={i} tone={on ? "info" : "idle"} pulse={false} className={cn("size-[7px]", !on && "bg-card-3")} />)}</div>
        </div>
      ))}
    </div>
  );
}
