/* v1168: Bonewake test fortress skin (Harley's ChatGPT ghost ship, smooth shrink, 145 pt tall). Conquest + Arena screenshots. Run: node dev/simfork/g295_bonewake.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const OUT = process.env.OUT || "/tmp/";
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
async function run() {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "g295@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Bone"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => { game.state.fortressSkin = "serpent"; setScreen("conquest"); }); await P.waitForTimeout(7000);
  const box = async (id) => P.evaluate((id) => { const r = document.getElementById(id).getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; }, id);
  const info = await P.evaluate(() => { const sk = fortressSkin(), im = sk.cq; return { id: sk.id, loaded: im.complete && im.naturalWidth, hPt: Math.round(im.naturalHeight * fortressCqScale()), wPt: Math.round(im.naturalWidth * fortressCqScale()) }; });
  await P.screenshot({ path: path.join(__dirname, "out_g295_cq.png"), clip: await box("idleCanvas") });
  await P.evaluate(() => setScreen("more", "arena")); await P.waitForTimeout(1500);
  await P.evaluate(() => { document.getElementById("arenaQuickMatchBtn").click(); }); await P.waitForTimeout(800);
  await P.evaluate(() => { arenaAnim.aiFortressSkin = FORTRESS_SKINS.find((s) => s.id === "serpent"); document.getElementById("arenaAttackBtn").click(); }); await P.waitForTimeout(4000);
  await P.evaluate(() => { arenaAnim.aiFortressSkin = FORTRESS_SKINS.find((s) => s.id === "serpent"); }); await P.waitForTimeout(500);
  await P.screenshot({ path: path.join(__dirname, "out_g295_arena.png"), clip: await box("arenaCanvas") });
  await b.close(); return { info, errs };
}
(async () => { const r = await run(); console.log(JSON.stringify(r));
  if (!process.env.NOASSERT) { assert.deepStrictEqual(r.errs, []); assert(r.info.id === "serpent" && r.info.loaded && Math.abs(r.info.hPt - 145) <= 2, "Bonewake skin, 145 pt tall"); console.log("g295 ok"); }
})().catch((e) => { console.error(e); process.exit(1); });
