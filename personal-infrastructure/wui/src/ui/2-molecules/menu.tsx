// [분자] Menu = 팝업 레시피 + MenuItem
import { Menu as Base } from "@base-ui/react/menu";
import { cn } from "@/lib/cn";
import { ITEM, POPUP } from "@/ui/0-tokens/recipes";

/** [분자] Menu = 팝업 레시피 + MenuItem. 파괴적 항목은 bad. */
export function Menu({ trigger, children, align = "end" }: { trigger: React.ReactElement; children: React.ReactNode; align?: "start" | "end" }) {
  return (
    <Base.Root>
      <Base.Trigger render={trigger} />
      <Base.Portal>
        <Base.Positioner align={align} sideOffset={8} className="z-30 outline-none">
          <Base.Popup className={cn("min-w-52 enter-drop", POPUP)}>{children}</Base.Popup>
        </Base.Positioner>
      </Base.Portal>
    </Base.Root>
  );
}

export function MenuItem({ danger, className, ...props }: Omit<React.ComponentProps<typeof Base.Item>, "className"> & { danger?: boolean; className?: string }) {
  return <Base.Item {...props} className={cn(ITEM, danger && "text-bad", className)} />;
}

export function MenuLabel({ children }: { children: React.ReactNode }) { return <div className="px-3 py-2 text-caption text-mute">{children}</div>; }

export function MenuSeparator() { return <Base.Separator className="my-1.5 h-px bg-line" />; }
