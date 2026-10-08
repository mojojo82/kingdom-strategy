/* v967: EMP vs EMP - EMPs due in the same tick fire together, so both fortresses are stunned (no attacker-goes-first win). Run: node dev/simfork/g206_emp_mirror.js */
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
  await P.fill("#ksE", "g206@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Emp"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const r = await P.evaluate(() => {
    const FIVE = ["gareth", "lyra", "roran", "kessa", "sera"], hs = {}; FIVE.forEach((k) => { hs[k] = { owned: true, level: 40, stars: 10, skillLevels: { conquest: [3, 3, 3], expedition: [3, 3, 3] } }; });
    const side = (isP) => { const st = arenaSideStats(FIVE, hs, 15, 0, false, null, null, undefined, ZERO_BONUS); (st.heroHp || []).forEach((e) => { e.runL = arenaRunDist(400, 240, FIVE.indexOf(e.id), isP); }); return st; };
    const kit = (ids) => { const m = {}; ids.forEach((id) => { m[id] = 30; }); return botWeaponsToSim(m); };
    const mk = (A, B, sd) => { const ka = kit(A), kb = kit(B); return arenaMakeSim(side(true), side(false), { rng: worldPvpSeededRng("e" + sd), critSeed: "e" + sd, weapons: ka.specs, aiWeapons: kb.specs, shieldPct: ka.shieldPct, aiShieldPct: kb.shieldPct }); };
    const META = ["emp_gun", "railgun", "clone_task"];
    /* first tick of an EMP mirror: both fortresses stunned */
    const s1 = mk(META, ["emp_gun", "laser_beam", "missile_barrage"], 1).step();
    const o = { stunP: s1.info.fxP.stun, stunA: s1.info.fxA.stun };
    /* attacker bias: the meta vs other EMP builds, as attacker and as defender */
    const others = [["emp_gun", "laser_beam", "railgun"], ["emp_gun", "missile_barrage", "clone_task"], ["emp_gun", "railgun", "droid_call"], ["emp_gun", "deflector_dome", "io_repair"], ["emp_gun", "railgun", "flak_burst"], ["emp_gun", "clone_task", "pulse_beam"]];
    let atkOnly = 0; others.forEach((B) => { const a = mk(META, B, 1).runToEnd() === "player", d = mk(B, META, 2).runToEnd() === "ai"; if (a && !d) atkOnly++; });
    o.attackerOnlyWins = atkOnly;
    /* Status Wave still blocks: EMP vs EMP + Status Wave -> only the non-wave side is stunned */
    const s2 = mk(META, ["emp_gun", "status_wave", "railgun"], 1).step(); o.swStunP = s2.info.fxP.stun; o.swStunA = s2.info.fxA.stun;
    return o;
  });
  console.log(JSON.stringify(r));
  assert.ok(r.stunP > 0 && r.stunA > 0, "EMP mirror: both fortresses stunned on the first tick");
  assert.ok(r.attackerOnlyWins === 0, "the meta no longer wins EMP mirrors only when attacking");
  assert.ok(r.swStunP > 0 && !(r.swStunA > 0), "Status Wave still blocks the other EMP");
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
