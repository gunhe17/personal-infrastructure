// [원자] Skeleton
import { cn } from "@/lib/cn";

/** [원자] Skeleton — card-2 블록, pulse. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-control bg-card-2", className)} aria-hidden="true" />;
}
