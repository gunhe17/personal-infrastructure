// 대화형 드라이버 — headed 크로미움을 열어 두고 http://127.0.0.1:7877 로 받은 JS 를 page 맥락에서 실행한다.
//   curl -s localhost:7877 -d 'await page.goto("http://127.0.0.1:7879/ui/")'
//   반환값은 JSON. `page`·`shot(name)`·`text()` 를 쓸 수 있다.
import http from "node:http";
import { chromium } from "playwright";

const shots = process.env.PI_SHOTS ?? "/tmp/pi-e2e/shots";
const browser = await chromium.launch({ headless: false, slowMo: 80 });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
const shot = async (name) => { await page.screenshot({ path: `${shots}/${name}.png` }); return `${shots}/${name}.png`; };
const text = () => page.evaluate(() => document.body.innerText);

http.createServer(async (req, res) => {
  let body = ""; for await (const c of req) body += c;
  try {
    const fn = new Function("page", "shot", "text", "errors", `return (async () => { ${body} })()`);
    const out = await fn(page, shot, text, errors);
    res.end(JSON.stringify({ ok: true, out: out ?? null, errors: errors.splice(0) }));
  } catch (e) { res.statusCode = 500; res.end(JSON.stringify({ ok: false, error: String(e.message ?? e).split("\n")[0], errors: errors.splice(0) })); }
}).listen(7877, "127.0.0.1", () => console.log("drive on :7877"));
