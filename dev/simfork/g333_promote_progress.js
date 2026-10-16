/* v1217 (Harley: promoting troops but the time didn't show; what if Promote is pressed again?). Run: node dev/simfork/g333_promote_progress.js */
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
  await P.fill("#ksE", "g333@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Promo"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  const SH = process.env.SHOTS;
  /* Barracks 15 (T5), 780 Infantry T3, lots of food/wood. Open City > Troops, Infantry, tier III, Promote mode. */
  await P.evaluate(() => { const st = game.state; st.buildings.barracks.level = 15; st.troops.infantry_t3 = 780; st.resources.food = 9e6; st.resources.wood = 9e6; try { setScreen("city", "troops"); } catch (e) {} troopTrainType = "infantry"; troopTrainTier.infantry = 3; troopPromoteMode.infantry = true; render(); renderTroops(); });
  await P.waitForTimeout(800);
  /* the phone case: the count box still has focus when Promote is tapped (iOS buttons don't take focus, so the box never blurs) */
  await P.evaluate(() => { trBusy(1); });
  await P.click("#trTrain"); await P.waitForTimeout(2500);
  const r = await P.evaluate(() => { const q = game.state.buildings.barracks.queue; const busy = document.querySelector(".tr-busy"); return { queued: q.length && { n: q[0].count, to: q[0].troopType, from: q[0].promoteFrom }, busyShown: busy ? busy.textContent.replace(/\s+/g, " ").slice(0, 120) : null, trainBtn: (document.getElementById("trTrain") || {}).textContent }; });
  if (SH) await P.screenshot({ path: SH + "/promo.png" });
  /* v1218: the Infantry tab shows the timer even while looking at Caster */
  const tabT = await P.evaluate(() => { troopTrainType = "archer"; renderTroops(); const b = document.querySelector('[data-trt="infantry"] .tr-tq'); const t = b ? b.textContent : null; troopTrainType = "infantry"; renderTroops(); return t; });
  /* pressing it again does nothing harmful */
  const again = await P.evaluate(() => { const before = JSON.stringify(game.state.buildings.barracks.queue) + game.state.troops.infantry_t3; const b = document.getElementById("trTrain"); if (b) b.click(); return before === JSON.stringify(game.state.buildings.barracks.queue) + game.state.troops.infantry_t3; });
  console.log(JSON.stringify({ r, tabT, again, errs }));
  await b.close();
  assert.deepStrictEqual(errs, []);
  assert(r.queued && r.queued.from === "infantry_t3", "promotion queued");
  assert(r.busyShown && /Promoting/.test(r.busyShown) && /left/.test(r.busyShown), "the panel shows the promotion and its time left");
  assert(again, "a second press changes nothing");
  assert(tabT && /⬆ 1h 5\dm/.test(tabT), "Infantry tab shows the promote timer from another tab");
  console.log("g333 ok");
})().catch((e) => { console.error(e); process.exit(1); });
