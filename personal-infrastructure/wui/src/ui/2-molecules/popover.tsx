// [분자] Popover = 팝업 레시피 + 텍스트
import { Popover as BasePopover } from "@base-ui/react/popover";
import { cn } from "@/lib/cn";
import { POPUP } from "@/ui/0-tokens/recipes";

/** [분자] Popover = 팝업 레시피(288) + 제목·설명 + 본문 슬롯. */
export function Popover({ trigger, title, description, children, align = "start" }: { trigger: React.ReactElement; title?: React.ReactNode; description?: React.ReactNode; children?: React.ReactNode; align?: "start" | "end" }) {
  return (
    <BasePopover.Root>
      <BasePopover.Trigger render={trigger} />
      <BasePopover.Portal>
        <BasePopover.Positioner align={align} sideOffset={8} className="z-30 outline-none">
          <BasePopover.Popup className={cn("w-72 p-5 enter-drop", POPUP)}>
            {title && <BasePopover.Title className="text-body font-medium text-text">{title}</BasePopover.Title>}
            {description && <BasePopover.Description className="mt-1 text-body text-mute">{description}</BasePopover.Description>}
            {children && <div className="mt-4">{children}</div>}
          </BasePopover.Popup>
        </BasePopover.Positioner>
      </BasePopover.Portal>
    </BasePopover.Root>
  );
}
