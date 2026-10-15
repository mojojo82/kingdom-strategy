/* v1197 (Harley, audit item 11): Droid Call Piercing rounds ignore enemy defence AND Dome/Orbit, in both modes.
   Run: node dev/simfork/g317_droid_pierce.js */
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
  await P.fill("#ksE", "g317@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Pierce"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const v = await P.evaluate(() => {
    const o = {};
    /* Arena: same fight, drone with and without piercing; no Dome/Orbit on the foe, so any gap = the foe's fortress DEF being skipped */
    const ALL = ["gareth", "lyra", "kessa"], hs = {}; ALL.forEach((k) => { hs[k] = { owned: true, level: 40, stars: 10, skillLevels: { conquest: [3, 3, 3], expedition: [3, 3, 3] } }; });
    const side = (def) => arenaSideStats(ALL, hs, 20, 0, false, null, fortressMaxMap(3), undefined, { atk: 0, hp: 0, def: def || 0, skill: 0 }); /* the foe gets a DEF bonus so its fortress has DEF to pierce */
    const arena = (pierce) => { const k = botWeaponsToSim({ droid_call: 50 }); k.specs.forEach((x) => { x.p = Object.assign({}, x.p, { pierce: pierce ? 1 : 0 }); });
      const sim = arenaMakeSim(side(0), side(100), { rng: worldPvpSeededRng("g317"), critSeed: "g317", weapons: k.specs, aiWeapons: [] }); const h0 = sim.aiHp; for (let i = 0; i < 30; i++) sim.step(); return h0 - sim.aiHp; };
    o.arenaPlain = arena(false); o.arenaPierce = arena(true);
    /* Conquest: drone damage into enemies carrying a projectile shield (projRed 0.5, what a future bot's Dome/Orbit would set) */
    const cq = (lv) => { let t = Date.UTC(2026, 0, 5); const g = createGame({ now: () => t, mapSize: 5, seed: 1, combatSeed: 777 }), s = g.state; setEquipBonus({});
      ["lyra", "kessa"].forEach((k) => { const h = s.heroes[k]; h.owned = true; h.level = 1; }); s.conquestRoster = ["lyra", "kessa"];
      s.idle.chapter = 8; s.weaponLevels = { droid_call: lv }; s.equippedWeapons = ["droid_call"];
      const run = (red) => { let d = 0; for (let i = 0; i < 60; i++) { s.idle.enemies.forEach((e) => { e.projRed = red; });
        const L = []; const op = L.push; L.push = function (...x) { x.forEach((y) => { if (y.kind === "drone") d += y.dmg; }); return op.apply(this, x); }; s.idle.fxShotLog = L; t += 1000; g.tick(); } return d; };
      return run(0.5); };
    o.cq30 = cq(30); o.cq50 = cq(50);
    return o;
  });
  console.log(JSON.stringify({ v, errs }));
  await b.close();
  if (!process.env.NOASSERT) {
    assert.deepStrictEqual(errs, []); assert(v.arenaPlain > 0, "drone hit the fortress");
    assert(v.arenaPierce > v.arenaPlain * 1.01, "Arena: piercing drone also skips the enemy's fortress DEF");
    assert(v.cq50 > v.cq30 * 1.5, "Conquest: piercing drone ignores an enemy's projectile shield (Lv30 is halved by it)");
    console.log("g317 ok");
  }
})().catch((e) => { console.error(e); process.exit(1); });
