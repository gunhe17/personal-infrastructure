// [분자] StatusDot = Dot + 텍스트
import { cn } from "@/lib/cn";
import { Dot } from "@/ui/1-atoms/dot";
import { TONE, type Tone } from "@/ui/0-tokens/tone";

/** [분자] StatusDot = Dot + 텍스트. */
export function StatusDot({ tone, muted, children, className }: { tone: Tone; muted?: boolean; children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-2 whitespace-nowrap text-body tint", muted ? "text-mute" : TONE[tone].text, className)}><Dot tone={tone} />{children}</span>;
}
