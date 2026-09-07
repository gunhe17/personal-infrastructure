// [분자] ButtonGroup = Button 을 이어 붙인 한 덩어리 — 바깥만 둥글고 사이는 line.
import { cn } from "@/lib/cn";

/** [분자] ButtonGroup — 자식 Button(secondary) 을 붙인다. 첫/끝만 둥글고 사이는 1px line. */
export function ButtonGroup({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div role="group" className={cn("inline-flex overflow-hidden rounded-button bg-card-2 [&>*]:rounded-none [&>*+*]:border-s [&>*+*]:border-line", className)} {...props}>{children}</div>;
}
