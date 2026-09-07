// [분자] Dialog = Card + Button · ConfirmDialog = Dialog + Button × 2
import { Dialog as Base } from "@base-ui/react/dialog";
import { cn } from "@/lib/cn";
import { Button } from "@/ui/1-atoms/button";
import { Card } from "@/ui/1-atoms/card";

/** [분자] Dialog = Card(팝업) + 제목·설명 + Button 슬롯. 폭 480/640, 배경 bg/70 + blur. */
export function Dialog({ open, onOpenChange, title, description, wide, children, footer }: { open: boolean; onOpenChange: (open: boolean) => void; title: React.ReactNode; description?: React.ReactNode; wide?: boolean; children?: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <Base.Root open={open} onOpenChange={onOpenChange}>
      <Base.Portal>
        <Base.Backdrop className="fixed inset-0 z-40 bg-bg/70 backdrop-blur-sm enter-fade" />
        <Base.Popup render={<Card />} className={cn("fixed left-1/2 top-1/2 z-50 w-[calc(100%-32px)] -translate-x-1/2 -translate-y-1/2 outline-none ring-1 ring-line enter-modal", wide ? "max-w-[640px]" : "max-w-[480px]")}>
          <Base.Title className="text-title text-text">{title}</Base.Title>
          {description && <Base.Description className="mt-2 text-body text-mute">{description}</Base.Description>}
          {children && <div className="mt-6">{children}</div>}
          {footer && <div className="mt-8 flex justify-end gap-3">{footer}</div>}
        </Base.Popup>
      </Base.Portal>
    </Base.Root>
  );
}

/** [분자] ConfirmDialog = Dialog + Button(취소) + Button(danger). */
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = "삭제", busy, onConfirm, children }: { open: boolean; onOpenChange: (open: boolean) => void; title: React.ReactNode; description?: React.ReactNode; confirmLabel?: string; busy?: boolean; onConfirm: () => void; children?: React.ReactNode }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} description={description}
      footer={<><Button onClick={() => onOpenChange(false)}>취소</Button><Button variant="danger" busy={busy} onClick={onConfirm}>{confirmLabel}</Button></>}>
      {children}
    </Dialog>
  );
}
