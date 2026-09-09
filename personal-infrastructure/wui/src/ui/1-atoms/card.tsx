// [원자] Card — 모든 표면의 바탕
import { cn } from "@/lib/cn";

/** [원자] Card — 16px card 바탕, 안쪽 24. 제목 22(아이콘은 20 mute 로 앞에)·부제·우측 액션 슬롯. 화면마다 카드 제목 크기가 달라지지 않게 하나로. props 는 그대로 흘려 Base UI 의 render 로도 쓴다. */
export function Card({ title, subtitle, icon, actions, footer, pad = "p-5 sm:p-6", className, children, ...props }: React.ComponentProps<"section"> & { title?: React.ReactNode; subtitle?: React.ReactNode; icon?: React.ReactNode; actions?: React.ReactNode; footer?: React.ReactNode; pad?: string }) {
  return (
    <section className={cn("rounded-card bg-card", pad, className)} {...props}>
      {(title || actions) && (
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0"><h2 className="flex items-center gap-3 text-title text-text">{icon && <span className="text-mute">{icon}</span>}{title}</h2>{subtitle && <p className="mt-1 text-body text-mute">{subtitle}</p>}</div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
      {footer && <div className="mt-6 flex items-center justify-end gap-3 border-t border-line pt-4">{footer}</div>}
    </section>
  );
}
