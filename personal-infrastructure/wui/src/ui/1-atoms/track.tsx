// [원자] Track · SlideTrack — 세그먼트 바탕과 미끄러지는 핀
import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/** [원자] Track — 세그먼트 트랙(card-2, p-1, surface-2 — 안의 ghost 버튼 hover 가 묻히지 않게). Tabs·FilterTabs·ToggleGroup·Pagination 의 바탕. SEG 는 그 안의 칸. */
export function Track({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("inline-flex items-center rounded-button bg-[var(--c2)] p-1 surface-2", className)} {...props} />;
}

/** [원자] SlideTrack — Track + 활성 칸을 따라 미끄러지는 핀(grow · ease-move). 활성은 aria-pressed / data-pressed / data-selected 로 찾는다. Tabs·FilterTabs·ToggleGroup 이 같은 핀을 쓴다. */
export function SlideTrack({ className, children, ...props }: React.ComponentProps<"div">) {
  // ponytail: Base UI 의 render 는 우리 ref 를 떨어뜨린다 — 보이지 않는 첫 자식으로 부모를 잡는다.
  const probe = useRef<HTMLSpanElement>(null);
  const [box, setBox] = useState<{ x: number; w: number } | null>(null);
  useLayoutEffect(() => {
    const el = probe.current?.parentElement; if (!el) return;
    const measure = () => { const a = el.querySelector<HTMLElement>('[aria-pressed="true"],[aria-selected="true"],[data-pressed],[data-active],[data-selected]'); setBox(a ? { x: a.offsetLeft, w: a.offsetWidth } : null); };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    const mo = new MutationObserver(measure); mo.observe(el, { attributes: true, subtree: true, attributeFilter: ["aria-pressed", "aria-selected", "data-pressed", "data-active", "data-selected"] });
    return () => { ro.disconnect(); mo.disconnect(); };
  }, []);
  return (
    <Track className={cn("relative", className)} {...props}>
      <span ref={probe} hidden />
      {box && <span aria-hidden="true" className="absolute inset-y-1 rounded-button bg-pill-on grow" style={{ left: box.x, width: box.w }} />}
      {children}
    </Track>
  );
}
