/* v1199 (Harley): owned weapons add power - max Elite 140K / Super Rare 280K / Epic 420K / Legendary 700K, Lv1 = 70% of Lv50.
   Run: node dev/simfork/g319_weapon_power.js */
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
  await P.fill("#ksE", "g319@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "WPower"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const v = await P.evaluate(() => {
    let t = Date.UTC(2026, 0, 5); const g = createGame({ now: () => t, mapSize: 5, seed: 1, combatSeed: 777 }), s = g.state;
    const o = { freshEquipped: (s.equippedWeapons || []).slice(), freshWeapons: g.powerFromWeapons() };
    s.equippedWeapons = []; s.weaponFrags = {}; s.weaponLevels = {}; o.none = g.powerFromWeapons();
    const p0 = g.governorPower();
    s.weaponFrags.railgun = 1; o.legLv1 = g.powerFromWeapons(); o.govDelta = g.governorPower() - p0;
    s.weaponLevels.railgun = 50; o.legLv50 = g.powerFromWeapons();
    s.weaponLevels.flak_burst = 50; o.elite50 = g.powerFromWeapons() - o.legLv50;
    s.equippedWeapons = ["missile_barrage"]; o.srEquippedLv1 = g.powerFromWeapons() - o.legLv50 - o.elite50;
    o.rar = { railgun: WEAPON_DEFS_BY_ID.railgun.rarity, flak: WEAPON_DEFS_BY_ID.flak_burst.rarity, missile: WEAPON_DEFS_BY_ID.missile_barrage.rarity };
    WEAPON_DEFS.forEach((w) => { if (!w.visualOnly) { s.weaponLevels[w.id] = 50; } }); o.allMax = g.powerFromWeapons();
    return o;
  });
  console.log(JSON.stringify({ v, errs }));
  await b.close();
  if (!process.env.NOASSERT) {
    assert.deepStrictEqual(errs, []); assert.strictEqual(v.none, 0, "nothing owned = no weapon power");
    assert.strictEqual(v.legLv1, 490000, "Legendary Lv1 = 70% of 700K"); assert.strictEqual(v.govDelta, 490000, "counted in governor power");
    assert.strictEqual(v.legLv50, 700000); assert.strictEqual(v.elite50, 140000); assert.strictEqual(v.srEquippedLv1, 196000, "an equipped Super Rare counts (70% of 280K)");
    console.log("g319 ok");
  }
})().catch((e) => { console.error(e); process.exit(1); });
