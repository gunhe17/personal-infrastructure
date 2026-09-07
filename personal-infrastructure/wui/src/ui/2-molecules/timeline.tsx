// [분자] Timeline = Dot + 시간(Mono) + 제목/설명 을 선 위에 세로로. 감사 로그·활동.
import { cn } from "@/lib/cn";
import { type Tone } from "@/ui/0-tokens/tone";
import { Dot } from "@/ui/1-atoms/dot";
import { Mono } from "@/ui/1-atoms/code";

export function Timeline({ items, className }: { items: { time: string; title: React.ReactNode; description?: React.ReactNode; tone?: Tone; lead?: React.ReactNode }[]; className?: string }) {
  return (
    <ol className={cn("relative ms-1 border-s border-line", className)}>
      {items.map((it, i) => (
        <li key={i} className={cn("relative pb-5 last:pb-0", it.lead ? "ps-7" : "ps-6")}>
          {it.lead ? <span className="absolute -start-4 top-0 rounded-full ring-4 ring-bg">{it.lead}</span> : <Dot tone={it.tone ?? "idle"} pulse={false} className="absolute -start-1 top-2 ring-4 ring-bg" />}
          <Mono className="text-caption text-mute">{it.time}</Mono>
          <p className="mt-0.5 text-body text-text">{it.title}</p>
          {it.description && <p className="mt-0.5 text-body text-mute">{it.description}</p>}
        </li>
      ))}
    </ol>
  );
}
