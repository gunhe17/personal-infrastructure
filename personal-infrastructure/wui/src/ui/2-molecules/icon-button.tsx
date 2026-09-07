// [분자] IconButton = Button(square) + Icon
import { Icon, type IconName } from "@/ui/0-tokens/icon";
import { Button, type ButtonProps } from "@/ui/1-atoms/button";

/** [분자] IconButton = Button(square) + Icon. sm 32/16 · md 40/20 · lg 48/24. label 필수(aria-label + title). */
export function IconButton({ variant = "ghost", size = "md", label, icon, iconClassName, ...props }: Omit<ButtonProps, "children" | "square"> & { label: string; icon: IconName; iconClassName?: string }) {
  return <Button square variant={variant} size={size} aria-label={label} title={label} {...props}><Icon name={icon} size={size} className={iconClassName} /></Button>;
}
