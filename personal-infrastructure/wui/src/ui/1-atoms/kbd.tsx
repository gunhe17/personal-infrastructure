// [원자] Kbd


/** [원자] Kbd — card-3 6px mono. */
export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-[6px] bg-card-3 px-1.5 font-mono text-caption text-text">{children}</kbd>;
}
