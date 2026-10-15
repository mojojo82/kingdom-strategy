/* v1177 (Harley): Kingshot-style training panel in City > Troops - type switch, figure stage (placeholder), all 10 tiers on one row with counts,
   have/need cost box, - slider + count, one Train button with the time. Locked tiers say what unlocks them; busy building shows progress + speedups.
   Screenshots out_g299_*.png.  Run: node dev/simfork/g299_train_ui.js */
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
  await P.fill("#ksE", "g299@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "TrainUI"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => { const st = game.state; st.resources.food = st.resources.wood = st.resources.stone = st.resources.gold = 1e7; st.buildings.barracks.level = 8; st.troops.infantry_t2 = 1205; st.speedups.general_1h = 2; setScreen("city", "troops"); });
  await P.waitForTimeout(1200);
  const q = (sel) => P.evaluate((sel) => [...document.querySelectorAll(sel)].map((x) => x.textContent.trim()), sel);
  const o = {};
  o.types = await q("#troopsList .tr-type"); o.tiers = await q("#troopsList .tr-tier"); o.cost = await q("#troopsList .tr-cost span");
  o.train = await q("#troopsList .tr-train");
  await P.evaluate(() => document.querySelector('#troopsList [data-trtier="7"]').click()); await P.waitForTimeout(200);
  o.lockToast = await P.evaluate(() => document.getElementById("miniToast").textContent);
  await P.evaluate(() => document.querySelector('#troopsList [data-trtier="2"]').click()); await P.waitForTimeout(200);
  o.sel = await q("#troopsList .tr-tier.on b"); o.title = await q("#troopsList .tr-title");
  await P.evaluate(() => { const s = document.getElementById("trSlider"); s.value = 300; s.oninput(); }); await P.waitForTimeout(100);
  o.n = await P.evaluate(() => document.getElementById("trN").value); o.cost300 = await q("#troopsList .tr-cost span"); o.time300 = await q("#trTime");
  await P.evaluate(() => document.querySelector('#troopsList [data-trstep="1"]').click()); o.nPlus = await P.evaluate(() => document.getElementById("trN").value);
  await P.evaluate(() => { document.getElementById("trSlider").value = 300; document.getElementById("trSlider").oninput(); }); 
  await P.evaluate(() => document.querySelector("#troopsList .tr-wrap").scrollIntoView({ block: "end" })); await P.waitForTimeout(200);
  await P.screenshot({ path: path.join(__dirname, "out_g299_train.png") });
  await P.evaluate(() => document.getElementById("trTrain").click()); await P.waitForTimeout(600);
  o.queue = await P.evaluate(() => game.state.buildings.barracks.queue.map((x) => x.troopType + "x" + x.count));
  o.busy = await P.evaluate(() => { const b = document.getElementById("trTrain"); return [b.textContent, b.disabled, !!document.querySelector("#troopsList .tr-busy .progress"), document.querySelectorAll("#troopsList .tr-busy [data-su]").length]; });
  await P.evaluate(() => document.querySelector("#troopsList .tr-wrap").scrollIntoView({ block: "end" })); await P.waitForTimeout(200);
  await P.screenshot({ path: path.join(__dirname, "out_g299_busy.png") });
  await P.evaluate(() => document.querySelector('#troopsList [data-trt="archer"]').click()); await P.waitForTimeout(200);
  o.archer = await q("#troopsList .tr-lock"); o.archerOn = await q("#troopsList .tr-type.on");
  console.log(JSON.stringify({ o, errs }));
  await b.close();
  if (!process.env.NOASSERT) {
    assert.deepStrictEqual(errs, []);
    assert.strictEqual(o.types.length, 3); assert.strictEqual(o.tiers.length, 10, "all 10 tiers on one row");
    assert(/^II/.test(o.tiers[1]) && /1\.2K|1,205|1205/.test(o.tiers[1]), "tier II shows the 1,205 owned");
    assert(/Tier VII unlocks at Barracks Lv 19/.test(o.lockToast), "locked tier says what unlocks it");
    assert.deepStrictEqual(o.sel, ["II"]); assert(/T2/.test(o.title[0]));
    assert.strictEqual(o.n, "300"); assert(o.cost300.some((c) => /\/ 18,000/.test(c)), "cost box = have / need for 300"); assert(/⏱/.test(o.time300[0]));
    assert.strictEqual(o.nPlus, "301");
    assert.deepStrictEqual(o.queue, ["infantry_t2x300"], "Train starts 300x T2");
    assert(o.busy[0] === "Training…" && o.busy[1] && o.busy[2] && o.busy[3] > 0, "busy: button off, progress + speedups shown");
    assert(/Build the Mage Tower/.test(o.archer[0]) && /Caster/.test(o.archerOn[0]), "Caster tab (v1185 rename), locked building message");
    console.log("g299 ok");
  }
})().catch((e) => { console.error(e); process.exit(1); });
