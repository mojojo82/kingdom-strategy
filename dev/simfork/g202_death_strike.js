/* v954: Death Strike (Gareth's limit skill) - same rule in Conquest and Arena. Run: node dev/simfork/g202_death_strike.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const OUT = process.env.OUT || "/tmp/";
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "g202@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Gar"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const r = await P.evaluate(() => {
    const out = {}, L = HERO_DEFS.gareth.conquestSkills[1]; out.def = L && L.kind === "limit" && L.name === "Death Strike";
    /* Conquest: fill by swings + hits taken; a full bar cleaves the nearest enemies, finishes the weak ones, never a boss */
    let t = 1000; const sim = createGame({ now: () => t, mapSize: 5, seed: 1, combatSeed: 9 }); const s = sim.state;
    s.heroes.gareth.level = 20; s.heroes.gareth.skillLevels = { conquest: [1, 5, 1], expedition: [1, 1, 1] }; s.conquestRoster = ["gareth", "lyra"];
    let filled = false; for (let i = 0; i < 400 && !filled; i++) { t += 1000; sim.tick(); filled = (s.idle.limitFires || 0) > 0; }
    out.cqFired = filled;
    s.idle.limit = { gareth: 0 }; sim.idleKoHero("gareth"); out.koEmpties = s.idle.limit.gareth === 0;
    return out;
  });
  console.log("engine:", JSON.stringify(r));
  assert.ok(r.def && r.cqFired && r.koEmpties, JSON.stringify(r));
  const r2 = await P.evaluate(() => {
    /* direct check of the cleave rule on a staged field (Conquest) */
    let t = 1000; const sim = createGame({ now: () => t, mapSize: 5, seed: 1, combatSeed: 9 }); const s = sim.state;
    s.heroes.gareth.level = 1; s.heroes.gareth.skillLevels = { conquest: [1, 5, 1], expedition: [1, 1, 1] }; s.conquestRoster = ["gareth"];
    for (let i = 0; i < 5; i++) { t += 1000; sim.tick(); }
    const mkE = (id, hp, mx) => ({ id, type: "infantry", hp, maxHp: mx, def: 0, arrived: true, engaged: true, arriveRemaining: 0, closeRemaining: 0, aliveSeconds: 5, atkCooldown: 9, hitCount: 0 });
    s.idle.enemies.unshift(mkE(9001, 50, 50), mkE(9002, 1e6, 1e6)); const live = s.idle.enemies.slice(0, 2);
    live[0].hp = live[0].maxHp * 0.2; live[1].hp = live[1].maxHp; const id0 = live[0].id, id1 = live[1].id, hp1 = live[1].hp;
    s.idle.limit = { gareth: HERO_DEFS.gareth.conquestSkills[1].hitsToFill }; const f0 = s.idle.limitFires || 0; s.heroCooldowns.gareth = 0.5; s.idle.skillAuto = false; t += 1000; sim.tick(); const manualWaits = (s.idle.limitFires || 0) === f0; /* v961: Manual mode - it waits for the Shield Slam tap */ s.idle.skillCast = { gareth: true }; t += 1000; sim.tick();
    const e1 = s.idle.enemies.find((e) => e.id === id1);
    return { staged: true, manualWaits, fired: (s.idle.limitFires || 0) === f0 + 1, weakGone: !s.idle.enemies.some((e) => e.id === id0 && e.hp > 0), strongHit: !e1 || e1.hp < hp1, emptied: s.idle.limit.gareth < HERO_DEFS.gareth.conquestSkills[1].hitsToFill };
  });
  console.log("cleave:", JSON.stringify(r2)); assert.ok(r2.staged && r2.manualWaits && r2.fired && r2.weakGone && r2.strongHit && r2.emptied, JSON.stringify(r2));
  const r3 = await P.evaluate(() => {
    /* Arena: same rule - full bar in reach finishes an enemy hero under 30%, hits the others */
    const hs = {}; ["gareth", "lyra", "torvald", "roran"].forEach((k) => { hs[k] = { owned: true, level: 40, stars: 10, skillLevels: { conquest: [3, 3, 3], expedition: [3, 3, 3] } }; });
    const mk = (ro, isP) => { const st = arenaSideStats(ro, hs, 20, arenaBaseHpPlayer * 50, false, null, null, undefined, ZERO_BONUS); (st.heroHp || []).forEach((e) => { e.runL = arenaRunDist(400, 240, ro.indexOf(e.id), isP); }); return st; };
    const sim = arenaMakeSim(mk(["gareth", "lyra"], true), mk(["torvald", "roran"], false), { rng: worldPvpSeededRng("ds"), critSeed: "ds" });
    let r, met = false; for (let i = 0; i < 120 && !met; i++) { r = sim.step(); const g = sim.pHH.by.gareth; met = g.reach && !g.ko; }
    if (!met) return { met: false };
    const g = sim.pHH.by.gareth, tv = sim.aHH.by.torvald; let fired = false; for (let k = 0; k < 40 && !fired; k++) { if (!tv.ko) tv.hp = tv.max * 0.2; g.lim = g.limMax; r = sim.step(); fired = !!(r.info.limitTargets && r.info.limitTargets.p_gareth); if (g.ko) break; } /* v961: fires with his next Shield Slam */
    return { met: true, limitStats: !!(sim.pHH.by.gareth.limMax), fired: !!(r.info.limitTargets && r.info.limitTargets.p_gareth), torvaldKo: tv.ko, emptied: g.lim < g.limMax, shownBar: (r.info.playerHeroes.find((e) => e.id === "gareth") || {}).lim != null };
  });
  console.log("arena:", JSON.stringify(r3)); assert.ok(r3.met && r3.fired && r3.torvaldKo && r3.emptied && r3.shownBar, JSON.stringify(r3));
  /* the skill card + the bar on screen */
  await P.evaluate(() => { game.state.heroes.gareth.skillLevels = { conquest: [1, 1, 1], expedition: [1, 1, 1] }; game.state.idle.limit = { gareth: HERO_DEFS.gareth.conquestSkills[1].hitsToFill - 6 }; setScreen("conquest"); });
  await P.waitForTimeout(2500); await P.screenshot({ path: OUT + "g202_conquest.png" });
  const card = await P.evaluate(() => { const d = document.createElement("div"); renderHeroSkillsTabCombat(d, "gareth", HERO_DEFS.gareth, game.state.heroes.gareth); return d.textContent; });
  assert.ok(/Death Strike/.test(card) && /LIMIT/.test(card) && /2 targets/.test(card), card.slice(0, 300));
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
