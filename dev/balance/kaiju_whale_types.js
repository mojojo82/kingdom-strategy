/* v1605: kaiju whale damage per fortress type (I / II / III, each tree maxed), 5 seeds, everything else maxed (10 Legendary equipment avg roll, all buildings / research, heroes Lv80 5* skills 5). Run: PW_PATH=playwright CHROME_PATH=... node dev/balance/kaiju_whale_types.js */
const fs = require("fs"), path = require("path");
const ROOT = require("path").join(__dirname, "../.."), OUTD = __dirname + "/results";
const { chromium } = require("playwright");
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, require(path.join(ROOT, "dev/tests/siteroute.js"))(GAME));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/", { timeout: 120000 }); await P.waitForSelector("#ksAuth .box", { timeout: 120000 });
  await P.fill("#ksE", "wh" + Date.now() + "@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 120000 }); await P.fill("#ksN", "Whale"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  const info = await P.evaluate(() => JSON.stringify(Object.keys(HERO_DEFS).filter((k) => !HERO_DEFS[k].comingSoon).map((k) => k + ":" + HERO_DEFS[k].rarity)));
  console.log("heroes", info);
  await P.evaluate(() => { kaijuFightOpen(true); });
  await P.waitForTimeout(2000);
  const res = await P.evaluate(() => {
    const S = game.state, out = [];
    Object.keys(BUILDING_DEFS).forEach((k) => { S.buildings[k].level = BUILDING_DEFS[k].maxLevel; S.buildings[k].upgrading = null; });
    Object.keys(TECH_DEFS).forEach((k) => { S.tech[k] = TECH_DEFS[k].maxLevel || 99; });
    S.fortressTech = S.fortressTech || {}; Object.keys(FORTRESS1_TREE).forEach((k) => { S.fortressTech[k] = FORTRESS1_TREE[k].maxLevel; });
    Object.keys(HERO_DEFS).forEach((k) => { const d = HERO_DEFS[k]; if (d.comingSoon) return; const h = S.heroes[k] || (S.heroes[k] = {}); h.owned = true; h.level = HERO_MAX_LEVEL; h.stars = STAR_MAX_ARMS; h.skillLevels = { conquest: [5, 5, 5], expedition: [5, 5, 5] }; });
    S.weaponFrags = S.weaponFrags || {}; S.weaponLevels = S.weaponLevels || {}; WEAPON_DEFS.forEach((w) => { if (!w.visualOnly) S.weaponFrags[w.id] = 1; });
    S.equipment.slots = []; for (let i = 0; i < 10; i++) S.equipment.slots.push({ rarity: "Legendary", atk: 32.8, hp: 0, def: 0, sec: [] });
    const B0 = kaijuBR();
    function fight(team, wl, sword, active, seed) {
      S.conquestRoster = team.slice(); S.equippedWeapons = wl > 0 ? ["missile_barrage", "laser_beam", "railgun"] : []; ["missile_barrage", "laser_beam", "railgun"].forEach((id) => { S.weaponLevels[id] = wl || 1; });
      S.training.atk = S.training.hp = S.training.def = sword; try { recomputeEquipBonus && recomputeEquipBonus(); } catch (e) {}
      const p = arenaPlayerRosterAndHeroes(), ps = arenaSideStats(p.roster, p.heroes, S.buildings.townhall.level, arenaBaseHpPlayer, true);
      try { const rcv = document.getElementById("arenaCanvas"), rdpr = canvasDPR(), rw = Math.round(rcv.width / rdpr), rh = Math.round(rcv.height / rdpr) - arenaSkyPx(); if (rw > 100) (ps.heroHp || []).forEach((e) => { const ix = p.roster.indexOf(e.id); if (ix >= 0) e.runL = arenaRunDist(rw, rh, ix, true); }); } catch (e) {}
      const o = Object.assign({ salvoP: salvoSpec(S.equippedWeapons, function (wd) { return game.weaponLevelStats(wd); }), dmgRamp: equippedDmgRamp(S), regen: equippedRegen(S), summonCall: equippedSummonCall(S), cardMods: cardModsFrom(S), weapons: arenaPlayerWeaponsForSim(), shieldPct: arenaPlayerShieldPct() }, { rng: worldPvpSeededRng("wh" + seed), critSeed: "wh" + seed, boss: active ? kaijuBossCfg() : { passive: true }, aiCannon: false, aiWeapons: [], maxTicks: kaijuTicks() });
      const sim = arenaMakeSim(ps, kaijuAiStats(KAIJU_INF), o); sim.runToEnd();
      return { dmg: Math.round(KAIJU_INF - sim.aiHp), alive: sim.playerHp > 0, hp: Math.round(ps.maxHp), power: Math.round(game.governorPower()) };
    }
    out.push({ eq: S.equipment.slots.length + "x " + S.equipment.slots[0].rarity + " atk " + S.equipment.slots[0].atk });
    [1, 2, 3].forEach((ft) => { const T = fortressTreeByType(ft); S.fortressTech = { _type: ft }; Object.keys(T).forEach((k) => { S.fortressTech[k] = T[k].maxLevel; });
      [["hanzo", "kessa", "roran", "caelum", "halo7"], ["gareth", "lyra", "roran", "kessa", "sera"]].forEach((team) => {
        [[0, 0], [50, 0], [50, 300]].forEach(([wl, sw]) => { const r = [0, 1, 2, 3, 4].map((s) => fight(team, wl, sw, false, "ft" + ft + team[0] + wl + sw + s)); const a = fight(team, wl, sw, true, "ftA" + ft + wl + sw);
          out.push({ ft, team: team[0] === "hanzo" ? "Hanzo+4 Leg" : "Balance five", wl, sw, dmg: Math.round(r.reduce((x, y) => x + y.dmg, 0) / r.length), min: Math.min.apply(null, r.map((x) => x.dmg)), max: Math.max.apply(null, r.map((x) => x.dmg)), fortHp: a.hp, alive: a.alive }); }); }); });
    return out;
  });
  res.forEach((r) => console.log(JSON.stringify(r)));
  console.log("errs", errs.slice(0, 4)); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
