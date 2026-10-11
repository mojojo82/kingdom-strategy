/* Fortress I helper-card prototypes (sim only - injected into the sim's copy of the game, the real game is untouched), on the equal-spend ladder.
   Was: v1071: Fortress I vs Fortress III up the trees. Both sides spend the SAME research points on their tree (both trees cost 100M in total),
   filled in research order (row by row, each node to max). Mirror match except the fortress, World PvP engine (worldPvpBattle via the PvP Simulator).
   node dev/balance/f1vf3_ladder.js [--seeds 20]   Prints F1's win % (attacking and defending averaged) at each spend step. */
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "../..");
const args = process.argv.slice(2), arg = (k, d) => { const i = args.indexOf("--" + k); return i >= 0 ? args[i + 1] : d; };
const SEEDS = +arg("seeds", 20), EXTRA = JSON.parse(arg("cfg", "{}"));
worker();
async function worker() {
  const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
  const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
  let GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
  const inj = (a, b) => { if (GAME.split(a).length !== 2) throw new Error("hook not found: " + a.slice(0, 60)); GAME = GAME.replace(a, b); };
  /* hooks: window.__F1X = card config for the Fortress I side (null = off), window.__F1S = per-fight timers */
  inj("fortType: fortressTypeOf(fortressMap || {}),", "fortType: fortressTypeOf(fortressMap || {}), fortDR: fb.dmgRed || 0,");
  inj("  var pStats0 = playerStats; playerStats = cardStatic(playerStats, cmP, aiStats, nHeroP); aiStats = cardStatic(aiStats, cmA, pStats0, nHeroA);",
      "  var pStats0 = playerStats; playerStats = cardStatic(playerStats, cmP, aiStats, nHeroP); aiStats = cardStatic(aiStats, cmA, pStats0, nHeroA);\n  if (window.__F1X && window.__F1X.rapid) { if (playerStats.fortType === 1) playerStats = Object.assign({}, playerStats, { critRate: Math.min(1, (playerStats.critRate || 0) + window.__F1X.rapid * nHeroP) }); if (aiStats.fortType === 1) aiStats = Object.assign({}, aiStats, { critRate: Math.min(1, (aiStats.critRate || 0) + window.__F1X.rapid * nHeroA) }); }\n  window.__F1S = { p: { brk: 0, mark: 0 }, a: { brk: 0, mark: 0 } };");
  inj("    var toAi = playerDmg * (aiStats.dmgTakenMult || 1), toPlayer = aiDmg * (playerStats.dmgTakenMult || 1);",
      "    var toAi = playerDmg * (aiStats.dmgTakenMult || 1), toPlayer = aiDmg * (playerStats.dmgTakenMult || 1);\n    if (window.__F1X) { var F1X = window.__F1X, F1S = window.__F1S;\n      var f1side = function (isP) { var st = isP ? playerStats : aiStats, os = isP ? aiStats : playerStats; if (st.fortType !== 1) return null;\n        var c = isP ? playerCannon : aiCannon, land = isP ? landP : landA, lm = isP ? landPMult : landAMult, dmg = isP ? playerDmg : aiDmg, ss = F1S[isP ? 'p' : 'a'], bul = isP ? playerCannonBullets : aiCannonBullets;\n        if (land > 0 && lm > 1) { ss.brk = F1X.brkTicks || 0; ss.mark = F1X.markTicks || 0; }\n        var non = Math.max(0, dmg - land), add = 0, mult = 1;\n        if (F1X.gun && bul > 0) add += F1X.gun * non;\n        if (F1X.share && c.firing && (c.mult || 1) > 1) add += non * (c.mult - 1) * F1X.share;\n        if (F1X.mark && ss.mark > 0) mult *= 1 + F1X.mark;\n        if (F1X.flat) mult *= 1 + F1X.flat;\n        if (F1X.brk && ss.brk > 0 && os.fortDR) mult /= Math.max(0.05, 1 - os.fortDR);\n        if (ss.brk > 0) ss.brk--; if (ss.mark > 0) ss.mark--; return { add: add, mult: mult }; };\n      var f1p = f1side(true), f1a = f1side(false);\n      if (f1p) toAi = (toAi + f1p.add * (aiStats.dmgTakenMult || 1)) * f1p.mult;\n      if (f1a) toPlayer = (toPlayer + f1a.add * (playerStats.dmgTakenMult || 1)) * f1a.mult; }");
  const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8");
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
  const res = await P.evaluate(({ SEEDS, ONLY }) => {
    const orig = pvpSimFortMap; window.pvpSimFortMap = (v) => (v && typeof v === "object") ? v : orig(v);
    const fill = (tree, spend) => { const T = tree === 3 ? FORTRESS3_TREE : FORTRESS1_TREE, m = tree === 3 ? { _type: 3 } : {}, keys = Object.keys(T).sort((a, b) => T[a].row - T[b].row || T[a].col - T[b].col);
      let left = spend; for (const k of keys) for (let l = 1; l <= T[k].maxLevel; l++) { const c = fortressNodeCost(k, l); if (c > left || !fortressNodeUnlocked(m, k)) return m; left -= c; m[k] = l; } return m; };
    const HK = pvpSimHeroKeys();
    const mk = (fort, heroN, lvl, arms, sk, troops) => { const c = pvpSimDefaultSide(true); c.fort = fort; c.th = 20; c.cannon = true; c.baseHp = 0;
      Object.keys(c.troops).forEach((t) => { c.troops[t] = 0; }); ["infantry", "archer", "cavalry"].forEach((t) => { c.troops[t] = troops; });
      HK.forEach((k, i) => { c.heroes[k] = { on: i < heroN, level: lvl, arms: arms, c: [sk, sk, sk], e: [sk, sk, sk] }; }); c.weapons = {}; return c; };
    const fight = (ac, dc, seed) => { const a = pvpSimBuildSide(ac, false), d = pvpSimBuildSide(dc, true); return pvpSimRunOnce(a, d, ac, dc, seed, 0, 0, 0, 0, false).r; };
    const T = (s) => Math.round(s * 1000 / ARENA_TICK_MS);
    const CARDS = [
      ["none", null],
      ["1 Gunnery +50% army dmg while firing", { gun: 0.5 }], ["1 Gunnery +100%", { gun: 1.0 }],
      ["2 Armor Breaker 4s", { brk: 1, brkTicks: T(4) }], ["2 Armor Breaker 8s", { brk: 1, brkTicks: T(8) }],
      ["3 Shared Fire 25% of crit", { share: 0.25 }], ["3 Shared Fire 50%", { share: 0.5 }],
      ["4 Spotter's Mark +30% 5s", { mark: 0.3, markTicks: T(5) }], ["4 Spotter's Mark +60% 5s", { mark: 0.6, markTicks: T(5) }],
      ["5 Rapid Battery +8%/hero", { rapid: 0.08 }], ["5 Rapid Battery +15%/hero", { rapid: 0.15 }],
      ["6 Flat army dmg +30%", { flat: 0.3 }], ["6 Flat army dmg +50%", { flat: 0.5 }], ["6 Flat army dmg +70%", { flat: 0.7 }], ["6 Flat army dmg +100%", { flat: 1.0 }]
    ].filter((c) => !ONLY || ONLY.split(",").some((o) => c[0].startsWith(o)));
    const STEPS = [0, 0.002, 0.01, 0.05, 0.1, 0.2, 0.35, 0.5, 0.75, 1];
    const SC = [["no heroes", 0, 1, 0, 1, 300], ["1 hero Lv20", 1, 20, 0, 1, 300], ["3 heroes Lv40 2*", 3, 40, 10, 3, 300], ["5 heroes Lv40 2*", 5, 40, 10, 3, 300], ["5 heroes Lv80 5*", 5, 80, 25, 5, 1000]];
    const maps = STEPS.map((s) => [fill(1, s * 100e6 + 1), fill(3, s * 100e6 + 1)]);
    const out = [];
    for (const [cname, cfg] of CARDS) { window.__F1X = cfg; const rows = [];
      for (const [name, hn, lvl, arms, sk, tr] of SC) { const r = [];
        for (const [m1, m3] of maps) { let w = 0, n = 0;
          for (let s = 1; s <= SEEDS; s++) { if (fight(mk(m1, hn, lvl, arms, sk, tr), mk(m3, hn, lvl, arms, sk, tr), s).win) w++; n++; if (!fight(mk(m3, hn, lvl, arms, sk, tr), mk(m1, hn, lvl, arms, sk, tr), s).win) w++; n++; }
          r.push(Math.round(100 * w / n)); }
        rows.push([name, r]); }
      out.push([cname, rows]); }
    window.__F1X = null;
    return { out, steps: STEPS.map((s) => s * 100e6) };
  }, { SEEDS, ONLY: arg("only", "") });
  console.log("\nFORTRESS I + test card vs FORTRESS III, equal research spent (" + SEEDS + " seeds x both orders). Numbers = Fortress I win %.");
  console.log("  spent on each tree:".padEnd(24) + res.steps.map((s) => (s >= 1e6 ? s / 1e6 + "M" : Math.round(s / 1e3) + "k").padStart(6)).join(""));
  res.out.forEach(([cname, rows]) => { console.log("\n" + cname); rows.forEach(([n, r]) => console.log("  " + n.padEnd(22) + r.map((x) => (x + "%").padStart(6)).join(""))); });
  await b.close();
}
