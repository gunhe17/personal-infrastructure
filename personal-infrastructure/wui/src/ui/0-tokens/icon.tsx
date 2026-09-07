// [토큰] 아이콘 — Heroicons outline 만. 획은 크기와 무관하게 화면 1.5px.
import { ArchiveBoxIcon, ArrowPathIcon, ArrowRightIcon, ArrowRightStartOnRectangleIcon, ArrowTopRightOnSquareIcon, ArrowTrendingDownIcon, ArrowTrendingUpIcon, ArrowUpTrayIcon, ArrowsRightLeftIcon, BellIcon, BoltIcon, CalendarIcon, ChartBarIcon, CheckIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon, CircleStackIcon, ClockIcon, Cog6ToothIcon, CommandLineIcon, CubeIcon, DocumentDuplicateIcon, DocumentTextIcon, EllipsisHorizontalIcon, EnvelopeIcon, ExclamationTriangleIcon, FunnelIcon, GlobeAltIcon, HeartIcon, InformationCircleIcon, KeyIcon, LightBulbIcon, LockClosedIcon, MagnifyingGlassIcon, MapIcon, MinusIcon, MoonIcon, PauseIcon, PlayIcon, PlusIcon, QueueListIcon, RectangleStackIcon, RocketLaunchIcon, ServerIcon, ShieldCheckIcon, SignalIcon, SparklesIcon, Square3Stack3DIcon, StarIcon, StopIcon, SunIcon, TrashIcon, UsersIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/cn";

export const ICONS = {
  // 도메인
  project: CubeIcon, deploy: RocketLaunchIcon, domain: GlobeAltIcon, database: CircleStackIcon, backup: ArchiveBoxIcon, volume: RectangleStackIcon, monitor: SignalIcon, job: QueueListIcon, audit: DocumentTextIcon, settings: Cog6ToothIcon,
  edge: ArrowsRightLeftIcon, route: MapIcon, log: CommandLineIcon, secret: KeyIcon, credential: LockClosedIcon, tunnel: ShieldCheckIcon, mail: EnvelopeIcon, notify: BellIcon, user: UsersIcon, server: ServerIcon, health: HeartIcon, insight: LightBulbIcon, layers: Square3Stack3DIcon, spark: SparklesIcon, bolt: BoltIcon, chart: ChartBarIcon,
  // 동작
  play: PlayIcon, stop: StopIcon, pause: PauseIcon, restart: ArrowPathIcon, trash: TrashIcon, copy: DocumentDuplicateIcon, upload: ArrowUpTrayIcon, logout: ArrowRightStartOnRectangleIcon, add: PlusIcon, remove: MinusIcon, more: EllipsisHorizontalIcon, search: MagnifyingGlassIcon, filter: FunnelIcon, external: ArrowTopRightOnSquareIcon,
  // 상태·방향
  check: CheckIcon, close: XMarkIcon, info: InformationCircleIcon, warning: ExclamationTriangleIcon, up: ArrowTrendingUpIcon, down: ArrowTrendingDownIcon, star: StarIcon, clock: ClockIcon, calendar: CalendarIcon, arrowRight: ArrowRightIcon,
  chevronDown: ChevronDownIcon, chevronUp: ChevronUpIcon, chevronLeft: ChevronLeftIcon, chevronRight: ChevronRightIcon,
  // 캔버스
  sun: SunIcon, moon: MoonIcon,
} satisfies Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>>;

export type IconName = keyof typeof ICONS;

export type IconSize = "sm" | "md" | "lg";

const SIZE: Record<IconSize, number> = { sm: 16, md: 20, lg: 24 };

export const STROKE_PX = 1.5;

export function Icon({ name, size = "md", className, ...props }: { name: IconName; size?: IconSize; className?: string } & Omit<React.SVGProps<SVGSVGElement>, "className">) {
  const Glyph = ICONS[name], px = SIZE[size];
  return <Glyph width={px} height={px} strokeWidth={(STROKE_PX * 24) / px} aria-hidden="true" className={cn("shrink-0", className)} style={{ width: px, height: px }} {...props} />;
}
