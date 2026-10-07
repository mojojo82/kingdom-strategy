/* v946: Events in the game (Burst of Life), Watchtower default skin + Neptune unlocked by the grand prize, 1h speedups, troop power.
   Run: node dev/simfork/g195_events_game.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const OUT = process.env.OUT || "/tmp/";
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
  const C = require(path.join(ROOT, "functions/core.js")), ADMIN = require(path.join(ROOT, "functions/admins.json"))[0];
  const tpl = { name: "Burst of Life", tag: "Beginner", desc: "Boost your power and win a limited skin reward!", goal: "power", schedule: { type: "newplayer", days: 7 }, milestones: [
    { target: 50000, worth: 300, items: { gems: 100, wood: 100000, stone: 20000, gold: 10000 } }, { target: 300000, worth: 700, items: { gems: 300, speedup_construction_1h: 2 } },
    { target: 4000000, worth: 54000, items: { skin_city_titan: 1, gems: 2000 } }] };
  store["envs/test/config/events"] = { events: C.normalizeEvents([tpl]) };
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "g195@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Newbie"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  const uid = await P.evaluate(() => PLAYER_ID);
  /* new player: Watchtower, no Neptune; troop power is small now */
  const s0 = await P.evaluate(() => ({ skin: myCitySkinId(), neptuneOwned: citySkinOwned("titan"), cityList: skinsCatalog("city").map((x) => x.id), power: game.governorPower(), troopPowerFor1000: (function () { const t = game.state.troops.infantry; game.state.troops.infantry = t + 1000; const p = game.governorPower(); game.state.troops.infantry = t; return p - game.governorPower(); })() }));
  console.log("new player:", JSON.stringify(s0)); assert.strictEqual(s0.skin, "tower"); assert.ok(!s0.neptuneOwned && !s0.cityList.includes("titan"), "Neptune locked"); assert.strictEqual(s0.troopPowerFor1000, 3000, "1,000 T1 troops = 3,000 power");
  /* open Events (More > Events) */
  await P.evaluate(() => setScreen("more", "menu")); const ti = await P.$$eval("#moreMenu .mm-tile", (ts) => ts.findIndex((t) => /Events/.test(t.textContent))); await (await P.$$("#moreMenu .mm-tile"))[ti].click(); await P.waitForTimeout(1500);
  const e0 = await P.evaluate(() => ({ title: (document.querySelector("#ksEvList .etitle") || {}).textContent, time: (document.querySelector("#ksEvList .etime") || {}).textContent, bar: (document.querySelector("#ksEvList .ebar b") || {}).textContent, btns: [].map.call(document.querySelectorAll("#ksEvList .ebtn, #ksEvList .elock"), (b) => b.textContent) }));
  console.log("events:", JSON.stringify(e0)); assert.ok(e0.title === "Burst of Life" && /6d 23:|7d 00:/.test(e0.time), "7-day window from sign-up"); assert.deepStrictEqual(e0.btns, ["Go", "🔒 50K", "🔒 300K"]);
  /* grow to ~60k power (Town Hall 3 + farms) and claim 50k */
  await P.evaluate(() => { Object.keys(game.state.buildings).forEach((k) => { game.state.buildings[k].level = Math.min(5, BUILDING_DEFS[k].maxLevel); }); persist(); }); await P.waitForTimeout(1300);
  const pw = await P.evaluate(() => game.governorPower()); console.log("power now", pw); assert.ok(pw >= 50000 && pw < 300000);
  await P.screenshot({ path: OUT + "events_game.png" });
  const g0 = await P.evaluate(() => KSW.gems);
  await P.click('#ksEvList [data-evc="burst_of_life"][data-evi="0"]'); await P.waitForTimeout(3500); await P.evaluate(() => window.__fbNotify && window.__fbNotify()); await P.waitForTimeout(500);
  const e1 = await P.evaluate(() => ({ btns: [].map.call(document.querySelectorAll("#ksEvList .ebtn, #ksEvList .elock, #ksEvList .edone"), (b) => b.textContent), gems: KSW.gems, note: document.getElementById("ksEvNote").textContent }));
  console.log("after claim:", JSON.stringify(e1), "gems before", g0); assert.deepStrictEqual(e1.btns, ["Go", "✓", "🔒 300K"]); assert.strictEqual(e1.gems, g0 + 100);
  assert.ok(Object.keys(store).some((k) => k.indexOf("envs/test/players/" + uid + "/mail/") === 0 && store[k].items && store[k].items.wood === 100000), "resources by mail");
  const P_ = (d) => JSON.stringify(d), auth = JSON.stringify({ uid, token: { firebase: { sign_in_provider: "password" } } });
  const cheat = JSON.parse(await call("claimEvent", P_({ env: "test", event: "burst_of_life", idx: 2 }), auth)); assert.ok(cheat.error && /not reached/.test(cheat.error.message), "server refuses the grand prize");
  /* grand prize path: pretend the saved power is 4M -> Neptune unlocked + equipped after claiming the mail */
  store["envs/test/players/" + uid + "/save/main"].power = 4000000;
  const gp = JSON.parse(await call("claimEvent", P_({ env: "test", event: "burst_of_life", idx: 2 }), auth)); assert.ok(gp.data && !gp.data.dup, JSON.stringify(gp));
  await P.evaluate(() => { document.getElementById("ksEvents").style.display = "none"; window.__fbNotify && window.__fbNotify(); }); await P.waitForTimeout(800);
  const mid = Object.keys(store).find((k) => k.indexOf("envs/test/players/" + uid + "/mail/") === 0 && store[k].items && store[k].items.skin_city_titan).split("/").pop();
  await P.evaluate((m) => ksMailClaim(m), mid); await P.waitForTimeout(1200);
  const s1 = await P.evaluate(() => ({ owned: citySkinOwned("titan"), skin: myCitySkinId(), list: skinsCatalog("city").map((x) => x.id) })); console.log("after Neptune:", JSON.stringify(s1));
  assert.ok(s1.owned && s1.skin === "titan" && s1.list.includes("titan"), "Neptune earned + put on");
  /* speedups: 2 construction speedups came from... grant directly, then use one on an upgrade */
  const sp = await P.evaluate(() => { game.state.speedups.construction_1h = 2; game.state.resources.wood = 1e9; game.state.resources.food = 1e9; game.state.resources.stone = 1e9; game.state.resources.gold = 1e9; const r = game.startUpgrade("townhall"); const before = game.state.buildings.townhall.upgrading && game.state.buildings.townhall.upgrading.finishAt; setScreen("city", "buildings"); return { r: r.ok, before }; });
  console.log("sp", JSON.stringify(sp)); await P.evaluate(() => render()); await P.waitForTimeout(500); const btn = await P.$('[data-su="construction_1h"][data-suw="build"][data-suk="townhall"]'); assert.ok(btn, "speedup button on the upgrading building");
  await btn.click(); await P.waitForTimeout(300);
  const sp2 = await P.evaluate(() => ({ after: game.state.buildings.townhall.upgrading ? game.state.buildings.townhall.upgrading.finishAt : 0, left: game.state.speedups.construction_1h, lvl: game.state.buildings.townhall.level }));
  console.log("speedup:", JSON.stringify(sp), JSON.stringify(sp2)); assert.strictEqual(sp2.left, 1); assert.ok(sp2.after === 0 || sp.before - sp2.after >= 3599000, "1 hour off");
  await P.screenshot({ path: OUT + "speedup_btn.png" });
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
