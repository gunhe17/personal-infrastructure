// [원자] Input · Textarea
import { cn } from "@/lib/cn";

export const inputClass = "w-full rounded-control bg-card-2 px-4 text-body text-text focus-in placeholder:text-mute disabled:cursor-not-allowed disabled:opacity-40";

export function Input({ dense, className, ...props }: React.ComponentProps<"input"> & { dense?: boolean }) {
  return <input className={cn(inputClass, dense ? "h-9" : "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(inputClass, "min-h-28 resize-y py-3 font-mono text-code", className)} {...props} />;
}
