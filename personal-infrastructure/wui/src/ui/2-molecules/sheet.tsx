// [분자] Sheet = 오른쪽에서 미끄러져 오는 Card(Dialog). 상세·편집 패널.
import { Dialog as Base } from "@base-ui/react/dialog";
import { cn } from "@/lib/cn";
import { Card } from "@/ui/1-atoms/card";
import { IconButton } from "@/ui/2-molecules/icon-button";

export function Sheet({ open, onOpenChange, title, description, wide, children, footer }: { open: boolean; onOpenChange: (open: boolean) => void; title: React.ReactNode; description?: React.ReactNode; wide?: boolean; children?: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <Base.Root open={open} onOpenChange={onOpenChange}>
      <Base.Portal>
        <Base.Backdrop className="fixed inset-0 z-40 bg-bg/70 backdrop-blur-sm enter-fade" />
        <Base.Popup render={<Card />} className={cn("fixed inset-y-3 end-3 z-50 flex w-[calc(100%-24px)] flex-col overflow-y-auto outline-none ring-1 ring-line enter-side", wide ? "max-w-[640px]" : "max-w-[420px]")}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0"><Base.Title className="text-title text-text">{title}</Base.Title>{description && <Base.Description className="mt-2 text-body text-mute">{description}</Base.Description>}</div>
            <Base.Close render={<IconButton label="닫기" icon="close" className="-me-2 -mt-2" />} />
          </div>
          {children && <div className="mt-6 flex-1">{children}</div>}
          {footer && <div className="mt-8 flex justify-end gap-3">{footer}</div>}
        </Base.Popup>
      </Base.Portal>
    </Base.Root>
  );
}
