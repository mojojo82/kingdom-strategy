/* v1198 (Harley, audit item 5): EMP Gun Lv50 Aftershock (second 1 s stun 3 s later) works in Conquest too.
   Run: node dev/simfork/g318_emp_aftershock.js */
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
  await P.fill("#ksE", "g318@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Aftershock"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const v = await P.evaluate(() => {
    const run = (lv) => { let t = Date.UTC(2026, 0, 5); const g = createGame({ now: () => t, mapSize: 5, seed: 1, combatSeed: 777 }), s = g.state; setEquipBonus({});
      s.conquestRoster = []; s.weaponLevels = { emp_gun: lv }; s.equippedWeapons = ["emp_gun"];
      let bump = null;
      for (let i = 0; i < 80; i++) { const T = s.idle.fxT && s.idle.fxT.emp_gun, n0 = T ? (T.asN || 0) : 0, before = {}; s.idle.enemies.forEach((e) => { before[e.id] = e.atkCooldown; });
        t += 500; g.tick(); const T2 = s.idle.fxT && s.idle.fxT.emp_gun;
        if (T2 && (T2.asN || 0) > n0 && bump == null) { const e = s.idle.enemies.find((x) => x.arrived && before[x.id] != null); if (e) bump = e.atkCooldown - before[e.id]; } }
      const T = s.idle.fxT && s.idle.fxT.emp_gun; return { asN: T ? (T.asN || 0) : 0, bump }; };
    return { lv30: run(30), lv50: run(50) };
  });
  console.log(JSON.stringify({ v, errs }));
  await b.close();
  if (!process.env.NOASSERT) {
    assert.deepStrictEqual(errs, []); assert.strictEqual(v.lv30.asN, 0, "no Aftershock below Lv50");
    assert(v.lv50.asN >= 1, "Lv50 Aftershock fires in Conquest");
    assert(v.lv50.bump > 0.4, "the Aftershock pushes enemy attacks back (1 s, minus the 0.5 s tick)");
    console.log("g318 ok");
  }
})().catch((e) => { console.error(e); process.exit(1); });
