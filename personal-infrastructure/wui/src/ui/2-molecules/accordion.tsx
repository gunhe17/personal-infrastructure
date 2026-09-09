// [분자] Accordion = Card(p-2) + 항목(p-1) + 트리거 행 + 패널. 열린 항목은 card-2 블록이 되고, 그 안에서 트리거(hover card-3, 8px 둥글기)와 내용 사이 12, 내용과 블록 바닥 12 의 여백이 있다. 항목 사이 8.
import { Accordion as BaseAccordion } from "@base-ui/react/accordion";
import { cn } from "@/lib/cn";
import { Icon } from "@/ui/0-tokens/icon";
import { Card } from "@/ui/1-atoms/card";

/** [분자] Accordion = Card(p-2) + 둥근 행(interactive) + Icon(chevron). 메뉴처럼 행이 카드 안 여백 안에 머문다 — hover 바탕이 카드 모서리에 닿지 않는다. line 구분 없음(행 간격 4). */
export function Accordion({ items, className }: { items: { value: string; title: React.ReactNode; hint?: React.ReactNode; content: React.ReactNode }[]; className?: string }) {
  return (
    <BaseAccordion.Root render={<Card />} className={cn("space-y-2 p-2", className)}>
      {items.map((it) => (
        <BaseAccordion.Item key={it.value} value={it.value} className="group rounded-control p-1 tint data-[open]:bg-[var(--c2)] data-[open]:[--card-2:var(--c3)] data-[open]:[--card-3:var(--c4)]">
          <BaseAccordion.Header>
            <BaseAccordion.Trigger className="flex w-full items-center justify-between gap-4 rounded-[8px] px-3 py-3 text-start interactive">
              <span className="min-w-0 flex-1"><span className="block text-body-lg font-medium text-text">{it.title}</span>{it.hint && <span className="block text-body text-mute">{it.hint}</span>}</span>
              <Icon name="chevronDown" className="text-mute flip-open tint group-hover:text-text group-data-[open]:text-text" />
            </BaseAccordion.Trigger>
          </BaseAccordion.Header>
          <BaseAccordion.Panel className="unfold text-body text-sub"><div className="px-3 pb-3 pt-3">{it.content}</div></BaseAccordion.Panel>
        </BaseAccordion.Item>
      ))}
    </BaseAccordion.Root>
  );
}
