// [원자] Tile
import { cn } from "@/lib/cn";

/** [원자] Tile — 목록 행의 앞머리. accent 단색. md 48/10px · sm 36/8px. */
export function Tile({ size = "md", children, className }: { size?: "sm" | "md"; children: React.ReactNode; className?: string }) {
  return <span className={cn("flex shrink-0 items-center justify-center bg-accent font-medium text-white", size === "sm" ? "size-9 rounded-[8px] text-body" : "size-12 rounded-tile text-body-lg", className)}>{children}</span>;
}
