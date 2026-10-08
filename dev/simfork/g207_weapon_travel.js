/* v968: nothing a weapon fires is instant in Arena - Missile shots, EMP pulses and Railgun shots land ARENA_WEAPON_FLIGHT_TICKS (1.8s) after firing. Run: node dev/simfork/g207_weapon_travel.js */
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
  await P.fill("#ksE", "g207@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Emp"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const r = await P.evaluate(() => {
    const FIVE = ["gareth", "lyra", "roran", "kessa", "sera"], hs = {}; FIVE.forEach((k) => { hs[k] = { owned: true, level: 40, stars: 10, skillLevels: { conquest: [3, 3, 3], expedition: [3, 3, 3] } }; });
    const side = (isP) => { const st = arenaSideStats(FIVE, hs, 15, 0, false, null, null, undefined, ZERO_BONUS); (st.heroHp || []).forEach((e) => { e.runL = arenaRunDist(400, 240, FIVE.indexOf(e.id), isP); }); return st; };
    const kit = (ids) => { const m = {}; ids.forEach((id) => { m[id] = 30; }); return botWeaponsToSim(m); };
    const o = { flightTicks: ARENA_WEAPON_FLIGHT_TICKS };
    /* missile: fired on tick 1, its damage shows up in the trace ARENA_WEAPON_FLIGHT_TICKS later */
    { const k = kit(["missile_barrage"]), tr = { src: {}, aiSrc: {}, perTick: [] }; const sim = arenaMakeSim(side(true), side(false), { rng: worldPvpSeededRng("t"), critSeed: "t", weapons: k.specs, trace: tr });
      let fireT = null, landT = null; for (let t = 1; t <= 20 && landT == null; t++) { const x = sim.step(); if (fireT == null && (x.info.playerWeaponFires || x.playerWeaponFires || []).length) fireT = t; if (landT == null && (tr.src["weapon:missile_barrage"] || 0) > 0) landT = t; }
      o.missileFire = fireT; o.missileLand = landT; }
    /* EMP: fires at the start, the stun lands later */
    { const k = kit(["emp_gun"]); const sim = arenaMakeSim(side(true), side(false), { rng: worldPvpSeededRng("t"), critSeed: "t", weapons: k.specs }); let t = 0, x; do { x = sim.step(); t++; } while (!(x.info.fxA.stun > 0) && t < 40); o.empStunTick = t; }
    /* Railgun: 10s countdown (~23 ticks) then flight before the knockout */
    { const k = kit(["railgun"]); const sim = arenaMakeSim(side(true), side(false), { rng: worldPvpSeededRng("t"), critSeed: "t", weapons: k.specs }); let t = 0, x; do { x = sim.step(); t++; } while (!((x.info.aiHeroes || []).length && x.info.aiHeroes.every((h) => h.ko)) && t < 60 && !x.done); o.railKoTick = t; o.railCountdownTicks = Math.round(10 / (ARENA_TICK_MS / 1000)); }
    return o;
  });
  console.log(JSON.stringify(r));
  assert.strictEqual(r.flightTicks, 4, "weapon flight = 1.8s = 4 ticks");
  assert.ok(r.missileFire != null && r.missileLand === r.missileFire + r.flightTicks, "missile damage lands one flight after firing");
  assert.strictEqual(r.empStunTick, 1 + r.flightTicks, "EMP stun lands one flight after it fires");
  assert.ok(r.railKoTick >= r.railCountdownTicks + r.flightTicks, "railgun knockout lands one flight after the countdown");
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
