// [분자] StatTrend = Card + Badge(Icon) + Sparkline
import { Icon } from "@/ui/0-tokens/icon";
import { Badge } from "@/ui/1-atoms/badge";
import { Card } from "@/ui/1-atoms/card";
import { Sparkline } from "@/ui/1-atoms/sparkline";

/** [분자] StatTrend = Card + display 값 + Badge(sm, Icon up/down) + Sparkline(fluid). */
export function StatTrend({ label, value, delta, up, points, className }: { label: string; value: React.ReactNode; delta: React.ReactNode; up?: boolean; points: number[]; className?: string }) {
  return (
    <Card className={className}>
      <p className="text-body text-mute">{label}</p>
      <p className="mt-4 text-display tabular-nums text-text">{value}</p>
      <div className="mt-3 flex items-end gap-4">
        <Badge size="sm" tone={up ? "running" : "failed"}><Icon name={up ? "up" : "down"} size="sm" />{delta}</Badge>
        <div className="min-w-0 flex-1"><Sparkline fluid points={points} tone={up ? "good" : "bad"} height={40} className="block w-full" /></div>
      </div>
    </Card>
  );
}
