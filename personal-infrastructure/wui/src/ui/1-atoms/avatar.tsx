// [원자] Avatar
import { Avatar as BaseAvatar } from "@base-ui/react/avatar";
import { cn } from "@/lib/cn";
import { TONE, type Tone } from "@/ui/0-tokens/tone";

/** [원자] Avatar — accent 원 + 흰 이니셜(또는 이미지). */
/** status 가 있으면 우하단에 톤 점(ring-card). */
export function Avatar({ name, src, size = 40, status, className }: { name: string; src?: string; size?: number; status?: Tone; className?: string }) {
  return (
    <BaseAvatar.Root className={cn("relative inline-flex shrink-0 select-none items-center justify-center rounded-full bg-accent font-medium text-white", className)} style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {src && <BaseAvatar.Image src={src} alt={name} className="size-full rounded-full object-cover" />}
      <BaseAvatar.Fallback>{name.slice(0, 1).toUpperCase()}</BaseAvatar.Fallback>
      {status && <span className={cn("absolute -bottom-px -end-px rounded-full ring-2 ring-card tint", TONE[status].dot)} style={{ width: Math.max(8, size * 0.28), height: Math.max(8, size * 0.28) }} aria-hidden="true" />}
    </BaseAvatar.Root>
  );
}
