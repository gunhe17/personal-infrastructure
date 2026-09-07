// [분자] Notice = card-2 줄 + Dot + 텍스트
import { cn } from "@/lib/cn";
import { type Tone } from "@/ui/0-tokens/tone";
import { Dot } from "@/ui/1-atoms/dot";
import { IconButton } from "@/ui/2-molecules/icon-button";

/** [분자] Notice = card-2 줄 + Dot + 텍스트. */
/** action(Button ghost sm 등)은 우측, onDismiss 면 ✕. */
export function Notice({ tone = "progress", action, onDismiss, children, className }: { tone?: Tone; action?: React.ReactNode; onDismiss?: () => void; children: React.ReactNode; className?: string }) {
  return <div className={cn("flex items-center gap-3 rounded-tile bg-card-2 px-5 py-4 text-body text-text", !!(action || onDismiss) && "pe-3", className)}><Dot tone={tone} pulse={false} /><span className="min-w-0 flex-1">{children}</span>{action}{onDismiss && <IconButton size="sm" label="닫기" icon="close" onClick={onDismiss} />}</div>;
}
