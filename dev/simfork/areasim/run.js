/* Conquest progression sims: brand-new player, then one area upgraded at a time. Engine-only (createGame), 1 tick = 1 s.
   Wall = no new level for STABLE ticks. Usage: node run.js [scenarioFilter] */
const boot = require("./boot");
const FILTER = process.argv[2] || "", SEEDS = +(process.env.SEEDS || 3), STABLE = +(process.env.STABLE || 20000), MAXT = +(process.env.MAXT || 300000);
(async () => {
  const { b, P } = await boot("sim" + Date.now() + "@test.dev");
  await P.evaluate(() => { setScreen("city"); });
  const out = await P.evaluate(async ({ FILTER, SEEDS, STABLE, MAXT }) => {
    const COMBAT = ["gareth", "lyra", "roran", "kessa", "sera", "torvald"];
    const W3 = ["missile_barrage", "laser_beam", "railgun"];
    function newPlayer(sim) { /* exactly what a fresh signup has */
      const s = sim.state;
      COMBAT.forEach((k) => { s.heroes[k].owned = false; s.heroes[k].level = 0; s.heroes[k].stars = 0; s.heroes[k].skillLevels = { conquest: [1, 1, 1], expedition: [1, 1, 1] }; });
      ["gareth", "lyra"].forEach((k) => { s.heroes[k].owned = true; s.heroes[k].level = 1; });
      s.conquestRoster = ["gareth", "lyra"]; s.equippedWeapons = []; s.weaponLevels = {}; s.tech = {}; s.fortressTech = {};
      Object.keys(s.buildings).forEach((k) => { s.buildings[k].level = k === "townhall" ? 1 : 0; });
      s.equippedEsper = null; s.idle.fortressCannonEnabled = true; s.idle.fortressCannonTargetMode = "front";
      setEquipBonus({});
    }
    function heroes(sim, keys, lvl, sk, arms) { keys.forEach((k) => { const h = sim.state.heroes[k]; h.owned = true; h.level = lvl; h.stars = arms; h.skillLevels = { conquest: [sk, sk, sk], expedition: [sk, sk, sk] }; }); sim.state.conquestRoster = keys.slice(0, 5); }
    function weapons(sim, ids, lvl) { ids.forEach((id) => { sim.state.weaponLevels[id] = lvl; }); sim.state.equippedWeapons = ids.slice(); }
    function buildingsMax(sim) { Object.keys(sim.state.buildings).forEach((k) => { sim.state.buildings[k].level = BUILDING_DEFS[k].maxLevel; }); }
    function researchMax(sim, frac) { Object.keys(TECH_DEFS).forEach((k) => { sim.state.tech[k] = Math.round((TECH_DEFS[k].maxLevel || 10) * frac); }); const m = fortressMaxMap(1); Object.keys(m).forEach((k) => { m[k] = Math.round(m[k] * frac); }); sim.state.fortressTech = m; }
    function equipSet(r) { /* 10 worn pieces of rarity r, average rolls */
      const MB = [1, 1.6, 2.5, 3.8, 5.5, 8], SB = [0, 0, 2, 3, 4.5, 6], SL = [0, 0, 1, 1, 2, 2], sec = Math.min(75, SL[r] * SB[r] * 10 / 3);
      return { atk: MB[r] * 10, hp: MB[r] * 10, def: MB[r] * 0.6 * 10, skill: sec, boss: sec, support: sec };
    }
    const FIVE = ["gareth", "lyra", "roran", "kessa", "sera"];
    const S = [
      ["0 New player (nothing upgraded)", () => {}],
      ["H1 Heroes: Gareth+Lyra Lv20, skills 2", (s) => heroes(s, ["gareth", "lyra"], 20, 2, 0)],
      ["H2 Heroes: 5 heroes Lv40, skills 3, 2 stars", (s) => heroes(s, FIVE, 40, 3, 10)],
      ["H3 Heroes: 5 heroes Lv80, skills 5, 5 stars (max)", (s) => heroes(s, FIVE, 80, 5, 25)],
      ["W1 Weapons: missiles+laser+railgun Lv1", (s) => weapons(s, W3, 1)],
      ["W2 Weapons: same 3 at Lv10", (s) => weapons(s, W3, 10)],
      ["W3 Weapons: same 3 at Lv25", (s) => weapons(s, W3, 25)],
      ["W4 Weapons: same 3 at Lv50 (max)", (s) => weapons(s, W3, 50)],
      ["B1 Buildings: every building max", (s) => buildingsMax(s)],
      ["R1 Buildings max + research half", (s) => { buildingsMax(s); researchMax(s, 0.5); }],
      ["R2 Buildings max + research max", (s) => { buildingsMax(s); researchMax(s, 1); }],
      ["E1 Equipment: 10x Common", (s) => setEquipBonus(equipSet(0))],
      ["E2 Equipment: 10x Elite", (s) => setEquipBonus(equipSet(2))],
      ["E3 Equipment: 10x Epic", (s) => setEquipBonus(equipSet(4))],
      ["E4 Equipment: 10x Legendary (max)", (s) => setEquipBonus(equipSet(5))],
      ["X Everything max (reference)", (s) => { heroes(s, FIVE, 80, 5, 25); weapons(s, W3, 50); buildingsMax(s); researchMax(s, 1); setEquipBonus(equipSet(5)); }]
    ].filter((x) => x[0].indexOf(FILTER) === 0 || !FILTER);
    const res = [];
    for (const [name, setup] of S) {
      const trials = [];
      for (let t = 0; t < SEEDS; t++) {
        let simTime = 1000; const sim = createGame({ now: () => simTime, mapSize: 5, seed: 1, combatSeed: 500000 + t * 104729 });
        newPlayer(sim); setup(sim);
        let last = sim.idleLevelLabel(), lastAt = 0, i = 0, firstBossFail = null; const t0 = performance.now(); const marks = {};
        for (; i < MAXT; i++) {
          simTime += 1000; sim.tick();
          const L = sim.idleLevelLabel(); if (L !== last) { last = L; lastAt = i; const ch = sim.state.idle.chapter; if (!marks[ch]) marks[ch] = Math.round(i / 360) / 10; }
          if (i - lastAt > STABLE) break;
          if (i % 5000 === 0) await new Promise((r) => setTimeout(r, 0));
        }
        trials.push({ label: last, gl: (sim.state.idle.chapter - 1) * 20 + sim.state.idle.levelNum, hrs: Math.round(lastAt / 360) / 10, stable: i - lastAt > STABLE, resets: sim.state.idle.resetCount, ms: Math.round(performance.now() - t0), chHrs: marks, power: Math.round(sim.idlePower ? sim.idlePower() : 0) });
      }
      setEquipBonus({});
      trials.sort((a, b) => a.gl - b.gl);
      res.push({ name, trials });
      console.log("done", name);
    }
    return res;
  }, { FILTER, SEEDS, STABLE, MAXT });
  for (const r of out) console.log(JSON.stringify(r));
  await b.close();
})();
