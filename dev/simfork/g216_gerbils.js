/* v990: card 14 Death Gerbils + card 15 (+5% HP heroes and summons), Conquest + Arena. Run: node dev/simfork/g216_gerbils.js */
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
  await P.fill("#ksE", "g216@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Emp"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const r = await P.evaluate(async () => {
    const o = {}, FIVE = ["gareth", "lyra", "roran", "kessa", "sera"];
    /* Conquest climb with / without the gerbil card */
    const run = async (cards, lvl) => { lvl = lvl || 40;
      let simTime = 1000; const sim = createGame({ now: () => simTime, mapSize: 5, seed: 1, combatSeed: 777 }); const s = sim.state;
      Object.keys(s.heroes).forEach((k) => { s.heroes[k].owned = false; });
      FIVE.forEach((k) => { const h = s.heroes[k]; h.owned = true; h.level = lvl; h.stars = lvl >= 40 ? 10 : 0; h.skillLevels = { conquest: [3, 3, 3], expedition: [3, 3, 3] }; });
      s.conquestRoster = FIVE.slice(); s.weaponLevels = { missile_barrage: 30 }; s.equippedWeapons = ["missile_barrage"]; s.tech = {}; s.fortressTech = {};
      s.cards = []; s.equippedCards = cards; s.idle.fortressCannonEnabled = true; s.idle.fortressCannonTargetMode = "front";
      let maxAlive = 0, gerbMax = 0;
      for (let i = 0; i < 6000; i++) { simTime += 1000; sim.tick(); const C = s.idle.clones || {}; const alive = Object.keys(C).filter((k) => C[k].gerbil && C[k].hp > 0).length; if (alive > maxAlive) maxAlive = alive; Object.keys(C).forEach((k) => { if (C[k].gerbil) gerbMax = Math.max(gerbMax, C[k].max); }); if (i % 1000 === 0) await new Promise((res) => setTimeout(res, 0)); }
      return { level: (s.idle.chapter - 1) * 20 + s.idle.levelNum, gerbils: s.idle.gerbils || 0, dmg: Math.round(s.idle.gerbDmg || 0), maxAlive, gerbMax: Math.round(gerbMax), heroMax: Math.round(sim.idleHeroMaxHp("gareth")) };
    };
    o.cqNone = await run([]); o.cqGerb = await run([13]); o.cqHp = await run([14]);
    /* Arena */
    const st = game.state, eq = (slots) => { st.equippedCards = slots; return slots ? cardModsFrom(st) : null; };
    const hs = {}; FIVE.forEach((k) => { hs[k] = { owned: true, level: 40, stars: 10, skillLevels: { conquest: [3, 3, 3], expedition: [3, 3, 3] } }; });
    const side = (isP) => { const s2 = arenaSideStats(FIVE, hs, 15, 0, false, null, null, undefined, ZERO_BONUS); (s2.heroHp || []).forEach((e) => { e.runL = arenaRunDist(400, 240, FIVE.indexOf(e.id), isP); }); return s2; };
    const ar = (slots, ticks, cloneW) => { const tr = { src: {}, aiSrc: {}, perTick: [] }; const cm = eq(slots), pl = side(true), ai = side(false); pl.maxHp *= 50; ai.maxHp *= 50;
      const ws = cloneW ? [simSpecOf(WEAPON_DEFS_BY_ID.clone_task, game.weaponStatsAtLevel(WEAPON_DEFS_BY_ID.clone_task, 30), 0)] : [];
      const sim = arenaMakeSim(pl, ai, { rng: worldPvpSeededRng("g"), critSeed: "g", cardMods: cm, weapons: ws, maxTicks: ticks + 5, trace: tr }); let x;
      for (let i = 0; i < ticks; i++) x = sim.step();
      const gl = sim.pHH.list.filter((e) => e.gerbil), cl = sim.pHH.list.filter((e) => e.droid && !e.gerbil), g0 = sim.pHH.by.gareth;
      return { aiHp: Math.round(x.info.aiHp), gerbils: sim.fxState.P.gerbils || 0,  alive: gl.filter((e) => !e.ko && !e.dead).length, aiKos: sim.aHH.list.reduce((t, e) => t + e.kos, 0), aiGerbils: sim.fxState.A.gerbils || 0, gMax: gl[0] ? Math.round(gl[0].max) : 0, heroMax: Math.round(g0.max), avgHero: Math.round(sim.pHH.list.filter((e) => !e.droid).reduce((t, e) => t + e.max, 0) / 5), cloneMax: cl[0] ? Math.round(cl[0].max) : 0, link: sim.fxState.P.inst.some((y) => y.k === "clone") };
    };
    const T = Math.round(30 / (ARENA_TICK_MS / 1000)); /* 30 s */
    o.arNone = ar(null, T); o.arGerb = ar([13], T); o.arHp = ar([14], T); o.arCl = ar(null, T, true); o.arClHp = ar([14], T, true); o.arBoth = ar([13, 14], T);
    eq([]);
    return o;
  });
  console.log(JSON.stringify(r));
  const A = assert;
  A.ok(r.cqNone.gerbils === 0 && r.cqGerb.gerbils > 5 && r.cqGerb.dmg > 0, "Conquest: gerbils only with card 14, they spawn and fight");
  A.ok(r.cqGerb.maxAlive >= 2, "Conquest: no cap - several alive at once");
  A.ok(r.cqGerb.level >= r.cqNone.level, "Conquest: gerbils help the climb");
  A.ok(Math.abs(r.cqHp.heroMax / r.cqNone.heroMax - 1.05) < 0.01, "Conquest: card 15 hero +5% HP");
  A.ok(r.arNone.gerbils === 0 && r.arGerb.gerbils === 6 && r.arGerb.aiGerbils === 0, "Arena: one gerbil every 5 s (30 s = 6), only the card owner");
  A.ok(Math.abs(r.arGerb.gMax / r.arGerb.avgHero - 0.5) < 0.01, "Arena: gerbil HP = 50% of the average hero");
  A.ok(Math.abs(r.arHp.heroMax / r.arNone.heroMax - 1.05) < 0.01, "Arena: card 15 hero +5% HP");
  A.ok(r.arCl.cloneMax > 0 && Math.abs(r.arClHp.cloneMax / r.arCl.cloneMax - 1.05) < 0.01, "Arena: card 15 clone +5% HP");
  A.ok(Math.abs(r.arBoth.gMax / r.arGerb.gMax - 1.05) < 0.01, "Arena: card 15 gerbil +5% HP");
  console.log("errs", errs); A.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
