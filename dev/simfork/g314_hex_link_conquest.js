/* v1194 (Harley, audit item 13): Orbit Shield's Hex Link recharges the Hex Shield in Conquest too (link% of max per second while it stands).
   Run: node dev/simfork/g314_hex_link_conquest.js */
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
  await P.fill("#ksE", "g314@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "HexLink"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const v = await P.evaluate(() => {
    const run = (orbitLv) => {
      let t = Date.UTC(2026, 0, 5); const g = createGame({ now: () => t, mapSize: 5, seed: 1, combatSeed: 777 }), s = g.state; setEquipBonus({});
      const R = ["gareth", "lyra", "roran", "kessa", "sera"]; R.forEach((k) => { const h = s.heroes[k]; h.owned = true; h.level = 40; h.stars = 10; }); s.conquestRoster = R;
      s.weaponLevels = { hex_shield: 10, orbit_shield: orbitLv }; s.equippedWeapons = ["hex_shield", "orbit_shield"];
      t += 1000; g.tick(); const I = s.idle; if (!(I.shieldMax > 0)) return { max: 0 };
      I.shield = I.shieldMax * 0.5; const start = I.shield;
      for (let i = 0; i < 10; i++) { t += 1000; g.tick(); }
      return { max: I.shieldMax, start, end: I.shield, pctPerSec: (I.shield - start) / I.shieldMax * 100 / 10 };
    };
    return { lv1: run(1), lv50: run(50) };
  });
  console.log(JSON.stringify({ v, errs }));
  await b.close();
  if (!process.env.NOASSERT) {
    assert.deepStrictEqual(errs, []); assert(v.lv50.max > 0, "Hex Shield is up");
    assert(Math.abs(v.lv1.end - v.lv1.start) < 1e-6, "no Hex Link before Orbit Lv10");
    assert(Math.abs(v.lv50.pctPerSec - 1) < 0.05, "Orbit Lv50 recharges the Hex pool 1% of max per second");
    console.log("g314 ok");
  }
})().catch((e) => { console.error(e); process.exit(1); });
