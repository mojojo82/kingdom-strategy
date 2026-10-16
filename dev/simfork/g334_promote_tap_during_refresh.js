/* v1219 (Harley: pressed Promote, nothing started, no timer). The troop screen rebuilt itself every second, so a phone tap spanning a rebuild was lost.
   Run: node dev/simfork/g334_promote_tap_during_refresh.js (GAMEFILE=old build to see it fail) */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call0 = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store), DELAY = 1500;
 /* the FIRST move is slow to reach the server (cold start / bad signal), later ones are quick - so a second move can land first, like on a phone */
const call = call0;
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
  await P.fill("#ksE", "g334@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Promo"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  await P.evaluate(() => { const st = game.state; st.buildings.barracks.level = 15; st.troops.infantry_t3 = 780; st.resources.food = 9e6; st.resources.wood = 9e6; try { setScreen("city", "troops"); } catch (e) {} troopTrainType = "infantry"; troopTrainTier.infantry = 3; render(); renderTroops(); });
  await P.waitForTimeout(1200);
  /* a phone tap that spans the screen's 1 s refresh: finger down, ~1.2 s, finger up (same as a tap landing just as it redraws) */
  const tap = async (sel) => { await P.waitForSelector(sel, { state: "visible", timeout: 5000 }); const bx = await P.locator(sel).boundingBox(); await P.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await P.mouse.down(); await P.waitForTimeout(1300); await P.mouse.up(); await P.waitForTimeout(300); };
  await tap("#trPromo");
  const mode = await P.evaluate(() => ({ promoMode: !!troopPromoteMode.infantry, btn: (document.getElementById("trTrain") || {}).textContent }));
  await tap("#trTrain");
  const r = await P.evaluate(() => ({ queue: game.state.buildings.barracks.queue.length, t3: game.state.troops.infantry_t3, promoBtn: (document.getElementById("trPromo") || {}).textContent, trainBtn: (document.getElementById("trTrain") || {}).textContent }));
  await P.waitForTimeout(2200);
  const later = await P.evaluate(() => (document.getElementById("trTrain") || {}).textContent);
  console.log(JSON.stringify({ mode, r, later, errs }));
  await b.close();
  assert.deepStrictEqual(errs, []);
  assert(mode.promoMode, "the first tap opens promote mode");
  assert(r.queue === 1 && r.t3 < 780, "the Start tap starts the promotion");
  assert(/left/.test(r.trainBtn) && r.trainBtn !== later, "a countdown that ticks");
  console.log("g334 ok");
})().catch((e) => { console.error(e); process.exit(1); });
