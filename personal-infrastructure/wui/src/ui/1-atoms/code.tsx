// [원자] Code · InlineCode · Mono — 기술 값
import { cn } from "@/lib/cn";

/** [원자] Code · InlineCode · Mono — 기술 값. */
export function Code({ children, className }: { children: React.ReactNode; className?: string }) {
  return <pre className={cn("overflow-x-auto rounded-tile bg-card-2 p-4 font-mono text-code text-text", className)}>{children}</pre>;
}

export function InlineCode({ children }: { children: React.ReactNode }) {
  return <code className="rounded-md bg-card-2 px-1.5 py-0.5 font-mono text-code text-text">{children}</code>;
}

export function Mono({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("font-mono text-code text-sub", className)}>{children}</span>;
}
