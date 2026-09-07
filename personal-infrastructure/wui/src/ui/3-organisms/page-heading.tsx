// [유기체] PageHeading = Breadcrumb + 제목(26) + IconText 메타 + 동작 버튼. 페이지 머리.
import { cn } from "@/lib/cn";
import { Breadcrumb } from "@/ui/2-molecules/breadcrumb";

export function PageHeading({ crumbs, title, meta, actions, className }: { crumbs?: { label: React.ReactNode; href?: string }[]; title: React.ReactNode; meta?: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-end justify-between gap-6", className)}>
      <div className="min-w-0">
        {crumbs && <Breadcrumb items={crumbs} className="mb-3" />}
        <h1 className="truncate text-title-lg text-text">{title}</h1>
        {meta && <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1">{meta}</div>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
    </div>
  );
}
