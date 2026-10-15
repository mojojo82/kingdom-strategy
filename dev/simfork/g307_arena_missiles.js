/* v1187 (Harley, audit item 16): Arena missiles are independent like Conquest's - each missile of a volley is its own shot, 0.16 s apart, each
   carrying its share of the damage (same total). Run: node dev/simfork/g307_arena_missiles.js */
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
  await P.fill("#ksE", "g307@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Missiles"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => { game.state.equippedWeapons = ["missile_barrage"]; window.__q = []; const o = arenaQueueMissiles; window.arenaQueueMissiles = function (q, tick, sd, wp) { const n0 = q.length; o(q, tick, sd, wp); if (sd === "P") window.__q.push({ tick, wp: { count: wp.count, dmg: wp.dmgPerShot }, shots: q.slice(n0).map((x) => ({ at: x.at, dmg: x.dmg })) }); }; setScreen("more", "arena"); });
  await P.waitForTimeout(1500);
  await P.evaluate(() => document.getElementById("arenaQuickMatchBtn").click()); await P.waitForTimeout(800);
  await P.evaluate(() => document.getElementById("arenaAttackBtn").click());
  await P.waitForFunction(() => window.__q.length >= 2, null, { timeout: 40000 }).catch(() => {});
  const v = await P.evaluate(() => window.__q.slice(0, 2));
  console.log(JSON.stringify({ v, stg: await P.evaluate(() => IDLE_WEAPON_MISSILE_STAGGER * 1000 / ARENA_TICK_MS), errs }));
  await b.close();
  if (!process.env.NOASSERT) {
    assert.deepStrictEqual(errs, []); assert(v.length >= 1, "a volley fired");
    v.forEach((f) => { assert.strictEqual(f.shots.length, f.wp.count, "one shot per missile"); const sum = f.shots.reduce((a, s) => a + s.dmg, 0); assert(Math.abs(sum - f.wp.dmg) < 1e-6, "same total damage");
      for (let k = 1; k < f.shots.length; k++) assert(f.shots[k].at > f.shots[k - 1].at, "staggered, landing one after another"); });
    console.log("g307 ok");
  }
})().catch((e) => { console.error(e); process.exit(1); });
