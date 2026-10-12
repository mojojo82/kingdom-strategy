/* v1106: with a Hex Shield up, the fortress HP BAR must not drop (the shield soaks the hits; real HP is untouched). Before the fix the bar took
   every landed shot's raw damage off displayedPlayerHp, so it fell while state.idle.playerHp stayed full. Samples real HP, shield and the bar.
   Run: node dev/simfork/g269_hexbar.js   (GAMEFILE=other.html to measure another version) */
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
  await P.fill("#ksE", "g269@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Hex"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  let r = await P.evaluate(async () => {
    const S = game.state, I = S.idle;
    S.equippedWeapons = ["hex_shield"]; S.weapons = S.weapons || {}; S.weapons.hex_shield = Object.assign({ owned: true, level: 50 }, S.weapons.hex_shield || {});
    S.conquestRoster = []; /* no heroes: every enemy shot goes at the fortress */
    I.chapter = 3; I.levelNum = 5; I.enemies = []; I.shield = null; I.shieldOn = false; I.bossPhase = false;
    setScreen("conquest");
    await new Promise((res) => setTimeout(res, 1500));
    const samples = []; const t0 = performance.now();
    while (performance.now() - t0 < 25000) {
      await new Promise((res) => setTimeout(res, 250));
      samples.push({ t: Math.round(performance.now() - t0), hp: I.playerHp, max: game.idlePlayerMaxHp(), shield: I.shield, shieldMax: I.shieldMax, bar: idleAnim.displayedPlayerHp, hits: I.shieldHitCount || 0 });
    }
    /* phase 2: no shield - the bar follows real damage, and a defeat still plays (killing blast lands, bar at 0, "Defeated" banner) */
    S.equippedWeapons = []; I.shield = 0; I.shieldOn = false; I.chapter = 6; I.levelNum = 9;
    const s2 = []; let defeated = false, barAtBanner = null; const t1 = performance.now();
    while (performance.now() - t1 < 40000 && !defeated) {
      await new Promise((res) => setTimeout(res, 100));
      s2.push({ hp: I.playerHp, bar: idleAnim.displayedPlayerHp });
      const bb = idleAnim.bigBanner; if (bb && /Defeated/.test(bb.text)) { defeated = true; barAtBanner = idleAnim.displayedPlayerHp; }
    }
    const lagging = s2.filter((q) => q.bar < q.hp - 1).length; /* bar below real HP = the old bug */
    return { samples, phase2: { n: s2.length, defeated, barAtBanner, lagging } };
  });
  const p2 = r.phase2; r = r.samples;
  const up = r.filter((s) => s.shield > 0 && s.hits > 0);  /* shield up and already taking hits */
  const worst = up.reduce((m, s) => Math.max(m, s.hp - s.bar), 0), last = r[r.length - 1];
  console.log("shieldMax", r[0].shieldMax, "max HP", r[0].max, "| shield hits", last.hits, "| samples with shield up + hit:", up.length);
  console.log("real HP vs bar while the shield is up: biggest gap", worst.toFixed(1), "| last:", JSON.stringify(last));
  console.log("no shield: samples", p2.n, "| bar below real HP in", p2.lagging, "| defeat seen", p2.defeated, "bar at banner", p2.barAtBanner);
  console.log(JSON.stringify({ errs })); await b.close();
  if (!process.env.NOASSERT) { assert.deepStrictEqual(errs, []); assert(up.length > 3, "the shield should be up and taking hits"); assert(worst < 1, "the bar dropped while the shield soaked the hits");
    assert(p2.defeated && p2.barAtBanner <= 0.01, "a defeat still shows: bar at 0 and the Defeated banner"); assert(p2.lagging === 0, "bar never below real HP"); console.log("g269 ok"); }
})().catch((e) => { console.error(e); process.exit(1); });
