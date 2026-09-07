// 층 검사 — ui/<n>-*/ 파일은 자기보다 아래 층만 임포트한다. 같은 층은 "기초 분자"(BASE) 만 허용, 순환 없음.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
const root = new URL("../src/ui/", import.meta.url).pathname;
const BASE = new Set(["2-molecules/icon-button", "2-molecules/status-dot", "2-molecules/icon-text", "2-molecules/search-input", "2-molecules/field", "3-organisms/top-bar"]);
let bad = 0;
for (const dir of readdirSync(root).filter((d) => /^\d-/.test(d))) {
  const layer = Number(dir[0]);
  for (const file of readdirSync(join(root, dir))) {
    const src = readFileSync(join(root, dir, file), "utf8");
    for (const [, target] of src.matchAll(/from "@\/ui\/((\d)-[^"]+)"/g)) {
      const t = Number(target[0]);
      const ok = t < layer || (t === layer && BASE.has(target) && !BASE.has(`${dir}/${file.replace(/\.tsx?$/, "")}`));
      if (!ok) { bad += 1; console.log(`FAIL  ${dir}/${file} → ${target}`); }
    }
  }
}
console.log(bad ? `LAYERS FAIL ${bad}` : "LAYERS PASS");
process.exit(bad ? 1 : 0);
