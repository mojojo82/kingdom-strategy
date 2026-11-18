/* after v1722 (Harley): hunt for overpowered builds WITHOUT Hanzo, Kessa, Baelgor or Iron Lily (they may sit on the opposing team).
   Cards: every PvP card except Critical Mass and Regen (Boss Slayer does nothing in PvP; Drop Signal needs summon weapons - no weapons here).
   Fortress tech: Fortress I / II / III trees at a mid spend (5M) and full (100M), filled in research order (same as f2_ladder.js).
   Engine: World PvP / PvP Simulator path (worldPvpBattle) with 0 troops = an Arena-style hero + fortress fight. Lv80, 25 stars, skills 5, no weapons.
   Each rate = SEEDS seeds x both orders (attack + defend). Stages:
     A  rank each hero in a base team (Gareth, Lyra, Sera, Torvald + X) - no cards
     B  every 5-hero team from the top 9 heroes, no cards, vs the meta team, mirror fortress
     C  greedy card search (add the best card, 5 times) for the top teams per fortress setup
     D  confirm the best builds with more seeds vs several opponents / opponent fortresses
   node dev/balance/op_builds.js [--seeds 10] [--top 6]   -> results/op_builds.json */
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "../..");
const args = process.argv.slice(2), arg = (k, d) => { const i = args.indexOf("--" + k); return i >= 0 ? args[i + 1] : d; };
const SEEDS = +arg("seeds", 10), TOP = +arg("top", 6), STAGE = arg("stage", "ABCD");
worker();
async function worker() {
  const { chromium } = require(process.env.PW_PATH || "playwright");
  const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
  const GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8"), FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8");
  const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
  const b = await chromium.launch({ args: ["--no-sandbox"] });
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 } });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.exposeFunction("__log", (s) => { process.stdout.write(s + "\n"); });
  await ctx.route(/mojojo82\.github\.io/, require(path.join(__dirname, "../tests/siteroute.js"))(GAME));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => process.stderr.write("PAGEERR " + e.message + "\n"));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/", { timeout: 180000 }); await P.waitForSelector("#ksAuth .box", { timeout: 120000 });
  await P.fill("#ksE", "opb" + process.pid + "@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 60000 }); await P.fill("#ksN", "Sim"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => setScreen("city"));
  P.setDefaultTimeout(0);
  const res = await P.evaluate(async ({ SEEDS, TOP, STAGE }) => {
    const log = (s) => window.__log(s);
    const EXCL = ["hanzo", "kessa", "ironlily", "baelgor"], HK = pvpSimHeroKeys(), POOL = HK.filter((k) => !EXCL.includes(k));
    const CARDS = ["#1", "#4", "#5", "#6", "#7", "#8", "#9", "#10", "#11", "#12", "#13", "#14", "#15", "cannon doctrine"];
    const CNAME = { "#1": "Infantry ATK +10%", "#4": "Last Bastion", "#5": "Polar Flux", "#6": "Type-1 Defence", "#7": "Super-burst dmg +10%", "#8": "Quick Study (cdr 5%)", "#9": "cdr +5% under 90%", "#10": "Overclock (+25% dmg if cdr>25%)", "#11": "Lone Wolf (solo +200%)", "#12": "Infantry HP +15%", "#13": "Cavalry ATK +15%", "#14": "Death Gerbils", "#15": "All HP +5%", "cannon doctrine": "Cannon Doctrine (F1 +70%)" };
    const cm = (cards) => { if (!cards || !cards.length) return null; const m = cardModsBlank(); cards.forEach((k) => { const fx = CARD_EFFECTS_BY_NAME[k]; m.any = true;
      if (["infAtk", "cavAtk", "infHp", "allHp", "t1Def", "critDmg", "cdr", "bossDmg", "t1Army"].includes(fx.kind)) m[fx.kind] += fx.pct || 0; else if (m.hasOwnProperty(fx.kind)) m[fx.kind] = fx; }); return m; };
    const fill = (tree, spend) => { const T = fortressTreeByType(tree), m = tree === 1 ? {} : { _type: tree }, keys = Object.keys(T).sort((a, b) => T[a].row - T[b].row || T[a].col - T[b].col); let left = spend;
      for (const k of keys) for (let l = 1; l <= T[k].maxLevel; l++) { const c = fortressNodeCost(k, l); if (c > left || !fortressNodeUnlocked(m, k)) return m; left -= c; m[k] = l; } return m; };
    const orig = pvpSimFortMap; window.pvpSimFortMap = (v) => (v && typeof v === "object") ? v : orig(v);
    const FORTS = { "F1 5M": fill(1, 5e6), "F2 5M": fill(2, 5e6), "F3 5M": fill(3, 5e6), "F1 full": fill(1, 100e6 + 1), "F2 full": fill(2, 100e6 + 1), "F3 full": fill(3, 100e6 + 1) };
    const mk = (fort, team) => { const c = pvpSimDefaultSide(true); c.fort = fort; c.th = 20; c.cannon = true; c.baseHp = 0; Object.keys(c.troops).forEach((t) => { c.troops[t] = 0; });
      HK.forEach((k) => { c.heroes[k] = { on: team.includes(k), level: 80, arms: 25, c: [5, 5, 5], e: [5, 5, 5] }; }); c.weapons = {}; return c; };
    const one = (ac, at, acm, dc, dt, dcm, seed) => { const a = pvpSimBuildSide(ac, false), d = pvpSimBuildSide(dc, true); a.heroKeys = at.slice(); d.heroKeys = dt.slice();
      const march = { id: 0, tileId: "sim", army: Object.assign({}, a.army), heroKeys: a.heroKeys };
      return worldPvpBattle(march, { army: d.army, heroKeys: d.heroKeys, sim: d.sim }, "sim", { atkSim: a.sim, seed: seed, defBaseHp: 0, atkBaseHp: 0, defCannon: true, atkCannon: true, defFort: ac === dc ? dc.fort : dc.fort, atkFort: ac.fort, atkCritRate: 0.2, defCritRate: 0.2, dmgRamp: null, regen: null, defDmgRamp: null, defRegen: null, atkWeapons: [], defWeapons: [], atkShieldPct: 0, defShieldPct: 0, cardMods: acm, defCardMods: dcm, summonCall: null }); };
    const okCards = (cards, fortKey) => cards.filter((k) => !(k === "cannon doctrine" && !/^F1/.test(fortKey)) && !(k === "#6" && !/^F1/.test(fortKey)));
    let N = 0;
    const rate = (team, cards, fk, opp, ofk, oppCards, seeds) => { seeds = seeds || SEEDS; const A = mk(FORTS[fk], team), D = mk(FORTS[ofk], opp), am = cm(okCards(cards || [], fk)), om = cm(okCards(oppCards || [], ofk)); let w = 0, n = 0;
      for (let s = 1; s <= seeds; s++) { let r = one(A, team, am, D, opp, om, "s" + s); if (r.win) w++; n++; r = one(D, opp, om, A, team, am, "s" + s); if (!r.win) w++; n++; } N += n; return Math.round(100 * w / n); };
    const OPP = { "Meta (Hanzo, Kessa, Iron Lily, Lyra, Sera)": ["hanzo", "kessa", "ironlily", "lyra", "sera"], "Hanzo team (Gareth, Lyra, Kessa, Sera, Hanzo)": ["gareth", "lyra", "kessa", "sera", "hanzo"] };
    const META = OPP["Meta (Hanzo, Kessa, Iron Lily, Lyra, Sera)"];
    const out = { pool: POOL, forts: Object.keys(FORTS), cards: CNAME };
    const t0 = performance.now(); rate(["gareth", "lyra", "sera", "torvald", "aurek"], [], "F3 full", META, "F3 full", [], 2); log("speed: " + Math.round((performance.now() - t0) / 4) + " ms per fight");
    const sleep = () => new Promise((r) => setTimeout(r, 0));
    // A: hero ranking in a base team (base heroes rated on their own team with Aurek as the 5th slot)
    const BASE = ["gareth", "lyra", "sera", "torvald"];
    out.A = {}; for (const k of POOL) { const team = BASE.includes(k) ? BASE.concat(["aurek"]) : BASE.concat([k]); out.A[k] = rate(team, [], "F3 full", META, "F3 full", []); await sleep(); }
    const rankA = POOL.slice().sort((a, b) => out.A[b] - out.A[a]); log("A: " + rankA.map((k) => k + " " + out.A[k]).join(", "));
    // B: every 5-team from the top 9, no cards, mirror fortress (3 full trees), vs META
    const top9 = rankA.slice(0, 9), combos = []; const rec = (st, i) => { if (st.length === 5) { combos.push(st.slice()); return; } for (let j = i; j < top9.length; j++) { st.push(top9[j]); rec(st, j + 1); st.pop(); } }; rec([], 0);
    out.B = []; for (const t of combos) { const row = { team: t }; for (const fk of ["F1 full", "F2 full", "F3 full"]) row[fk] = rate(t, [], fk, META, fk, []); row.avg = Math.round((row["F1 full"] + row["F2 full"] + row["F3 full"]) / 3); out.B.push(row); await sleep(); }
    out.B.sort((a, b) => b.avg - a.avg); log("B top: " + out.B.slice(0, 8).map((r) => r.team.join("/") + " " + r.avg).join(" | "));
    // C: greedy card search for the top teams, per fortress setup (mirror opponent fortress, opponent no cards)
    const teamsC = out.B.slice(0, TOP).map((r) => r.team).concat([["aurek"], ["torvald"], ["roran"], ["halo7"], ["tom"]]); /* + solo builds for Lone Wolf */
    out.C = [];
    for (const t of teamsC) for (const fk of Object.keys(FORTS)) {
      let cur = [], best = rate(t, [], fk, META, fk, []); const base = best, steps = [];
      for (let step = 0; step < 5; step++) { let pick = null, pv = -1;
        for (const c of CARDS) { if (cur.includes(c)) continue; if (okCards([c], fk).length === 0) continue; if (c === "#11" && t.length > 2) continue; if (c === "#13" && !t.some((k) => HERO_DEFS[k].class === "cavalry")) continue;
          if ((c === "#1" || c === "#12") && !t.some((k) => HERO_DEFS[k].class === "infantry")) continue;
          const v = rate(t, cur.concat([c]), fk, META, fk, []); if (v > pv) { pv = v; pick = c; } }
        if (!pick || pv < best) break; cur.push(pick); best = pv; steps.push(CNAME[pick] + " -> " + pv + "%"); }
      out.C.push({ team: t, fort: fk, noCards: base, best: best, cards: cur.map((c) => CNAME[c]), keys: cur, steps }); log("C " + t.join("/") + " " + fk + ": " + base + "% -> " + best + "% with " + cur.map((c) => CNAME[c]).join(", ")); await sleep();
    }
    // D: confirm the 10 best builds with 2x seeds vs both opponents, opponent on each full fortress
    const bestC = out.C.slice().sort((a, b) => b.best - a.best).slice(0, 10); out.D = [];
    for (const r of bestC) { const row = { team: r.team, fort: r.fort, cards: r.cards, vs: {} };
      for (const on of Object.keys(OPP)) for (const ofk of ["F1 full", "F2 full", "F3 full"]) row.vs[on.split(" (")[0] + " on " + ofk] = rate(r.team, r.keys, r.fort, OPP[on], ofk, [], SEEDS * 2);
      const vals = Object.values(row.vs); row.avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length); out.D.push(row); log("D " + r.team.join("/") + " " + r.fort + " [" + r.cards.join(", ") + "]: avg " + row.avg + "% " + JSON.stringify(row.vs)); await sleep(); }
    out.fights = N; return out;
  }, { SEEDS, TOP, STAGE });
  fs.writeFileSync(path.join(__dirname, "results/op_builds.json"), JSON.stringify(res, null, 1));
  console.log("fights:", res.fights);
  await b.close();
}
