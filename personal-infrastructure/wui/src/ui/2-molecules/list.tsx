// [분자] List = Card 안에 행을 line 으로 나눠 쌓는다(list container). 행은 ListRow.
import { cn } from "@/lib/cn";
import { Card } from "@/ui/1-atoms/card";

export function List({ className, children, ...props }: React.ComponentProps<typeof Card>) {
  return <Card className={cn("divide-y divide-line [&>*]:py-4 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0", className)} {...props}>{children}</Card>;
}
