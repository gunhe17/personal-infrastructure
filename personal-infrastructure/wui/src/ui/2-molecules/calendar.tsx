// [분자] Calendar = 월 격자 + IconButton(이전/다음) + Dot 표시. 오늘은 accent 글자(바탕색은 라이트 bg 위에서 안 보인다), 선택은 accent 채움.
import { useState } from "react";
import { cn } from "@/lib/cn";
import { type Tone } from "@/ui/0-tokens/tone";
import { Dot } from "@/ui/1-atoms/dot";
import { IconButton } from "@/ui/2-molecules/icon-button";

const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function Calendar({ selected, onSelect, marks = {}, initialMonth, className }: { selected?: string; onSelect?: (isoDate: string) => void; marks?: Record<string, Tone>; initialMonth?: Date; className?: string }) {
  const [month, setMonth] = useState(() => { const d = initialMonth ?? new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const today = key(new Date());
  const first = month.getDay(), days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  return (
    <div className={cn("w-[336px]", className)}>
      <div className="mb-3 flex items-center justify-between"><p className="text-body font-medium text-text">{month.getFullYear()}년 {month.getMonth() + 1}월</p><div className="flex gap-1"><IconButton size="sm" label="이전 달" icon="chevronLeft" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} /><IconButton size="sm" label="다음 달" icon="chevronRight" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} /></div></div>
      <div className="grid grid-cols-7 text-center text-caption text-mute">{["일", "월", "화", "수", "목", "금", "토"].map((d) => <span key={d} className="py-1">{d}</span>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => d ? (
          <button key={i} type="button" onClick={() => onSelect?.(key(d))} aria-pressed={key(d) === selected}
            className={cn("relative flex size-11 flex-col items-center justify-center rounded-control text-body tabular-nums pressable", key(d) === selected ? "bg-accent text-white" : key(d) === today ? "font-medium text-accent hover:bg-card-2" : "text-text hover:bg-card-2")}>
            {d.getDate()}{marks[key(d)] && <Dot tone={marks[key(d)]} pulse={false} className={cn("absolute bottom-1.5 size-1.5", key(d) === selected && "bg-white")} />}
          </button>
        ) : <span key={i} />)}
      </div>
    </div>
  );
}
