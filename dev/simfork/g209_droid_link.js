/* v970: droid link - while your Clone Task droid stands, enemy EMP can't stop or reset your Railgun. Run: node dev/simfork/g209_droid_link.js */
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
  await P.fill("#ksE", "g209@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Emp"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const r = await P.evaluate(() => {
    const FIVE = ["gareth", "lyra", "roran", "kessa", "sera"], hs = {}; FIVE.forEach((k) => { hs[k] = { owned: true, level: 40, stars: 10, skillLevels: { conquest: [3, 3, 3], expedition: [3, 3, 3] } }; });
    const side = (isP) => { const st = arenaSideStats(FIVE, hs, 15, 0, false, null, null, undefined, ZERO_BONUS); (st.heroHp || []).forEach((e) => { e.runL = arenaRunDist(400, 240, FIVE.indexOf(e.id), isP); }); return st; };
    const kit = (ids) => { const m = {}; ids.forEach((id) => { m[id] = 30; }); return botWeaponsToSim(m); };
    const rails = (A, B) => { const ka = kit(A), kb = kit(B), sim = arenaMakeSim(side(true), side(false), { rng: worldPvpSeededRng("d"), critSeed: "d", weapons: ka.specs, aiWeapons: kb.specs, shieldPct: ka.shieldPct, aiShieldPct: kb.shieldPct });
      let x; do { x = sim.step(); } while (!x.done); return sim.fxState.P.casts.rail || 0; };
    const EMPB = ["emp_gun", "laser_beam", "missile_barrage"];
    return { linked: rails(["emp_gun", "railgun", "clone_task"], EMPB), noClone: rails(["emp_gun", "railgun", "laser_beam"], EMPB), noEmpFoe: rails(["emp_gun", "railgun", "laser_beam"], ["laser_beam", "missile_barrage", "flak_burst"]),
      card: WEAPON_DEFS_BY_ID.railgun.desc(null, game.weaponStatsAtLevel(WEAPON_DEFS_BY_ID.railgun, 30)), cloneCard: WEAPON_DEFS_BY_ID.clone_task.desc(null, game.weaponStatsAtLevel(WEAPON_DEFS_BY_ID.clone_task, 30)) };
  });
  console.log(JSON.stringify(r));
  assert.ok(r.linked >= 1, "with a droid up, the Railgun fires through enemy EMP");
  assert.strictEqual(r.noClone, 0, "without Clone Task, enemy EMP still keeps the Railgun from firing");
  assert.ok(r.noEmpFoe >= 1, "with no enemy EMP the Railgun fires as normal");
  assert.ok(/Summon link/.test(r.card) && /summon/i.test(r.cloneCard) && !/droid/i.test(r.card + r.cloneCard), "v972: cards talk about summons / clones, not droids");
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
