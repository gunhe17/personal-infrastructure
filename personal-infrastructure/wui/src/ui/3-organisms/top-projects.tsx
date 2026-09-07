// [유기체] TopProjects = Card + IconButton + ListRow(Tile + Icon) × 3
import { Icon, type IconName } from "@/ui/0-tokens/icon";
import { Card } from "@/ui/1-atoms/card";
import { Tile } from "@/ui/1-atoms/tile";
import { IconButton } from "@/ui/2-molecules/icon-button";
import { ListRow } from "@/ui/2-molecules/list-row";

const TOP: { name: string; sub: string; value: string; icon: IconName }[] = [{ name: "api", sub: "+120 요청/분", value: "4,120", icon: "server" }, { name: "blog", sub: "+82 방문", value: "3,780", icon: "log" }, { name: "worker", sub: "+12 실행 중", value: "2,980", icon: "bolt" }];

/** [유기체] TopProjects = Card + IconButton + ListRow(Tile + Icon) × 3. */
export function TopProjects() {
  return (
    <Card title="상위 프로젝트" subtitle={<><span className="text-text">178</span> 개 배포</>} actions={<IconButton label="더" icon="more" />}>
      <ul className="space-y-5">{TOP.map((t) => <li key={t.name}><ListRow lead={<Tile><Icon name={t.icon} /></Tile>} title={t.name} sub={t.sub} value={t.value} /></li>)}</ul>
    </Card>
  );
}
