// [분자] Steps = 단계 원(Icon check) + 연결선. 배포 파이프라인 같은 순서.
import { cn } from "@/lib/cn";
import { Icon } from "@/ui/0-tokens/icon";

export type StepState = "done" | "current" | "upcoming" | "failed";
export function Steps({ items, className }: { items: { label: string; hint?: string; state: StepState }[]; className?: string }) {
  return (
    <ol className={cn("flex items-start", className)}>
      {items.map((it, i) => (
        <li key={it.label} className="flex min-w-0 flex-1 items-start gap-3">
          <span className="flex flex-col items-center">
            <span aria-current={it.state === "current" ? "step" : undefined} className={cn("flex size-6 shrink-0 items-center justify-center rounded-full text-caption font-medium tint",
              it.state === "done" ? "bg-accent text-white" : it.state === "failed" ? "bg-bad text-white" : it.state === "current" ? "bg-card-3 text-text outline outline-2 outline-offset-2 outline-accent" : "bg-card-3 text-mute")}>
              {it.state === "done" ? <Icon name="check" size="sm" /> : it.state === "failed" ? <Icon name="close" size="sm" /> : i + 1}
            </span>
          </span>
          <span className="min-w-0 pt-0.5"><span className={cn("block truncate text-body font-medium", it.state === "upcoming" ? "text-mute" : "text-text")}>{it.label}</span>{it.hint && <span className="block truncate text-caption text-mute">{it.hint}</span>}</span>
          {i < items.length - 1 && <span className={cn("mx-3 mt-3 h-px flex-1 tint", it.state === "done" ? "bg-accent" : "bg-line")} aria-hidden="true" />}
        </li>
      ))}
    </ol>
  );
}
