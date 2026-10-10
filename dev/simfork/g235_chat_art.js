/* v1017/v1018: multi-line (emoji / text art) chat messages keep the normal bubble (translate button on the right) and a too-wide art shrinks to fit, so it isn't cut off. Run: node dev/simfork/g235_chat_art.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 } });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "g235@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Emp"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const art = Array.from({ length: 6 }, (_, i) => "🟦".repeat(38) + (i > 3 ? "⬛" : "🟩")).join("\n"); /* 39 wide, like Harley's */
  await P.evaluate((art) => { postWorldChat(art); setScreen("more", "chat"); }, art); await P.waitForTimeout(1500);
  await P.evaluate(() => renderWorldChat()); await P.waitForTimeout(300);
  const o = await P.evaluate(() => { const rows = [...document.querySelectorAll("#chatMessages .chat-msg")]; const artRow = rows.find((r) => r.querySelector(".chat-text.multi")), t = artRow.querySelector(".chat-text"), tr = artRow.querySelector(".chat-tr");
    const r = t.getBoundingClientRect(), rr = tr.getBoundingClientRect();
    return { fits: t.scrollWidth <= t.clientWidth + 1, right: Math.round(r.right), width: Math.round(r.width), fs: getComputedStyle(t).fontSize, trRight: rr.left >= r.right - 1, pageW: document.documentElement.scrollWidth}; });
  await P.screenshot({ path: (process.env.OUT || "/tmp/") + "chat_art.png" });
  console.log(JSON.stringify(o));
  assert.ok(o.fits, "the whole art is visible (no cut-off)");
  assert.ok(o.width <= 330 && o.right <= 430 && o.pageW <= 430, "normal bubble width, on screen");
  assert.ok(o.trRight, "translate button on the right, as before");
  assert.ok(parseFloat(o.fs) < 15, "the art was scaled down");
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
