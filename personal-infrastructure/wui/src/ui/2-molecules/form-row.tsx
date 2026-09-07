// [분자] FormRow = 왼쪽 라벨/설명(240) + 오른쪽 컨트롤. FormActions = 바닥 버튼 줄(line 위). Tailwind Plus 의 two-column 폼.
import { cn } from "@/lib/cn";

export function FormRow({ label, hint, className, children }: { label: React.ReactNode; hint?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("grid grid-cols-[240px_1fr] gap-x-8 gap-y-2 py-6 first:pt-0 last:pb-0", className)}>
      <div className="min-w-0"><p className="text-body font-medium text-text">{label}</p>{hint && <p className="mt-1 text-body text-mute">{hint}</p>}</div>
      <div className="min-w-0 space-y-4">{children}</div>
    </div>
  );
}
export function FormActions({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("flex items-center justify-end gap-3 border-t border-line pt-6", className)}>{children}</div>;
}
