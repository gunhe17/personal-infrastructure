// [분자] AvatarGroup = Avatar 를 겹쳐 쌓고 넘치면 +N.
import { cn } from "@/lib/cn";
import { Avatar } from "@/ui/1-atoms/avatar";

export function AvatarGroup({ names, max = 4, size = 32, className }: { names: string[]; max?: number; size?: number; className?: string }) {
  const shown = names.slice(0, max), rest = names.length - shown.length;
  return (
    <div className={cn("flex items-center", className)}>
      {shown.map((n, i) => <Avatar key={n} name={n} size={size} className={cn("ring-2 ring-card", i > 0 && "-ms-2")} />)}
      {rest > 0 && <span className="-ms-2 inline-flex items-center justify-center rounded-full bg-card-3 font-medium text-text ring-2 ring-card" style={{ width: size, height: size, fontSize: size * 0.36 }}>+{rest}</span>}
    </div>
  );
}
