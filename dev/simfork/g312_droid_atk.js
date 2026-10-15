/* v1192 (Harley, audit item 10): Droid Call in Conquest uses the same base as Arena (average ranged hero damage per second incl. ATK bonus).
   Run: node dev/simfork/g312_droid_atk.js */
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
  await P.fill("#ksE", "g312@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Droid"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const v = await P.evaluate(() => {
    const run = (atkBonus) => {
      setHeroBonus("atk", atkBonus);
      let t = Date.UTC(2026, 0, 5); const g = createGame({ now: () => t, mapSize: 5, seed: 1, combatSeed: 777 }), s = g.state; setEquipBonus({});
      ["lyra", "kessa", "sera"].forEach((k) => { const h = s.heroes[k]; h.owned = true; h.level = 1; h.stars = 0; }); s.conquestRoster = ["lyra", "kessa", "sera"];
      s.idle.chapter = 8; s.idle.levelNum = 1; s.weaponLevels = { droid_call: 1 }; s.equippedWeapons = ["droid_call"];
      let dmg = 0, secs = 0;
      for (let i = 0; i < 200; i++) {
        const spy = (arr, fn) => { arr = arr || []; const o = arr.push; arr.push = function (...xs) { xs.forEach(fn); return o.apply(this, xs); }; return arr; };
        s.idle.fxShotLog = spy([], (x) => { if (x.kind === "drone") dmg += x.dmg; });
        t += 1000; g.tick();
      }
      return dmg;
    };
    const d0 = run(0), d50 = run(50); setHeroBonus("atk", 0);
    return { d0, d50, ratio: d50 / d0 };
  });
  console.log(JSON.stringify({ v, errs }));
  await b.close();
  if (!process.env.NOASSERT) {
    assert.deepStrictEqual(errs, []); assert(v.d0 > 0, "the drone fired");
    assert(v.ratio > 1.3, "Droid Call damage grows with the ATK bonus in Conquest (like Arena)");
    console.log("g312 ok");
  }
})().catch((e) => { console.error(e); process.exit(1); });
