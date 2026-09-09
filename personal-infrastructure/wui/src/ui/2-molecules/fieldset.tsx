// [분자] Fieldset = 제목(title) + 힌트 + 필드 묶음(space-y-4). 설정 폼의 한 구역.
import { Fieldset as Base } from "@base-ui/react/fieldset";
import { cn } from "@/lib/cn";

export function Fieldset({ title, hint, className, children }: { title: React.ReactNode; hint?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <Base.Root className={cn("block", className)}>
      <Base.Legend className="text-body font-medium text-text">{title}</Base.Legend>
      {hint && <p className="mt-1 text-body text-mute">{hint}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </Base.Root>
  );
}
