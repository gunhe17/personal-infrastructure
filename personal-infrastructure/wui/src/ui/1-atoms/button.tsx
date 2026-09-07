// [원자] Button · Spinner
import { cn } from "@/lib/cn";

const VARIANT = {
  primary: "bg-pill-on text-on-pill hover:opacity-90",
  secondary: "bg-card-2 text-text hover:bg-card-3",
  ghost: "text-mute hover:bg-card-2 hover:text-text",
  danger: "bg-bad text-white hover:opacity-90",
} as const;

export type ButtonVariant = keyof typeof VARIANT;

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: "sm" | "md" | "lg"; square?: boolean; busy?: boolean };

export function Button({ variant = "secondary", size = "md", square, busy, className, children, ...props }: ButtonProps) {
  return (
    <button type="button" disabled={busy || props.disabled} {...props}
      className={cn("inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-button text-body font-medium pressable",
        square ? (size === "sm" ? "size-8" : size === "lg" ? "size-12" : "size-10") : size === "sm" ? "h-8 px-4 text-caption" : "h-10 px-5", VARIANT[variant], className)}>
      {busy && <Spinner className="appear" />}{children}
    </button>
  );
}

/** [원자] Spinner — 획 1.5px 원, svg 없음. 버튼 안에서만. */
export function Spinner({ className }: { className?: string }) {
  return <span className={cn("inline-block size-4 animate-spin rounded-full border-[1.5px] border-current border-t-transparent", className)} aria-hidden="true" />;
}
