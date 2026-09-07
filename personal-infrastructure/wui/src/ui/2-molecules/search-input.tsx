// [분자] SearchInput = Input + Icon
import { cn } from "@/lib/cn";
import { Icon } from "@/ui/0-tokens/icon";
import { Input } from "@/ui/1-atoms/input";

/** [분자] SearchInput = Input(40, button radius) + Icon(search). */
export function SearchInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cn("relative block", className)}>
      <Icon name="search" size="sm" className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-mute" />
      <span className="sr-only">검색</span>
      <Input {...props} className="h-10 rounded-button ps-11" />
    </label>
  );
}
