/* v1034 scratch->kept: Fortress I vs Fortress III in World PvP (the PvP Simulator's engine, worldPvpBattle), mirror match except the fortress.
   node dev/balance/f1vf3.js [--seeds 20]   Prints F1's win % per scenario, both orders (F1 attacking / F1 defending). */
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "../..");
const args = process.argv.slice(2), arg = (k, d) => { const i = args.indexOf("--" + k); return i >= 0 ? args[i + 1] : d; };
const SEEDS = +arg("seeds", 20), EXTRA = JSON.parse(arg("cfg", "{}"));
worker();
async function worker() {
  const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
  const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
  const GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8"), FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8");
  const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 } });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => process.stderr.write("PAGEERR " + e.message + "\n"));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "bal" + process.pid + "@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 20000 }); await P.fill("#ksN", "Sim"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => setScreen("city"));
  if (process.env.DIAG) { const d = await P.evaluate(() => {
    const HK = pvpSimHeroKeys();
    const mk = (fort, heroN, lvl, arms, sk, troops) => { const c = pvpSimDefaultSide(true); c.fort = fort; c.th = 20; c.cannon = true; c.baseHp = 0; Object.keys(c.troops).forEach((t) => { c.troops[t] = 0; }); ["infantry", "archer", "cavalry"].forEach((t) => { c.troops[t] = troops; }); HK.forEach((k, i) => { c.heroes[k] = { on: i < heroN, level: lvl, arms: arms, c: [sk, sk, sk], e: [sk, sk, sk] }; }); return c; };
    const one = (ac, dc) => { const a = pvpSimBuildSide(ac, false), dd = pvpSimBuildSide(dc, true); const r = pvpSimRunOnce(a, dd, ac, dc, 1, 0, 0, 0, 0, true).r;
      const sum = (o) => { const t = {}; Object.keys(o || {}).forEach((k) => { t[k] = Math.round(o[k]); }); return t; };
      return { win: r.win, ticks: r.ticks, atkHp: Math.round(r.atkPower), defHp: Math.round(r.defPower), atkLeft: Math.round(r.atkHpLeft), defLeft: Math.round(r.defHpLeft), atkArmor: r.atkArmor, defArmor: r.defArmor, atkSrc: sum(r.atkDmgSrc), defSrc: sum(r.defDmgSrc) }; };
    const fb = (m) => { const b = fortressBonusFrom(m); return JSON.stringify(b); };
    return { f1max: fb(fortressMaxMap()), f3max: fb(fortressMaxMap(3)), f1base: fb({}), f3base: fb({ _type: 3 }),
      noHero_F1atk: one(mk("max", 0, 1, 0, 1, 300), mk("t3max", 0, 1, 0, 1, 300)),
      h5_F1atk: one(mk("max", 5, 40, 10, 3, 300), mk("t3max", 5, 40, 10, 3, 300)),
      h5_F3atk: one(mk("t3max", 5, 40, 10, 3, 300), mk("max", 5, 40, 10, 3, 300)),
      h5_F1mirror: one(mk("max", 5, 40, 10, 3, 300), mk("max", 5, 40, 10, 3, 300)),
      h5_F3mirror: one(mk("t3max", 5, 40, 10, 3, 300), mk("t3max", 5, 40, 10, 3, 300)) }; });
    Object.keys(d).forEach((k) => console.log(k, JSON.stringify(d[k]))); await b.close(); return; }
  const res = await P.evaluate(({ SEEDS, EXTRA }) => {
    const HK = pvpSimHeroKeys();
    const mk = (fort, heroN, lvl, arms, sk, troops, weapons) => { const c = pvpSimDefaultSide(true); c.fort = fort; c.th = 20; c.cannon = true; c.baseHp = 0;
      Object.keys(c.troops).forEach((t) => { c.troops[t] = 0; }); ["infantry", "archer", "cavalry"].forEach((t) => { c.troops[t] = troops; });
      HK.forEach((k, i) => { c.heroes[k] = { on: i < heroN, level: lvl, arms: arms, c: [sk, sk, sk], e: [sk, sk, sk] }; }); c.weapons = weapons || {}; Object.assign(c, EXTRA); return c; };
    const fight = (ac, dc, seed) => { const a = pvpSimBuildSide(ac, false), d = pvpSimBuildSide(dc, true); return pvpSimRunOnce(a, d, ac, dc, seed, 0, 0, 0, 0, false).r; };
    const out = [];
    const SC = [
      ["no heroes, troops 300x3", 0, 1, 0, 1, 300],
      ["no heroes, troops 1000x3", 0, 1, 0, 1, 1000],
      ["1 hero Lv20, troops 300x3", 1, 20, 0, 1, 300],
      ["3 heroes Lv40 2*, troops 300x3", 3, 40, 10, 3, 300],
      ["5 heroes Lv40 2*, troops 300x3", 5, 40, 10, 3, 300],
      ["5 heroes Lv80 5*, troops 1000x3", 5, 80, 25, 5, 1000],
      ["5 heroes Lv80 5*, no troops", 5, 80, 25, 5, 0]
    ];
    for (const [name, hn, lvl, arms, sk, tr] of SC) for (const [fl, f1, f3] of [["innate only", "base", "t3"], ["trees maxed", "max", "t3max"]]) {
      let w1a = 0, w1d = 0, n = 0, tk = 0;
      for (let s = 1; s <= SEEDS; s++) {
        const r1 = fight(mk(f1, hn, lvl, arms, sk, tr), mk(f3, hn, lvl, arms, sk, tr), s); if (r1.win) w1a++;
        const r2 = fight(mk(f3, hn, lvl, arms, sk, tr), mk(f1, hn, lvl, arms, sk, tr), s); if (!r2.win) w1d++;
        n++; tk += r1.ticks + r2.ticks;
      }
      out.push({ name, fl, f1Atk: Math.round(100 * w1a / n), f1Def: Math.round(100 * w1d / n), secs: Math.round(tk / (2 * n) * ARENA_TICK_MS / 100) / 10 });
    }
    /* mirror checks: same fortress both sides (attacker vs defender bias) */
    const mir = [];
    for (const [name, hn, lvl, arms, sk, tr] of [SC[0], SC[4], SC[5]]) for (const f of ["max", "t3max"]) { let w = 0; for (let s = 1; s <= SEEDS; s++) if (fight(mk(f, hn, lvl, arms, sk, tr), mk(f, hn, lvl, arms, sk, tr), s).win) w++; mir.push({ name, f, atkWin: Math.round(100 * w / SEEDS) }); }
    return { out, mir };
  }, { SEEDS, EXTRA });
  console.log("\nFORTRESS I vs FORTRESS III - World PvP (PvP Simulator engine), mirror match except the fortress, " + SEEDS + " seeds each order");
  console.log("  F1 win % when F1 attacks | when F1 defends | avg fight length");
  res.out.forEach((r) => console.log("  " + (r.name + " [" + r.fl + "]").padEnd(52) + (r.f1Atk + "%").padStart(5) + "   " + (r.f1Def + "%").padStart(5) + "   " + r.secs + "s"));
  console.log("\nSAME fortress both sides (attacker win %, shows any attacker/defender bias):");
  res.mir.forEach((r) => console.log("  " + (r.name + " [" + (r.f === "max" ? "F1 max" : "F3 max") + "]").padEnd(52) + (r.atkWin + "%").padStart(5)));
  await b.close();
}
