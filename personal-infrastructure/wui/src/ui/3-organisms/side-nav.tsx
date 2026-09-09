// [유기체] SideNav = Avatar + Tile + NavList + Dot + Separator — 한 열에 프로젝트와 그 안의 항목을 함께
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "@/ui/0-tokens/icon";
import { Avatar } from "@/ui/1-atoms/avatar";
import { Dot } from "@/ui/1-atoms/dot";
import { Separator } from "@/ui/1-atoms/separator";
import { Tile } from "@/ui/1-atoms/tile";
import { NavList } from "@/ui/2-molecules/nav-list";
import { type Tone } from "@/ui/0-tokens/tone";

export type NavProject = { value: string; label: string; tone?: Tone };
export type NavItem = { value: string; label: string; icon?: IconName; count?: number };

/**
 * [유기체] SideNav — 서비스 셸의 한 열(사용자 결정 2026-09-09: Layout Lab X4).
 * 프로젝트를 세로로 세우고 **고른 프로젝트 아래에서만** 그 항목이 펼쳐진다. 열이 하나라 본문이 넓다.
 * 프로젝트에 속하지 않는 것(리소스·백업·엣지…)은 아래 `system` 묶음으로 내린다.
 */
export function SideNav({ brand = "homeserver", projects, project, onProjectChange, items, item, onItemChange, system, systemLabel = "System", profile, status, className }: {
  brand?: React.ReactNode;
  projects: NavProject[];
  project: string;
  onProjectChange?: (v: string) => void;
  items: NavItem[];
  item: string;
  onItemChange?: (v: string) => void;
  system?: NavItem[];
  systemLabel?: string;
  /** 바닥 프로필 줄 — 아바타 + 이름 + 부연 + 끝 슬롯(보통 Menu 트리거). */
  profile?: { name: string; sub?: React.ReactNode; end?: React.ReactNode; onClick?: () => void };
  /** 프로필 위 한 줄 — 호스트 상태처럼 늘 보여야 하는 것. */
  status?: React.ReactNode;
  className?: string;
}) {
  return (
    <nav className={cn("flex w-[240px] shrink-0 flex-col gap-1 bg-card p-3", className)} aria-label="서비스 내비게이션">
      <span className="flex items-center gap-3 px-2 py-1"><Avatar name="P" size={32} /><span className="truncate text-body font-medium text-text">{brand}</span></span>
      <Separator className="my-2" />
      {projects.length === 0 && <p className="px-3 py-2 text-caption text-mute">No projects yet</p>}
      {projects.map((p) => {
        const on = p.value === project;
        return (
          <div key={p.value}>
            <button type="button" onClick={() => onProjectChange?.(p.value)} aria-expanded={on}
              className={cn("flex w-full items-center gap-3 rounded-control px-2 py-2 text-start interactive", on && "bg-card-2")}>
              <Tile size="sm">{p.label[0].toUpperCase()}</Tile>
              <span className="min-w-0 flex-1 truncate text-body font-medium text-text">{p.label}</span>
              {on ? <Icon name="chevronDown" size="sm" className="text-mute" /> : p.tone && <Dot tone={p.tone} />}
            </button>
            {/* 고른 프로젝트만 항목을 편다 — 세로선이 어디에 속한 항목인지 말한다 */}
            {on && <div className="ms-4 mt-1 border-s border-line ps-2 unfold"><NavList items={items} value={item} onValueChange={(v) => onItemChange?.(v)} /></div>}
          </div>
        );
      })}
      {system && <>
        <Separator className="my-2" />
        <p className="px-3 pb-1 text-caption text-mute">{systemLabel}</p>
        <NavList items={system} value={item} onValueChange={(v) => onItemChange?.(v)} />
      </>}
      {(profile || status) && (
        <div className="mt-auto pt-3">
          {status && <div className="px-3 pb-2 text-caption">{status}</div>}
          {profile && (
            <>
              <Separator className="mb-1" />
              {/* 프로필 줄 — 다른 행과 같은 문법(아바타 + 이름 15/500 + 부연 13 + 끝 슬롯) */}
              <button type="button" onClick={profile.onClick} className="flex w-full items-center gap-3 rounded-control px-2 py-2 text-start interactive">
                <Avatar name={profile.name} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-medium text-text">{profile.name}</span>
                  {profile.sub !== undefined && <span className="block truncate text-caption text-mute">{profile.sub}</span>}
                </span>
                {profile.end}
              </button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
