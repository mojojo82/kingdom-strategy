/* v959: Arena fortress HP grows with the team's hero power (100 per power) - a Lv40 team's real Arena battle lasts more than a few seconds; Fortress III braced hull shows in its innate line. Run: node dev/simfork/g204_arena_fortress_hp.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const OUT = process.env.OUT || "/tmp/";
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
  await P.fill("#ksE", "g204@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Arena"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const hp = await P.evaluate(() => {
    ["gareth", "lyra", "roran", "kessa", "sera"].forEach((k) => { const h = game.state.heroes[k]; h.owned = true; h.level = 40; h.stars = 10; }); game.state.conquestRoster = ["gareth", "lyra", "roran", "kessa", "sera"];
    const ro = game.state.conquestRoster, st = arenaSideStats(ro, game.state.heroes, game.state.buildings.townhall.level, arenaBaseHpPlayer, true);
    const power = ro.reduce((a, k) => a + heroPowerLevel(game.state.heroes[k]), 0);
    return { maxHp: st.maxHp, power, per: ARENA_FORT_HP_PER_POWER, f3: FORTRESS3_SUPER_TAKEN };
  });
  console.log("fortress:", JSON.stringify(hp)); assert.ok(hp.per === 100 && hp.maxHp >= hp.power * 100, "fortress HP includes 100 per hero power");
  await P.evaluate(() => setScreen("more", "arena")); await P.waitForTimeout(1500);
  await P.evaluate(() => { document.getElementById("arenaQuickMatchBtn").click(); }); await P.waitForTimeout(1500);
  await P.evaluate(() => { document.getElementById("arenaAttackBtn").click(); });
  await P.waitForTimeout(6000);
  const mid = await P.evaluate(() => ({ running: arenaBattleRunning, result: document.getElementById("arenaResult").textContent }));
  console.log("after 6s:", JSON.stringify(mid)); await P.screenshot({ path: OUT + "g204_arena.png" });
  assert.ok(mid.running, "a Lv40 battle is still going after 6 s (it used to end in the first tick)");
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
