// [원자] Container — 페이지 폭 1120 + 좌우 24. 앱 셸·페이지가 쓴다.
import { cn } from "@/lib/cn";

export function Container({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-[1168px] px-6", className)} {...props} />;
}
