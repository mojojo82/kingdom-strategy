/* v1190 (Harley, audit item 20): bot / other-side weapons get that side's own ATK bonus, like a player's weapons.
   Run: node dev/simfork/g310_bot_weapon_atk.js */
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
  await P.fill("#ksE", "g310@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "BotAtk"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => { setHeroBonus("atk", 40); game.state.equippedWeapons = ["missile_barrage"]; window.__am = [];
    const o = botWeaponsToSim; window.botWeaponsToSim = function (map, am) { const r = o(map, am); window.__am.push({ am, opp: (arenaOpponent && arenaOpponent.bonus) ? arenaOpponent.bonus.atk : null, dmg: r.specs.map((x) => (x.dmgPerShot || x.totalDmg || 0)), base: o(map).specs.map((x) => (x.dmgPerShot || x.totalDmg || 0)) }); return r; };
    setScreen("more", "arena"); });
  await P.waitForTimeout(1500);
  await P.evaluate(() => document.getElementById("arenaQuickMatchBtn").click()); await P.waitForTimeout(800);
  await P.evaluate(() => document.getElementById("arenaAttackBtn").click());
  await P.waitForFunction(() => window.__am.length >= 1, null, { timeout: 40000 }).catch(() => {});
  const v = await P.evaluate(() => window.__am[0]);
  /* sim forms / world: the raw helper scales a kit by the multiplier it's given */
  const u = await P.evaluate(() => { const a = simWeaponsFromCfg({ missile_barrage: 10, laser_beam: 10 }), b = simWeaponsFromCfg({ missile_barrage: 10, laser_beam: 10 }, 1.5); return a.map((x, i) => (b[i].dmgPerShot || b[i].totalDmg || 0) / (x.dmgPerShot || x.totalDmg || 1)); });
  console.log(JSON.stringify({ v, u, errs }));
  await b.close();
  if (!process.env.NOASSERT) {
    assert.deepStrictEqual(errs, []); assert(v, "arena built the bot kit"); assert(v.opp > 0, "bot has an ATK bonus");
    assert(Math.abs(v.am - (1 + v.opp / 100)) < 1e-9, "bot weapons get the bot's own ATK bonus");
    v.dmg.forEach((d, i) => { if (v.base[i] > 0) assert(Math.abs(d / v.base[i] - v.am) < 1e-6, "weapon damage scaled"); });
    u.forEach((r) => assert(Math.abs(r - 1.5) < 1e-6, "sim kit scaled x1.5"));
    console.log("g310 ok");
  }
})().catch((e) => { console.error(e); process.exit(1); });
