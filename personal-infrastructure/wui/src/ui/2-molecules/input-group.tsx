// [분자] InputGroup = 접두/접미(mute 텍스트) + Input + 끝 버튼 슬롯. 포커스 링은 그룹이 하나로 그리고 안쪽 Input 의 링은 끈다. https:// · .example.com · 단위 · 인라인 버튼.
import { cn } from "@/lib/cn";
import { Input } from "@/ui/1-atoms/input";

export function InputGroup({ prefix, suffix, end, className, ...props }: React.ComponentProps<"input"> & { prefix?: React.ReactNode; suffix?: React.ReactNode; end?: React.ReactNode }) {
  return (
    <div className={cn("flex h-11 items-stretch overflow-hidden rounded-control bg-card-2 outline outline-2 outline-offset-2 outline-transparent transition-[outline-color] duration-(--duration-base) has-[input:focus]:outline-accent", className)}>
      {prefix && <span className="flex items-center ps-4 text-body text-mute">{prefix}</span>}
      <Input {...props} className={cn("h-full min-w-0 flex-1 rounded-none focus-visible:outline-0", !!prefix && "ps-2", !!suffix && "pe-2")} />
      {suffix && <span className="flex items-center pe-4 text-body text-mute">{suffix}</span>}
      {end && <span className="flex items-center border-s border-line [&>*]:h-full [&>*]:rounded-none">{end}</span>}
    </div>
  );
}
