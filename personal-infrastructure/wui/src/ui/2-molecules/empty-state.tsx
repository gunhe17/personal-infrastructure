// [분자] EmptyState = 제목 + 설명 + Button 슬롯

/** [분자] EmptyState = 제목 + 설명 + Button 슬롯. 카드 안에 둔다. */
export function EmptyState({ title, children, action }: { title: React.ReactNode; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="text-title text-text">{title}</p>
      {children && <p className="mx-auto mt-2 max-w-[48ch] text-body text-mute">{children}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}
