// [분자] Field = 라벨 + 컨트롤 + 힌트/오류
import { cn } from "@/lib/cn";

/** [분자] Field = 라벨(caption) + 컨트롤 + 힌트/오류. label 로 감싸 getByLabel 이 통한다. */
export function Field({ label, hint, error, className, children }: { label: string; hint?: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-2 block text-caption text-mute">{label}</span>
      {children}
      {error ? <span className="mt-2 block text-caption text-bad">{error}</span> : hint ? <span className="mt-2 block text-caption text-mute">{hint}</span> : null}
    </label>
  );
}
