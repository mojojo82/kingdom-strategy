/* v1189 (Harley, audit item 4): Cannon Doctrine (+70% on Fortress I) boosts weapons in Conquest too, like Arena.
   Run: node dev/simfork/g309_doctrine_weapons.js */
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
  await P.fill("#ksE", "g309@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Doctrine"); await P.click("#ksGo"); await P.waitForTimeout(5000);
    const v = await P.evaluate(() => {
    const run = (card, ftype) => {
      let t = Date.UTC(2026, 0, 5); const g = createGame({ now: () => t, mapSize: 5, seed: 1, combatSeed: 777 }), s = g.state; setEquipBonus({});
      s.conquestRoster = []; /* no heroes: early enemies would die before the weapons get a shot */
      s.fortressTech = s.fortressTech || {}; s.fortressTech._type = ftype;
      s.weaponLevels = { missile_barrage: 20, railgun: 20 }; s.equippedWeapons = ["missile_barrage", "railgun"];
      s.cards = s.cards || []; s.cards[0] = Object.assign({}, s.cards[0] || {}, { name: "Cannon Doctrine" }); s.equippedCards = card ? [0] : [];
      let mis = 0, rail = null;
      for (let i = 0; i < 300 && (!mis || rail == null); i++) { const hp = {}; s.idle.enemies.forEach((e) => { hp[e.id] = e.maxHp; });
        const spy = (arr, fn) => { arr = arr || []; const o = arr.push; arr.push = function (...xs) { xs.forEach(fn); return o.apply(this, xs); }; return arr; };
        s.idle.weaponFlightQueue = spy(s.idle.weaponFlightQueue, (q) => { if (q.wid === "missile_barrage") mis = Math.max(mis, q.dmg); });
        s.idle.fxShotLog = spy([], (x) => { if (x.kind === "rail" && x.hits && x.hits.length && rail == null) { const h = x.hits[0]; rail = h.dmg / (hp[h.id] || 1); } });
        t += 1000; g.tick(); }
      return { mis, rail };
    };
    const off = run(false, 1), on = run(true, 1), f3 = run(true, 3);
    return { off, on, f3, misR: on.mis / off.mis, railR: on.rail / off.rail, f3mis: f3.mis / off.mis, f3rail: f3.rail / off.rail };
  });
  console.log(JSON.stringify({ v, errs }));
  await b.close();
  if (!process.env.NOASSERT) {
    assert.deepStrictEqual(errs, []); assert(v.off.mis > 0 && v.off.rail > 0, "both weapons fired");
    assert(Math.abs(v.misR - 1.7) < 0.01, "missiles +70% with Cannon Doctrine on Fortress I"); assert(Math.abs(v.railR - 1.7) < 0.01, "railgun +70%");
    assert(Math.abs(v.f3mis - 1) < 0.01 && Math.abs(v.f3rail - 1) < 0.01, "no boost on Fortress III");
    console.log("g309 ok");
  }
})().catch((e) => { console.error(e); process.exit(1); });
