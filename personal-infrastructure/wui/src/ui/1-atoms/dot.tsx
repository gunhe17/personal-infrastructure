// [원자] Dot — 상태 톤의 근원(TONE). StatusDot·Badge·Notice·Toast 가 이 톤을 쓴다.
import { cn } from "@/lib/cn";
import { TONE, type Tone } from "@/ui/0-tokens/tone";

/** [원자] Dot — 8px 원. progress 는 pulse. */
export function Dot({ tone, pulse = tone === "progress", className }: { tone: Tone; pulse?: boolean; className?: string }) {
  return <span className={cn("inline-block size-2 shrink-0 rounded-full tint", TONE[tone].dot, pulse && "animate-pulse", className)} aria-hidden="true" />;
}
