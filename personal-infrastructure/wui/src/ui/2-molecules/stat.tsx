// [분자] Stat = Card + 숫자
import { Card } from "@/ui/1-atoms/card";

/** [분자] Stat = Card + caption → display → note · delta(info). */
export function Stat({ label, value, note, delta, className }: { label: string; value: React.ReactNode; note?: React.ReactNode; delta?: React.ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <p className="text-body text-mute">{label}</p>
      <p className="mt-4 text-display tabular-nums text-text">{value}</p>
      <div className="mt-3 flex items-center justify-between gap-3 text-body text-mute"><span>{note}</span>{delta && <span className="text-info">{delta}</span>}</div>
    </Card>
  );
}
