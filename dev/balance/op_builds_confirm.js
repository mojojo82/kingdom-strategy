/* after v1722 (Harley): hunt for overpowered builds WITHOUT Hanzo, Kessa, Baelgor or Iron Lily (they may sit on the opposing team).
   Cards: every PvP card except Critical Mass and Regen (Boss Slayer does nothing in PvP; Drop Signal needs summon weapons - no weapons here).
   Fortress tech: Fortress I / II / III trees at a mid spend (5M) and full (100M), filled in research order (same as f2_ladder.js).
   Engine: World PvP / PvP Simulator path (worldPvpBattle) with 0 troops = an Arena-style hero + fortress fight. Lv80, 25 stars, skills 5, no weapons.
   Each rate = SEEDS seeds x both orders (attack + defend). Stages:
     A  rank each hero in a base team (Gareth, Lyra, Sera, Torvald + X) - no cards
     B  every 5-hero team from the top 9 heroes, no cards, vs the meta team, mirror fortress
     C  greedy card search (add the best card, 5 times) for the top teams per fortress setup
     D  confirm the best builds with more seeds vs several opponents / opponent fortresses
   node dev/balance/op_builds.js [--seeds 10] [--top 6]   -> results/op_builds_confirm.json */
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
    // E: confirm the suspects. Opponent = Meta team with and without Kessa's cards (#3 Kessa ATK +200%, #2 Arc Burst, #8, #9, #15). 30 seeds x both orders.
    const KC = ["#3", "#2", "#8", "#9", "#15"], S2 = 30;
    const OPPS = [["Meta, no cards", META, []], ["Meta + Kessa cards", META, KC], ["Hanzo team + Kessa cards", OPP["Hanzo team (Gareth, Lyra, Kessa, Sera, Hanzo)"], KC]];
    const HALO = ["halo7", "bram", "lyra", "sera", "juno"], PLAIN = ["gareth", "lyra", "sera", "torvald", "aurek"];
    const BUILDS = [
      ["Halo team, no cards", HALO, []],
      ["Halo team + Polar Flux + Last Bastion only", HALO, ["#5", "#4"]],
      ["Halo team + best 5 (Inf ATK, Last Bastion, Polar Flux, Super-burst, Quick Study)", HALO, ["#1", "#4", "#5", "#7", "#8"]],
      ["Halo team + 5 without Polar Flux (Inf ATK, Inf HP, All HP, Super-burst, Quick Study)", HALO, ["#1", "#12", "#15", "#7", "#8"]],
      ["Plain team (Gareth, Lyra, Sera, Torvald, Aurek), no cards", PLAIN, []],
      ["Plain team + Polar Flux + Last Bastion only", PLAIN, ["#5", "#4"]],
      ["Solo Aurek + Lone Wolf, Super-burst, Polar Flux, Last Bastion, Inf ATK", ["aurek"], ["#11", "#7", "#5", "#4", "#1"]],
      ["Solo Halo-7 + same 5", ["halo7"], ["#11", "#7", "#5", "#4", "#1"]],
      ["Solo Aurek + Lone Wolf only", ["aurek"], ["#11"]],
      ["Halo team + Cannon Doctrine, Type-1 Defence, Inf ATK, Last Bastion, Polar Flux", HALO, ["cannon doctrine", "#6", "#1", "#4", "#5"]],
    ];
    out.E = [];
    for (const [bn, team, cards] of BUILDS) for (const fk of ["F1 full", "F2 full", "F3 full"]) { const row = { build: bn, fort: fk, vs: {} };
      for (const [on, ot, oc] of OPPS) row.vs[on] = rate(team, cards, fk, ot, fk, oc, S2);
      out.E.push(row); log("E " + bn + " | " + fk + " (opp same fort): " + JSON.stringify(row.vs)); await sleep(); }
    // F: fortress trees head to head at equal (full) spend, same team both sides, no cards
    out.F = [];
    for (const team of [HALO, PLAIN, META]) for (const fa of ["F1 full", "F2 full", "F3 full"]) for (const fb of ["F1 full", "F2 full", "F3 full"]) { if (fa >= fb) continue;
      const v = rate(team, [], fa, team, fb, [], S2); out.F.push({ team: team.join("/"), a: fa, b: fb, aWins: v }); log("F " + team.join("/") + ": " + fa + " vs " + fb + " -> " + fa + " wins " + v + "%"); }
    // G: same at 5M
    for (const team of [HALO, META]) for (const fa of ["F1 5M", "F2 5M", "F3 5M"]) for (const fb of ["F1 5M", "F2 5M", "F3 5M"]) { if (fa >= fb) continue;
      const v = rate(team, [], fa, team, fb, [], S2); out.F.push({ team: team.join("/"), a: fa, b: fb, aWins: v }); log("G " + team.join("/") + ": " + fa + " vs " + fb + " -> " + fa + " wins " + v + "%"); }
    out.fights = N; return out;
  }, { SEEDS, TOP, STAGE });
  fs.writeFileSync(path.join(__dirname, "results/op_builds_confirm.json"), JSON.stringify(res, null, 1));
  console.log("fights:", res.fights);
  await b.close();
}
