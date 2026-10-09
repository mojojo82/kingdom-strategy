/* v969: both sides act at the same moment - identical teams + identical weapons always end level (a draw), whichever side attacks. Run: node dev/simfork/g208_fair_mirror.js */
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
  await P.fill("#ksE", "g208@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Emp"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const r = await P.evaluate(() => {
    const kit = (ids) => { const m = {}; ids.forEach((id) => { m[id] = 30; }); return botWeaponsToSim(m); };
    const out = {};
    [[40, 10], [20, 0], [80, 25]].forEach(([lvl, arms]) => {
      const FIVE = ["gareth", "lyra", "roran", "kessa", "sera"], hs = {}; FIVE.forEach((k) => { hs[k] = { owned: true, level: lvl, stars: arms, skillLevels: { conquest: [3, 3, 3], expedition: [3, 3, 3] } }; });
      const side = (isP) => { const st = arenaSideStats(FIVE, hs, 15, 0, false, null, null, undefined, ZERO_BONUS); (st.heroHp || []).forEach((e) => { e.runL = arenaRunDist(400, 240, FIVE.indexOf(e.id), isP); }); return st; };
      [[], ["missile_barrage"], ["railgun"], ["clone_task"], ["railgun", "clone_task"], ["emp_gun", "clone_task"], ["emp_gun", "railgun", "clone_task"], ["hex_shield", "emp_gun", "railgun"], ["laser_beam", "droid_call", "io_repair"]].forEach((B) => {
        ["s1", "s2"].forEach((seed) => { const k = kit(B), sim = arenaMakeSim(side(true), side(false), { rng: worldPvpSeededRng(seed), critSeed: seed, weapons: k.specs, aiWeapons: k.specs, shieldPct: k.shieldPct, aiShieldPct: k.shieldPct });
          let x; do { x = sim.step(); } while (!x.done); out["Lv" + lvl + " " + (B.join("+") || "none") + " " + seed] = x.winner + " " + Math.round(x.info.playerHp) + "/" + Math.round(x.info.aiHp); });
      });
    });
    return out;
  });
  const bad = Object.keys(r).filter((k) => !/^draw /.test(r[k]) && !/^(player|ai) (\d+)\/\1$/.test(r[k]));
  console.log(JSON.stringify(r, null, 1)); console.log("not level:", bad);
  assert.deepStrictEqual(bad, [], "every mirror ends level");
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
