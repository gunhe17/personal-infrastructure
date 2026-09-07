// [분자] IconText = Icon + 텍스트
import { cn } from "@/lib/cn";
import { Icon } from "@/ui/0-tokens/icon";

/** [분자] IconText = Icon + 텍스트 한 줄(mute). 날짜·스택 같은 보조 값. */
export function IconText({ icon, children, className }: { icon: React.ComponentProps<typeof Icon>["name"]; children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-2 text-body text-mute", className)}><Icon name={icon} size="sm" />{children}</span>;
}
