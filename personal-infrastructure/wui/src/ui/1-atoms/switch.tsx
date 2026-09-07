// [원자] Switch
import { Switch as Base } from "@base-ui/react/switch";
import { cn } from "@/lib/cn";

export function Switch({ checked, onCheckedChange, label, hint, boxed, className, ...props }: { checked: boolean; onCheckedChange: (checked: boolean) => void; label?: React.ReactNode; hint?: React.ReactNode; boxed?: boolean; className?: string; "aria-label"?: string; disabled?: boolean }) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-3 text-body tint has-[:disabled]:cursor-not-allowed", boxed ? "h-12 rounded-button bg-card-2 px-5 text-mute" : "text-text", !!hint && "w-full items-start gap-4", className)}>
      {hint ? <span className="flex-1"><span className="block text-body text-text">{label}</span><span className="block text-caption text-mute">{hint}</span></span> : label}
      <Base.Root checked={checked} onCheckedChange={onCheckedChange} {...props}
        className="relative h-6 w-11 shrink-0 rounded-full bg-card-3 p-0.5 pressable">
        <Base.Thumb className="block size-5 rounded-full bg-mute move data-[checked]:translate-x-5 data-[checked]:bg-accent" />
      </Base.Root>
    </label>
  );
}
