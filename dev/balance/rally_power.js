/* after v1722 (Harley): rally POWER test (strong solo vs weak 15-player rally; linear vs square-root troop damage) on the hero-line prototype - every participant's heroes queue in join order, 5 on the field, a knocked-out hero is replaced by the next in line (no revive); troops pooled per side. World PvP engine. Balance scripts only.
   Full-team Arena ranking (v1692, Harley): random 5-hero teams from the whole roster, at most ONE of the "big" heroes (Iron Lily, Kessa, Hanzo, Tom)
   per team. Every team fights every other team, both sides, fixed seeds; a team's score = its win rate (draws = half). Shows where the teams with each
   big hero (and with none) rank.  Usage: node dev/balance/team_rank.js [--per 12] [--seeds 1] [--levels 40,80] */
const fs = require("fs"), path = require("path"), ROOT = path.join(__dirname, "../..");
const args = process.argv.slice(2), arg = (k, d) => { const i = args.indexOf("--" + k); return i >= 0 ? args[i + 1] : d; };
const PER = +arg("per", 12), SEEDS = +arg("seeds", 1), LEVELS = arg("levels", "40,80").split(",").map(Number);
(async () => {
  const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
  const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome";
  let GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8"); const rep = (a, b) => { if (GAME.split(a).length !== 2) throw new Error("patch point: " + a); GAME = GAME.replace(a, b); };
  rep("if (waveQ.length) { var waveKeep = [];", "if (window.__lineTick) window.__lineTick(tick, pHH, aHH);\n    if (waveQ.length) { var waveKeep = [];"); const _g = GAME, FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8");
  const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 } });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, require(path.join(ROOT, "dev/tests/siteroute.js"))(GAME));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => process.stderr.write("PAGEERR " + e.message + "\n"));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/", { timeout: 180000 }); await P.waitForSelector("#ksAuth .box", { timeout: 120000 });
  await P.fill("#ksE", "trank" + process.pid + "@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 120000 }); await P.fill("#ksN", "Sim"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => setScreen("city"));
  const res = await P.evaluate(async () => {
    const ROSTER = Object.keys(HERO_DEFS).filter((k) => HERO_DEFS[k].conquestSkills && !HERO_DEFS[k].comingSoon);
    let rs = 99; const rnd = () => { rs = (rs * 1103515245 + 12345) & 0x7fffffff; return rs / 0x7fffffff; };
    const pick = (arr, n) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };
    const hs = {}; const ensure = (ck, k) => { if (HERO_DEFS[ck]) return; HERO_DEFS[ck] = HERO_DEFS[k];
      ["heroAttackSec", "heroNoHitScale", "heroAttackSlots", "skillStartsFull"].forEach((m) => { const M = COMBAT_TIMING[m]; if (M && M[k] !== undefined) M[ck] = M[k]; });
      if (typeof HERO_ANIMS !== "undefined") { if (HERO_ANIMS[k]) HERO_ANIMS[ck] = HERO_ANIMS[k]; if (HERO_ANIMS[k + "_skill"]) HERO_ANIMS[ck + "_skill"] = HERO_ANIMS[k + "_skill"]; } };
    ROSTER.forEach((k) => { hs[k] = { owned: true, level: 80, stars: 25, skillLevels: { conquest: [5, 5, 5], expedition: [5, 5, 5] } }; });
    const mkSim = (keys) => { const g = createGame({ mapSize: 3, seed: 1 }); keys.forEach((k) => { g.state.heroes[k] = hs[k]; }); return g; };
    // a side = list of players, each with 5 heroes (clone keys so the same hero can appear for several players)
    const buildSide = (players, sd, oppArmy, isP) => { const keys = [], army = {}; players.forEach((pl, pi) => pl.heroes.forEach((k) => { const ck = k + "__" + sd + pi; ensure(ck, k); hs[ck] = { owned: true, level: pl.lvl, stars: pl.stars, skillLevels: { conquest: [pl.sk, pl.sk, pl.sk], expedition: [pl.sk, pl.sk, pl.sk] } }; keys.push(ck); }));
      players.forEach((pl) => Object.keys(pl.troops).forEach((t) => { army[t] = (army[t] || 0) + pl.troops[t]; }));
      const bon = players[0].bonus || ZERO_BONUS; const st = arenaSideStats(keys, hs, 20, 0, isP, null, players[0].fort || {}, undefined, bon), lead = arenaSideStats(keys.slice(0, 5), hs, 20, 0, isP, null, players[0].fort || {}, undefined, bon);
      st.dmgMult = lead.dmgMult; st.maxHp = lead.maxHp; /* side-wide numbers come from the leader's 5, not all 75 */
      (st.heroHp || []).forEach((e) => { const ix = keys.indexOf(e.id) % 5; e.runL = arenaRunDist(400, 240, ix, isP); });
      worldPvpAddTroops(st, army, oppArmy, keys.slice(0, 5), mkSim(keys), 0, window.__sqrt ? WORLD_PVP_TROOP_SQRT_REF : 0); /* v1724: the real game code now (was a prototype patch) */
      return { st, keys, army }; };
    const fight = (A, D, seed) => { const armyA = {}, armyD = {}; A.forEach((p) => Object.keys(p.troops).forEach((t) => { armyA[t] = (armyA[t] || 0) + p.troops[t]; })); D.forEach((p) => Object.keys(p.troops).forEach((t) => { armyD[t] = (armyD[t] || 0) + p.troops[t]; }));
      const a = buildSide(A, "a", armyD, true), d = buildSide(D, "d", armyA, false);
      const L = { P: a.keys.slice(), A: d.keys.slice(), qP: a.keys.slice(5), qA: d.keys.slice(5), init: false, used: { P: Math.min(5, a.keys.length), A: Math.min(5, d.keys.length) } };
      window.__lineTick = (tick, pHH, aHH) => { [["P", pHH], ["A", aHH]].forEach(([sd, hh]) => { if (!hh) return; const q = L["q" + sd];
          if (!L.init) hh.list.forEach((e) => { if (q.includes(e.id)) { e.ko = true; e.hp = 0; e.reviveT = 1e9; e.bench = true; e.koTick = -1; } });
          hh.list.forEach((e) => { if (e.droid || e.bench || e.out || !e.ko || !(e.reviveT > 0 && e.reviveT < 1e8)) return; e.out = true; e.reviveT = 1e9;
            const nk = q.shift(); if (!nk) return; const n = hh.by[nk]; if (!n) return; n.bench = false; n.ko = false; n.hp = n.max; n.reviveT = 0; n.d = 0; n.runL = e.runL; L.used[sd]++; }); });
        L.init = true; };
      window.__chk = window.__chk || []; if (window.__chk.length < 1) { const z = {}; [1500, 3000, 12000, 48000].forEach((N) => { const s0 = { attackers: [], maxHp: 1, dmgMult: 1 }, s1 = { attackers: [], maxHp: 1, dmgMult: 1 }; const ar = { infantry: N }; worldPvpAddTroops(s0, ar, {}, [], mkSim([]), 0, 0); worldPvpAddTroops(s1, ar, {}, [], mkSim([]), 0, WORLD_PVP_TROOP_SQRT_REF); z[N] = [s0.attackers[0].dmg, s1.attackers[0].dmg, s0.maxHp, s1.maxHp]; }); window.__chk.push(z); }
      const sim = arenaMakeSim(a.st, d.st, { rng: worldPvpSeededRng(seed), critSeed: seed, maxTicks: ARENA_MAX_TICKS * 2, playerCannon: true, aiCannon: true });
      const w = sim.runToEnd(); window.__lineTick = null; return { w, ticks: sim.tick, used: L.used, hpA: sim.playerHp / a.st.maxHp, hpD: sim.aiHp / d.st.maxHp }; };
    const tier = (t, n) => (n <= 1 ? t : t + "_t" + n);
    const mkP = (lvl, stars, sk, tr, per, bonus) => { const troops = {}; ["infantry", "archer", "cavalry"].forEach((t) => { troops[tier(t, tr)] = per; }); return { heroes: pick(ROSTER, 5), lvl, stars, sk, troops, bonus: bonus || ZERO_BONUS }; };
    const out = { rows: [] }; const SEEDS = 12;
    const RALLY = () => { const A = []; for (let i = 0; i < 15; i++) A.push(mkP(40, 10, 3, 3, 1000)); return A; };
    const SOLOS = [
      ["Solo: Lv80 heroes, T10 troops, 3,000 troops", () => [mkP(80, 25, 5, 10, 1000)]],
      ["Solo: Lv80 heroes, T10 troops, 9,000 troops", () => [mkP(80, 25, 5, 10, 3000)]],
      ["Solo: Lv80, T10, 9,000 troops, +100% ATK/HP bonus", () => [mkP(80, 25, 5, 10, 3000, { atk: 100, hp: 100, def: 0, skill: 0 })]],
      ["Solo: Lv80, T10, 30,000 troops, +100% ATK/HP bonus", () => [mkP(80, 25, 5, 10, 10000, { atk: 100, hp: 100, def: 0, skill: 0 })]],
    ];
    for (const sq of [0, 1]) { window.__sqrt = !!sq;
      for (const [nm, mkS] of SOLOS) { let w = 0, n = 0, t = 0;
        for (let s2 = 0; s2 < SEEDS; s2++) { const r = fight(RALLY(), mkS(), "P" + sq + nm + s2); if (r.w === "player") w++; else if (r.w !== "ai") w += 0.5; n++; t += r.ticks; }
        out.rows.push({ troopMaths: sq ? "square-root" : "linear (now)", rally: "15 players: Lv40 heroes, T3 troops, 3,000 each (45,000)", defender: nm, rallyWins: Math.round(100 * w / n), avgSec: Math.round(t / n * ARENA_TICK_MS / 100) / 10 });
        await new Promise((r) => setTimeout(r, 0)); } }
    out.chk = window.__chk; out.maxSec = WORLD_PVP_MAX_TICKS * ARENA_TICK_MS / 1000; return out; });
  console.log("time limit", res.maxSec, "s"); console.log("troop dmg/HP check [linear dmg, sqrt dmg, linear HP, sqrt HP]", JSON.stringify(res.chk));
  res.rows.forEach((r) => console.log(JSON.stringify(r)));
  fs.writeFileSync(path.join(__dirname, "results", "rally_power.json"), JSON.stringify(res, null, 1));
  await b.close();
})();
