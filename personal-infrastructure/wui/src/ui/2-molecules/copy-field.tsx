// [분자] CopyField = Input(readOnly, mono) + IconButton(copy → check). 토큰·명령·주소.
import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Input } from "@/ui/1-atoms/input";
import { IconButton } from "@/ui/2-molecules/icon-button";

export function CopyField({ value, label = "복사", className }: { value: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const copy = async () => {
    let ok = false;
    try { await navigator.clipboard.writeText(value); ok = true; } catch { /* 권한 없음 — 아래 폴백 */ }
    if (!ok) { input.current?.select(); ok = document.execCommand("copy"); }
    if (ok) { setDone(true); window.setTimeout(() => setDone(false), 1500); }
  };
  return (
    <div className={cn("relative", className)}>
      <Input ref={input} readOnly value={value} aria-label={label} className="pe-14 font-mono text-code" onFocus={(e) => e.currentTarget.select()} />
      <IconButton size="sm" label={done ? "복사됨" : label} icon={done ? "check" : "copy"} onClick={copy} className={cn("absolute end-1.5 top-1/2 -translate-y-1/2", done && "text-good")} />
    </div>
  );
}
