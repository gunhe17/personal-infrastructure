// [원자] Tooltip
import { Tooltip as Base } from "@base-ui/react/tooltip";

export function Tooltip({ content, children }: { content: React.ReactNode; children: React.ReactElement }) {
  return (
    <Base.Root>
      <Base.Trigger render={children} />
      <Base.Portal>
        <Base.Positioner sideOffset={8} className="z-50">
          <Base.Popup className="rounded-button bg-pill-on px-3 py-1.5 text-caption text-on-pill enter-drop">{content}</Base.Popup>
        </Base.Positioner>
      </Base.Portal>
    </Base.Root>
  );
}

export const TooltipProvider = Base.Provider;
