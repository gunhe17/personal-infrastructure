// [유기체] EdgeRequests = Card + display + Gauge + Separator + StatusDot + DotMatrix
import { Icon } from "@/ui/0-tokens/icon";
import { Button } from "@/ui/1-atoms/button";
import { Card } from "@/ui/1-atoms/card";
import { Gauge } from "@/ui/1-atoms/gauge";
import { Separator } from "@/ui/1-atoms/separator";
import { DotMatrix } from "@/ui/2-molecules/dot-matrix";
import { StatusDot } from "@/ui/2-molecules/status-dot";

const DOTS = ["6월", "7월", "8월"].map((label, mi) => ({ label, cells: Array.from({ length: 28 }, (_, i) => (i * 7 + mi * 3) % 5 < 3) }));

/** [유기체] EdgeRequests = Card(Icon 제목 + Button) + display 값 + Gauge + Separator + StatusDot 범례 + DotMatrix. */
export function EdgeRequests() {
  return (
    <Card icon={<Icon name="user" />} title="엣지로 들어온 요청" actions={<Button variant="primary" size="sm">전체 통계</Button>}>
      <div><p className="text-display tabular-nums text-text">125,693</p><p className="mt-3 text-body text-mute">지난 24시간 요청</p></div>
      <Gauge className="mt-8" value={0.72} start="10k" end="200k" />
      <Separator className="mt-5" />
      <div className="mt-5 flex gap-5"><StatusDot tone="idle">&lt;5k</StatusDot><StatusDot tone="info" muted>&gt;5k</StatusDot></div>
      <div className="mt-8 flex items-center justify-between gap-8"><p className="text-title leading-tight text-text">일별<br />요청량</p><DotMatrix groups={DOTS} /></div>
    </Card>
  );
}
