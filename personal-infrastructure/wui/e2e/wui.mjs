// 브라우저 e2e — 컴포넌트 캔버스. env: PI_API_URL(기본 http://127.0.0.1:7879), PI_SHOTS
import { chromium } from "playwright";

const base = process.env.PI_API_URL ?? "http://127.0.0.1:7879";
const shots = process.env.PI_SHOTS ?? "/tmp/pi-e2e/shots";
const results = [];
const check = async (id, desc, fn) => { try { await fn(); results.push(["PASS", id, desc]); } catch (e) { results.push(["FAIL", id, desc, String(e.message ?? e).split("\n")[0]]); } };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("pageerror", (e) => results.push(["FAIL", "W-js", "브라우저 콘솔 예외", e.message]));
const shot = (name) => page.screenshot({ path: `${shots}/${name}.png` });

await check("W1", "캔버스가 뜨고 요소가 전부 렌더, 세로로만 넘친다", async () => {
  await page.goto(`${base}/ui/`); await page.waitForLoadState("networkidle");
  const n = await page.locator("[data-item]").count(); if (n < 30) throw new Error(`요소 ${n}개`);
  const over = await page.evaluate(() => { const m = document.querySelector("main"); return m.scrollHeight > m.clientHeight && m.scrollWidth <= m.clientWidth; });
  if (!over) throw new Error("세로로만 넘쳐야 한다 (가로 스크롤 생김)");
  await shot("canvas");
});
await check("W2", "떠 있는 도구 — 테마 토글이 data-theme 를 바꾼다", async () => {
  const before = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.getByRole("button", { name: before === "dark" ? "라이트로" : "다크로", exact: true }).click();
  const after = await page.evaluate(() => document.documentElement.dataset.theme);
  if (after === before) throw new Error("테마가 안 바뀜");
  await page.getByRole("button", { name: after === "dark" ? "라이트로" : "다크로", exact: true }).click();
});
await check("W3", "메뉴·모달·셀렉트·탭이 동작", async () => {
  await page.getByRole("button", { name: /동작/ }).click(); await page.getByRole("menuitem", { name: "프로젝트 삭제" }).waitFor(); await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "삭제 확인" }).click(); await page.getByRole("dialog").getByText("api 를 지울까요?").waitFor(); await page.getByRole("dialog").getByRole("button", { name: "취소" }).click();
  const sel = page.getByRole("combobox").filter({ hasText: /Postgres 16|Redis 7/ }).first(); await sel.click(); await page.getByRole("option", { name: "Redis 7" }).click(); await sel.getByText("Redis 7").waitFor();
  await page.locator("#tabs").getByRole("tab", { name: /환경변수/ }).click(); await page.getByText("env 패널").waitFor();
});
await check("W4", "줌 — 버튼·⌘0·저장", async () => {
  const w0 = await page.evaluate(() => document.querySelector("main").scrollHeight);
  await page.getByRole("button", { name: "축소" }).click(); await page.waitForTimeout(250); await page.getByRole("button", { name: "축소" }).click(); await page.waitForTimeout(400);
  await page.getByRole("button", { name: "원래 크기" }).getByText("69%").waitFor();
  const w1 = await page.evaluate(() => document.querySelector("main").scrollHeight); if (!(w1 < w0)) throw new Error(`축소돼도 높이가 같다 ${w0}→${w1}`);
  await page.reload({ waitUntil: "networkidle" }); await page.getByRole("button", { name: "원래 크기" }).getByText("69%").waitFor();
  await page.keyboard.press("Meta+0"); await page.waitForTimeout(300); await page.getByRole("button", { name: "원래 크기" }).getByText("100%").waitFor();
});
await check("W5", "확장 원자 — 체크·콤보박스·토글·아코디언·팝오버·토스트", async () => {
  const cb = page.getByRole("checkbox", { name: "자동 배포" }); await cb.click(); if (await cb.getAttribute("aria-checked") !== "false") throw new Error("체크 안 풀림");
  await page.getByRole("combobox", { name: "프로젝트" }).fill("blog"); await page.getByRole("option", { name: /blog/ }).click(); if (!(await page.getByRole("combobox", { name: "프로젝트" }).inputValue()).includes("blog")) throw new Error("콤보박스 선택 안 됨");
  await page.getByRole("button", { name: "목록", exact: true }).click(); if (await page.getByRole("button", { name: "목록", exact: true }).getAttribute("aria-pressed") !== "true") throw new Error("토글 안 됨");
  await page.getByRole("button", { name: /^푸시 투 디플로이/ }).click(); await page.getByLabel("저장소 URL").waitFor();
  await page.getByRole("button", { name: /포트 20000/ }).click(); await page.getByText("루프백 포트").waitFor(); await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "성공 토스트" }).click(); await page.getByText("배포를 큐에 넣었다").waitFor();
  await shot("atoms-extended");
});
await check("W6", "새 분자 — 명령 팔레트·시트·복사", async () => {
  await page.getByRole("button", { name: /명령 팔레트/ }).click(); await page.getByRole("option", { name: /새 배포/ }).waitFor(); await page.getByPlaceholder("명령이나 프로젝트 검색").fill("blog"); await page.getByRole("option", { name: /blog/ }).waitFor(); await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "시트 열기" }).click(); await page.getByRole("dialog").getByText("api 설정").waitFor(); await page.getByRole("button", { name: "닫기" }).click();
  await page.locator("#copy-field").getByRole("button", { name: "복사", exact: true }).click(); await page.locator("#copy-field").getByRole("button", { name: "복사됨" }).waitFor();
});
await check("W7", "Tailwind Plus 구성 — 캘린더·내비·알림 닫기·InputGroup", async () => {
  await page.locator("#calendar").getByRole("button", { name: "20", exact: true }).click(); if (await page.locator("#calendar").getByRole("button", { name: "20", exact: true }).getAttribute("aria-pressed") !== "true") throw new Error("날짜 선택 안 됨");
  await page.locator("#nav-list").getByRole("button", { name: /도메인/ }).click(); if (await page.locator("#nav-list").getByRole("button", { name: /도메인/ }).getAttribute("aria-current") !== "page") throw new Error("내비 선택 안 됨");
  await page.locator("#notice-action").getByRole("button", { name: "닫기" }).click(); await page.locator("#notice-action").getByRole("button", { name: "다시 보이기" }).waitFor();
  await page.locator("#x-settings").getByText("프로젝트 삭제").waitFor();
});
await check("W8", "앱 — 최초 비밀번호 설정 → 홈, 프로젝트가 없으면 빈 상태", async () => {
  await page.goto(`${base}/ui/#login`); await page.waitForLoadState("networkidle");
  const pws = page.locator("input[type=password]");
  if (await pws.count() === 2) { await pws.nth(0).fill("homeserver-1"); await pws.nth(1).fill("homeserver-1"); await page.getByRole("button", { name: "Create" }).click(); }
  else { await pws.first().fill("homeserver-1"); await page.getByRole("button", { name: "Continue" }).click(); }
  await page.waitForTimeout(400);
  if (await page.evaluate(() => location.hash) !== "#home") throw new Error("홈으로 안 감");
  if (!(await page.getByText("No projects yet").first().isVisible())) throw new Error("빈 상태가 없다");
  if (!(await page.getByRole("navigation", { name: "서비스 내비게이션" }).isVisible())) throw new Error("사이드바가 없다");
  await shot("app-home");
});
await browser.close();
for (const r of results) console.log(r.join("  "));
const fails = results.filter((r) => r[0] === "FAIL").length;
console.log(`WUI PASS ${results.length - fails}  FAIL ${fails}`);
process.exit(fails ? 1 : 0);
