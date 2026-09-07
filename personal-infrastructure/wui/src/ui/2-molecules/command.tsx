// [분자] Command = ⌘K 팔레트: Dialog(위쪽) + SearchInput + ITEM 목록(Icon · 라벨 · Kbd). ↑↓ Enter Esc.
import { useEffect, useState } from "react";
import { Dialog as Base } from "@base-ui/react/dialog";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "@/ui/0-tokens/icon";
import { ITEM, POPUP } from "@/ui/0-tokens/recipes";
import { Kbd } from "@/ui/1-atoms/kbd";
import { SearchInput } from "@/ui/2-molecules/search-input";

export type CommandItem = { id: string; label: string; icon?: IconName; hint?: string; keys?: string[]; onSelect: () => void };
export function Command({ open, onOpenChange, items, placeholder = "명령이나 프로젝트 검색" }: { open: boolean; onOpenChange: (open: boolean) => void; items: CommandItem[]; placeholder?: string }) {
  const [q, setQ] = useState(""), [i, setI] = useState(0);
  const list = items.filter((it) => (it.label + " " + (it.hint ?? "")).toLowerCase().includes(q.trim().toLowerCase()));
  useEffect(() => { if (open) { setQ(""); setI(0); } }, [open]);
  const run = (it?: CommandItem) => { if (!it) return; onOpenChange(false); it.onSelect(); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setI((v) => Math.min(list.length - 1, v + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setI((v) => Math.max(0, v - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); run(list[i]); }
  };
  return (
    <Base.Root open={open} onOpenChange={onOpenChange}>
      <Base.Portal>
        <Base.Backdrop className="fixed inset-0 z-40 bg-bg/70 backdrop-blur-sm enter-fade" />
        <Base.Popup className={cn("fixed left-1/2 top-24 z-50 w-[calc(100%-32px)] max-w-[560px] -translate-x-1/2 enter-modal", POPUP)} onKeyDown={onKey}>
          <Base.Title className="sr-only">명령</Base.Title>
          <SearchInput autoFocus placeholder={placeholder} value={q} onChange={(e) => { setQ(e.target.value); setI(0); }} />
          <ul role="listbox" className="mt-1.5 max-h-80 overflow-y-auto">
            {list.length === 0 && <li className="px-3 py-3 text-body text-mute">없음</li>}
            {list.map((it, k) => (
              <li key={it.id} role="option" aria-selected={k === i} data-highlighted={k === i ? "" : undefined} onMouseEnter={() => setI(k)} onClick={() => run(it)} className={cn(ITEM, "gap-3")}>
                {it.icon && <Icon name={it.icon} className="text-mute" />}
                <span className="min-w-0 flex-1 truncate">{it.label}{it.hint && <span className="ms-2 text-mute">{it.hint}</span>}</span>
                {it.keys && <span className="flex gap-1">{it.keys.map((key) => <Kbd key={key}>{key}</Kbd>)}</span>}
              </li>
            ))}
          </ul>
        </Base.Popup>
      </Base.Portal>
    </Base.Root>
  );
}
