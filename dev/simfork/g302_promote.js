/* v1182 (Harley): troop promotion like Kingshot. Promote button always shown (greyed + says why until building Lv 13); promotes the picked tier to the
   highest unlocked tier, paying only the cost difference and the base-time difference; uses the training slot; troops arrive when done.
   Screenshots out_g302_*.png.  Run: node dev/simfork/g302_promote.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "g302@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Promo"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const q = (sel) => P.evaluate((sel) => [...document.querySelectorAll(sel)].map((x) => x.textContent.trim()), sel);
  const o = {};
  await P.evaluate(() => { const st = game.state; st.resources.food = st.resources.wood = st.resources.stone = st.resources.gold = 1e8; st.buildings.barracks.level = 8; st.troops.infantry_t2 = 500; setScreen("city", "troops"); });
  await P.waitForTimeout(1200);
  await P.evaluate(() => document.querySelector('#troopsList [data-trtier="2"]').click()); await P.waitForTimeout(200);
  o.lowBtn = await P.evaluate(() => { const b = document.getElementById("trPromo"); return b && [b.textContent, b.className, b.disabled]; });
  await P.evaluate(() => document.getElementById("trPromo").click()); await P.waitForTimeout(200);
  o.lowToast = await P.evaluate(() => document.getElementById("miniToast").textContent);
  await P.evaluate(() => { game.state.buildings.barracks.level = 16; renderTroops(); }); await P.waitForTimeout(300);
  await P.evaluate(() => document.querySelector('#troopsList [data-trtier="6"]').click()); await P.waitForTimeout(150);
  await P.evaluate(() => document.getElementById("trPromo").click()); await P.waitForTimeout(150);
  o.topToast = await P.evaluate(() => document.getElementById("miniToast").textContent);
  await P.evaluate(() => document.querySelector('#troopsList [data-trtier="2"]').click()); await P.waitForTimeout(150);
  o.btnOn = await P.evaluate(() => document.getElementById("trPromo").className);
  await P.evaluate(() => document.getElementById("trPromo").click()); await P.waitForTimeout(300);
  o.title = await q("#troopsList .tr-title"); o.max = await P.evaluate(() => document.getElementById("trSlider").max);
  await P.evaluate(() => { const s = document.getElementById("trSlider"); s.value = 200; s.oninput(); }); await P.waitForTimeout(100);
  o.cost = await q("#troopsList .tr-cost span"); o.btn = await q("#trTrain"); o.cancel = await q("#trPromoX");
  o.expect = await P.evaluate(() => { const a = TROOP_DEFS.infantry_t2, b = TROOP_DEFS.infantry_t6; return { food: (b.cost.food - a.cost.food) * 200, secs: (60 - 17) * 200 / (1 + 16 * 0.05) / game.trainSpeedMult() }; });
  await P.evaluate(() => document.querySelector("#troopsList .tr-wrap").scrollIntoView({ block: "end" })); await P.waitForTimeout(200);
  await P.screenshot({ path: path.join(__dirname, "out_g302_promote.png") });
  const food0 = await P.evaluate(() => game.state.resources.food);
  await P.evaluate(() => document.getElementById("trTrain").click()); await P.waitForTimeout(500);
  o.after = await P.evaluate((food0) => { const st = game.state, q0 = st.buildings.barracks.queue[0]; return { t2: st.troops.infantry_t2, q: q0 && [q0.troopType, q0.count, q0.promoteFrom, Math.round(q0.duration)], paid: food0 - st.resources.food, mode: !!troopPromoteMode.infantry, busyBtn: document.getElementById("trTrain").textContent, promoOff: document.getElementById("trPromo").className }; }, food0);
  await P.evaluate(() => { game.state.buildings.barracks.queue[0].finishAt = Date.now() - 1000; game.tick(); });
  o.done = await P.evaluate(() => ({ t6: game.state.troops.infantry_t6 || 0, q: game.state.buildings.barracks.queue.length }));
  console.log(JSON.stringify({ o, errs }));
  await b.close();
  if (!process.env.NOASSERT) {
    assert.deepStrictEqual(errs, []);
    assert(o.lowBtn && /Promote/.test(o.lowBtn[0]) && /off/.test(o.lowBtn[1]), "promote button shown greyed before Lv 13");
    assert(/unlocks at Barracks Lv 13/.test(o.lowToast), "says when it unlocks");
    assert(/already the highest/.test(o.topToast), "top tier can't be promoted");
    assert(!/off/.test(o.btnOn), "promote available for tier II at Lv 16");
    assert(/T2 → Infantry T6/.test(o.title[0]) && o.max === "500", "promote mode: II -> VI, max = owned");
    assert(o.cost.some((c) => c.includes("/ " + o.expect.food.toLocaleString())), "cost = difference x 200");
    assert(/^Promote/.test(o.btn[0]) && o.cancel.length === 1, "Promote + Cancel buttons");
    assert.strictEqual(o.after.t2, 300); assert.deepStrictEqual(o.after.q.slice(0, 3), ["infantry_t6", 200, "infantry_t2"]);
    assert(Math.abs(o.after.q[3] - o.expect.secs) <= 1, "time = base difference, sped up like training");
    assert.strictEqual(o.after.paid, o.expect.food); assert(!o.after.mode && /Training/.test(o.after.busyBtn) && /off/.test(o.after.promoOff), "busy after");
    assert(o.done.t6 === 200 && o.done.q === 0, "promoted troops arrive");
    console.log("g302 ok");
  }
})().catch((e) => { console.error(e); process.exit(1); });
