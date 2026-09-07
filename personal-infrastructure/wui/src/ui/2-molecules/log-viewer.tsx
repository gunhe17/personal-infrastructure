// [분자] LogViewer = Card + StatusDot + terminal
import { cn } from "@/lib/cn";
import { Card } from "@/ui/1-atoms/card";
import { StatusDot } from "@/ui/2-molecules/status-dot";

export type LogLine = { id: number | string; stream: string; line: string };

const LOG_STATE = { streaming: { tone: "progress", label: "스트리밍" }, done: { tone: "idle", label: "끝" }, failed: { tone: "failed", label: "실패" } } as const;

/** [분자] LogViewer = Card(제목 로그 · 액션 StatusDot) + terminal 블록. */
export function LogViewer({ lines, state, className }: { lines: LogLine[]; state?: keyof typeof LOG_STATE; className?: string }) {
  const ref = (el: HTMLDivElement | null) => { if (el) el.scrollTop = el.scrollHeight; };
  return (
    <Card className={className} title={state && "로그"} actions={state && <StatusDot tone={LOG_STATE[state].tone}>{LOG_STATE[state].label}</StatusDot>}>
      <div ref={ref} className="max-h-[60vh] min-h-40 overflow-y-auto rounded-tile bg-terminal p-4 font-mono text-code text-[#e5e5e5]">
        {lines.length === 0 ? <span className="text-[#737373]">로그 없음</span> : lines.map((l) => (
          <div key={l.id} className={cn("appear whitespace-pre-wrap break-all", (l.stream === "error" || l.stream === "warn") && "text-[#ff8a95]", l.stream === "audit" && "text-[#9fe3b0]")}><span className="inline-block w-14 select-none text-[#737373]">{l.stream}</span>{l.line}</div>
        ))}
      </div>
    </Card>
  );
}
