/* v1474: Fortress II (Command) vs Fortress I and vs Fortress III up the trees (copy of f1vf3_ladder.js). Prints Fortress II's win % vs each.
   node dev/balance/f2_ladder.js [--seeds 20]
   Original header: v1071: Fortress I vs Fortress III up the trees. Both sides spend the SAME research points on their tree (both trees cost 100M in total),
   filled in research order (row by row, each node to max). Mirror match except the fortress, World PvP engine (worldPvpBattle via the PvP Simulator).
   node dev/balance/f1vf3_ladder.js [--seeds 20]   Prints F1's win % (attacking and defending averaged) at each spend step. */
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "../..");
const args = process.argv.slice(2), arg = (k, d) => { const i = args.indexOf("--" + k); return i >= 0 ? args[i + 1] : d; };
const SEEDS = +arg("seeds", 20), EXTRA = JSON.parse(arg("cfg", "{}")), HD = arg("hd", null), CD = arg("cd", null), ICD = arg("icd", null), STEPSARG = arg("steps", null), ALL3 = process.argv.includes("--all3"), JSONOUT = arg("json", null), CENTER = arg("center", null), INN = arg("innate", null), SLOPE = +arg("slope", 0.08); /* per-row weight 1 + row x slope (game: 0.08; negative = front-loaded) */ /* --center hp:0.5 = the centre lane becomes that stat with that total; --innate dmgRed:0.1 = extra innate */ /* knobs: tree totals hero dmg / cooldown, innate cooldown */
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
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/", { timeout: 180000 }); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "bal" + process.pid + "@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 20000 }); await P.fill("#ksN", "Sim"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => setScreen("city"));
  const res = await P.evaluate(({ SEEDS, HD, CD, ICD, STEPSARG, ALL3, CENTER, INN, SLOPE }) => {
    const tot = { heroDmg: HD != null ? +HD : FORTRESS2_TOTAL.heroDmg, cdr: CD != null ? +CD : FORTRESS2_TOTAL.cdr };
    if (CENTER) { const [cs, ct] = CENTER.split(":"); tot[cs] = +ct; Object.keys(FORTRESS2_TREE).forEach((k) => { const d = FORTRESS2_TREE[k]; if (d.col === 1) d.stat = cs; }); }
    const ws = {}; Object.keys(FORTRESS2_TREE).forEach((k) => { const d = FORTRESS2_TREE[k]; ws[d.stat] = (ws[d.stat] || 0) + d.maxLevel * Math.max(0.1, 1 + d.row * SLOPE); });
    Object.keys(FORTRESS2_TREE).forEach((k) => { const d = FORTRESS2_TREE[k]; d.perLevel = tot[d.stat] * Math.max(0.1, 1 + d.row * SLOPE) / ws[d.stat]; });
    if (INN) { const [is, iv] = INN.split(":"); const orig = fortressBonusFrom; fortressBonusFrom = function (m) { const b = orig(m); if (fortressTypeOf(m) === 2) b[is] = (b[is] || 0) + +iv; return b; }; }
    if (ICD != null) FORTRESS2_INNATE_CDR = +ICD;
    const orig = pvpSimFortMap; window.pvpSimFortMap = (v) => (v && typeof v === "object") ? v : orig(v); /* custom partial trees */
    const fill = (tree, spend) => { /* research order: row by row, left to right, each node to max; stop when the budget runs out */
      const T = fortressTreeByType(tree), m = tree === 1 ? {} : { _type: tree }, keys = Object.keys(T).sort((a, b) => T[a].row - T[b].row || T[a].col - T[b].col);
      let left = spend, lv = 0;
      for (const k of keys) for (let l = 1; l <= T[k].maxLevel; l++) { const c = fortressNodeCost(k, l); if (c > left || !fortressNodeUnlocked(m, k)) return { m, lv }; left -= c; m[k] = l; lv++; }
      return { m, lv };
    };
    const HK = pvpSimHeroKeys();
    const mk = (fort, heroN, lvl, arms, sk, troops) => { const c = pvpSimDefaultSide(true); c.fort = fort; c.th = 20; c.cannon = true; c.baseHp = 0;
      Object.keys(c.troops).forEach((t) => { c.troops[t] = 0; }); ["infantry", "archer", "cavalry"].forEach((t) => { c.troops[t] = troops; });
      HK.forEach((k, i) => { c.heroes[k] = { on: i < heroN, level: lvl, arms: arms, c: [sk, sk, sk], e: [sk, sk, sk] }; }); c.weapons = {}; return c; };
    const fight = (ac, dc, seed) => { const a = pvpSimBuildSide(ac, false), d = pvpSimBuildSide(dc, true); return pvpSimRunOnce(a, d, ac, dc, seed, 0, 0, 0, 0, false).r; };
    const STEPS = STEPSARG ? STEPSARG.split(",").map(Number) : [0, 0.0005, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.35, 0.5, 0.75, 1];
    const SC = [["no heroes, troops 300x3", 0, 1, 0, 1, 300], ["1 hero Lv20, troops 300x3", 1, 20, 0, 1, 300], ["3 heroes Lv20 1*, troops 300x3", 3, 20, 5, 2, 300], ["3 heroes Lv40 2*, troops 300x3", 3, 40, 10, 3, 300], ["5 heroes Lv40 2*, troops 300x3", 5, 40, 10, 3, 300], ["5 heroes Lv80 5*, troops 1000x3", 5, 80, 25, 5, 1000]];
    const out = [];
    for (const st of STEPS) {
      const spend = st * 100e6, a = fill(1, spend + 1), b = fill(3, spend + 1), c2 = fill(2, spend + 1), row = { spend, lv: [a.lv, c2.lv, b.lv], vs1: [], vs3: [], i3: [] };
      const f1b = fortressBonusFrom(a.m), f3b = fortressBonusFrom(b.m); row.f1 = "cannon +" + Math.round(f1b.cannon * 100) + "%, super burst " + Math.round((f1b.critRate || 0) * 100) + "% x" + (Math.round((f1b.critMult || 1) * 100) / 100); row.f3 = "HP +" + Math.round(f3b.hp * 100) + "%, dmg taken -" + Math.round(f3b.dmgRed * 100) + "%"; const f2b = fortressBonusFrom(c2.m); row.f2 = "cooldowns -" + Math.round(f2b.cdr * 1000) / 10 + "%, hero dmg +" + Math.round(f2b.heroDmg * 1000) / 10 + "%" + (f2b.hp ? ", HP +" + Math.round(f2b.hp * 100) + "%" : "") + (f2b.dmgRed ? ", dmg taken -" + Math.round(f2b.dmgRed * 100) + "%" : "");
      for (const [name, hn, lvl, arms, sk, tr] of SC) {
        for (const [opp, key] of [[a, "vs1"], [b, "vs3"]]) {
          let w = 0, n = 0;
          for (let s = 1; s <= SEEDS; s++) {
            if (fight(mk(c2.m, hn, lvl, arms, sk, tr), mk(opp.m, hn, lvl, arms, sk, tr), s).win) w++; n++;
            if (!fight(mk(opp.m, hn, lvl, arms, sk, tr), mk(c2.m, hn, lvl, arms, sk, tr), s).win) w++; n++;
          }
          row[key].push(Math.round(100 * w / n));
        }
        if (ALL3) { let w = 0, n = 0; for (let s = 1; s <= SEEDS; s++) { if (fight(mk(a.m, hn, lvl, arms, sk, tr), mk(b.m, hn, lvl, arms, sk, tr), s).win) w++; n++; if (!fight(mk(b.m, hn, lvl, arms, sk, tr), mk(a.m, hn, lvl, arms, sk, tr), s).win) w++; n++; } row.i3.push(Math.round(100 * w / n)); }
      }
      out.push(row);
    }
    return { out, sc: SC.map((s) => s[0]) };
  }, { SEEDS, HD, CD, ICD, STEPSARG, ALL3, CENTER, INN, SLOPE });
  console.log("\nFORTRESS II vs I and vs III, equal research spent on each tree (" + SEEDS + " seeds x both orders). Numbers = Fortress II win %.");
  console.log("  spent     lv I/II/III | vs I: " + res.sc.map((s, i) => "S" + (i + 1)).join("   ") + " | vs III: " + res.sc.map((s, i) => "S" + (i + 1)).join("   "));
  res.out.forEach((r) => console.log("  " + (r.spend >= 1e6 ? (r.spend / 1e6) + "M" : Math.round(r.spend / 1e3) + "k").padEnd(8) + r.lv.join("/").padStart(12) + " | " + r.vs1.map((x) => (x + "%").padStart(4)).join(" ") + " | " + r.vs3.map((x) => (x + "%").padStart(4)).join(" ") + "   II: " + r.f2));
  if (JSONOUT) require("fs").writeFileSync(JSONOUT, JSON.stringify(res, null, 1));
  res.sc.forEach((s, i) => console.log("  S" + (i + 1) + " = " + s));
  await b.close();
}
