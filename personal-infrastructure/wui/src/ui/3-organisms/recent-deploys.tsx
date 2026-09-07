// [유기체] RecentDeploys = Card + FilterTabs + ListRow + Badge + IconText + Donut
import { Icon } from "@/ui/0-tokens/icon";
import { Badge } from "@/ui/1-atoms/badge";
import { Card } from "@/ui/1-atoms/card";
import { Donut } from "@/ui/1-atoms/donut";
import { Tile } from "@/ui/1-atoms/tile";
import { FilterTabs } from "@/ui/2-molecules/filter-tabs";
import { IconText } from "@/ui/2-molecules/icon-text";
import { ListRow } from "@/ui/2-molecules/list-row";

const DEPLOYS = [{ name: "api", sub: "연속 배포 7일", stack: "dockerfile", date: "5월 16일", pct: 88 }, { name: "blog", sub: "연속 배포 4일", stack: "static", date: "5월 2일", pct: 23 }, { name: "worker", sub: "연속 배포 13일", stack: "node", date: "5월 5일", pct: 28 }];

/** [유기체] RecentDeploys = Card(Icon 제목 + FilterTabs) + 행(ListRow(Tile) + Badge(Icon) + IconText + Donut) × 3. */
export function RecentDeploys() {
  return (
    <Card icon={<Icon name="deploy" />} title="최근 배포" actions={<FilterTabs value="week" onValueChange={() => {}} items={[{ value: "week", label: "주" }, { value: "month", label: "월" }]} />}>
      <ul className="space-y-5">
        {DEPLOYS.map((r) => (
          <li key={r.name} className="grid grid-cols-[1fr_150px_110px_90px] items-center gap-4">
            <ListRow lead={<Tile>{r.name[0].toUpperCase()}</Tile>} title={r.name} sub={r.sub} />
            <Badge tone="idle"><Icon name="chart" size="sm" className="text-mute" />{r.stack}</Badge>
            <IconText icon="calendar">{r.date}</IconText>
            <span className="flex items-center justify-end gap-3 text-body-lg tabular-nums text-text"><Donut value={r.pct} />{r.pct}%</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
