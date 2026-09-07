// [원자] Link — accent 글자, interactive(hover 바탕). external 이면 Icon 은 분자라 못 쓰므로 화살표 없이 새 창만.
import { cn } from "@/lib/cn";

export function Link({ external, className, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { external?: boolean }) {
  return <a {...props} target={external ? "_blank" : props.target} rel={external ? "noreferrer" : props.rel} className={cn("-mx-1 rounded-[6px] px-1 text-body text-accent interactive", className)}>{children}</a>;
}
