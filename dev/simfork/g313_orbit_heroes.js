/* v1193 (Harley, audit item 14): Orbit Shield / Deflector Dome also cut ranged hits on your heroes in Arena (like Conquest).
   Run: node dev/simfork/g313_orbit_heroes.js */
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
  await P.fill("#ksE", "g313@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Orbit"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const v = await P.evaluate(() => {
    const FIVE = ["gareth", "lyra", "roran", "kessa", "sera"], hs = {}; FIVE.forEach((k) => { hs[k] = { owned: true, level: 40, stars: 10, skillLevels: { conquest: [3, 3, 3], expedition: [3, 3, 3] } }; });
    const RNG = ["lyra", "kessa", "sera"]; /* foe: ranged only, so every hit on our infantry is a ranged hit */
    const side = (r) => arenaSideStats(r, hs, 20, 0, false, null, fortressMaxMap(3), undefined, ZERO_BONUS);
    const run = (map, seed) => { const me = botWeaponsToSim(map); const sim = arenaMakeSim(side(FIVE), side(RNG), { rng: worldPvpSeededRng(seed), critSeed: seed, weapons: me.specs, aiWeapons: [], shieldPct: me.shieldPct, aiShieldPct: 0 });
      let lost = 0; const prev = {}; for (let i = 0; i < 40; i++) { const r = sim.step(); sim.pHH.list.forEach((e) => { if (!e.infantry) return; const p0 = prev[e.id]; if (p0 != null && e.hp < p0) lost += p0 - e.hp; prev[e.id] = e.hp; }); if (r.done) break; } return lost; };
    const kc = game.heroKoCfg, sv = Object.assign({}, kc); kc.heroDmgMult = 0.01; /* tiny hero damage: no KOs, so both fights play out the same and only the hit size differs */
    let a = 0, b = 0; for (let i = 0; i < 4; i++) { a += run({}, "g313" + i); b += run({ orbit_shield: 50 }, "g313" + i); }
    Object.assign(kc, sv);
    return { none: a, orbit: b, ratio: b / a };
  });
  console.log(JSON.stringify({ v, errs }));
  await b.close();
  if (!process.env.NOASSERT) {
    assert.deepStrictEqual(errs, []); assert(v.none > 0, "infantry took hits");
    assert(v.ratio < 0.97, "Orbit Shield cuts damage to your infantry in Arena too");
    console.log("g313 ok");
  }
})().catch((e) => { console.error(e); process.exit(1); });
