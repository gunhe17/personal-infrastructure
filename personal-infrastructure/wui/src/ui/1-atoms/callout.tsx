// [원자] Callout
import { cn } from "@/lib/cn";

/** [원자] Callout — accent 솔리드 위 흰 글자. 페이지당 하나. */
export function Callout({ title, children, className }: { title: React.ReactNode; children?: React.ReactNode; className?: string }) {
  return (
    <div role="alert" className={cn("rounded-card bg-accent p-6 text-white", className)}>
      <p className="text-body font-medium">{title}</p>
      {children && <div className="mt-1 text-body text-white/80">{children}</div>}
    </div>
  );
}
