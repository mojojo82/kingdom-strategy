/* v985: Harley's cards 1-11 work (Conquest + Arena). Run: node dev/simfork/g215_card_effects.js */
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
  await P.fill("#ksE", "g215@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Emp"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.waitForTimeout(1500);
  const r = await P.evaluate(() => {
    const o = {}, st = game.state, FIVE = ["gareth", "lyra", "roran", "kessa", "sera"];
    FIVE.forEach((k) => { const h = st.heroes[k]; h.owned = true; h.level = 40; h.stars = 10; h.skillLevels = { conquest: [3, 3, 3], expedition: [3, 3, 3] }; }); st.conquestRoster = FIVE.slice();
    const eq = (slots) => { st.equippedCards = slots; return cardModsFrom(st); };
    /* Conquest-side checks through the real game state */
    eq([]); const g0 = game.idleAttackerDamage("gareth"), k0 = game.idleAttackerDamage("kessa");
    eq([0]); o.c1 = +(game.idleAttackerDamage("gareth") / g0).toFixed(3); o.c1lyra = game.idleAttackerDamage("lyra") === (eq([]), game.idleAttackerDamage("lyra"));
    st.idle.playerHp = game.idlePlayerMaxHp() * 0.4; eq([2]); o.c3 = +(game.idleAttackerDamage("kessa") / k0).toFixed(3); st.idle.playerHp = game.idlePlayerMaxHp();
    eq([2]); o.c3full = +(game.idleAttackerDamage("kessa") / k0).toFixed(3);
    eq([10]); o.c11five = +(game.idleAttackerDamage("gareth") / g0).toFixed(5); st.conquestRoster = ["gareth"]; eq([]); const g1 = game.idleAttackerDamage("gareth"); eq([10]); o.c11one = +(game.idleAttackerDamage("gareth") / g1).toFixed(3); st.conquestRoster = FIVE.slice();
    o.c11zeroBonus = cardSoloBonus(eq([10]), 0);
    eq([]); const r0 = game.idleAttackerDamage("roran"), gh0 = game.idleHeroMaxHp("gareth"), rh0 = game.idleHeroMaxHp("roran"); eq([11]); o.c12 = +(game.idleHeroMaxHp("gareth") / gh0).toFixed(2); o.c12roran = game.idleHeroMaxHp("roran") === rh0; o.c12atk = game.idleAttackerDamage("gareth") === g0;
    eq([12]); o.c13 = +(game.idleAttackerDamage("roran") / r0).toFixed(3); o.c13gareth = game.idleAttackerDamage("gareth") === g0; o.c13arena = cardHeroDmgMul(cardModsFrom(st), "roran", 1, 5);
    /* Arena sims */
    const hs = {}; FIVE.forEach((k) => { hs[k] = { owned: true, level: 40, stars: 10, skillLevels: { conquest: [3, 3, 3], expedition: [3, 3, 3] } }; });
    const F1 = {}; Object.keys(FORTRESS1_TREE).forEach((k) => { F1[k] = FORTRESS1_TREE[k].maxLevel; }); let useF1 = false;
    const side = (isP) => { const s2 = arenaSideStats(FIVE, hs, 15, 0, false, null, useF1 ? F1 : null, undefined, ZERO_BONUS); (s2.heroHp || []).forEach((e) => { e.runL = arenaRunDist(400, 240, FIVE.indexOf(e.id), isP); }); return s2; };
    { const mx = (cm, id) => { const s12 = arenaMakeSim(side(true), side(false), { rng: worldPvpSeededRng("h"), critSeed: "h", cardMods: cm }); return s12.pHH ? s12.pHH.by[id].max : -1; }; const g0a = mx(null, "gareth"), r0a = mx(null, "roran"); const c12 = eq([11]); o.c12arena = +(mx(c12, "gareth") / g0a).toFixed(2); o.c12arenaRoran = mx(c12, "roran") === r0a; eq([]); }
    const run = (slots, aiStrong, tanky) => { const cm = slots ? eq(slots) : null; const tr = { src: {}, aiSrc: {}, perTick: [] };
      const ai = side(false), pl = side(true); if (aiStrong) ai.attackers.forEach((a) => { a.dmg *= 3; }); if (tanky) { ai.maxHp *= 500; pl.maxHp *= 500; }
      const sim = arenaMakeSim(pl, ai, { rng: worldPvpSeededRng("c"), critSeed: "c", cardMods: cm, trace: tr, maxTicks: tanky ? 800 : undefined });
      const hp = []; let x; do { x = sim.step(); hp.push(x.info.playerHp); } while (!x.done);
      const skill = Object.keys(tr.src).filter((k) => /^skill:/.test(k)).reduce((a, k) => a + tr.src[k], 0);
      return { cannon: tr.src.cannon || 0, hp, skill, aiHp: (sim.aiHp || 0), flux: sim.cardFlux || 0, aiHeroes: x.info.aiHeroes, winner: x.winner, ticks: hp.length }; };
    const base = run(null, true), c4 = run([3], true), c5 = run([4], true), even = run(null, false, true), c8 = run([7], false, true), c9 = run([8], false, true);
    o.skillBase = Math.round(even.skill); const m9 = eq([8]); o.c9low = cardCdBonus(m9, 0.85); o.c9high = cardCdBonus(m9, 0.95); const m10 = { any: true, cdr: 0.3, cdrDmg: { over: 0.25, pct: 0.25 } }; o.c10 = cardHeroDmgMul(m10, "gareth", 1, 5); o.c10off = cardHeroDmgMul(Object.assign({}, m10, { cdr: 0.1 }), "gareth", 1, 5); o.skillC8 = Math.round(c8.skill); o.skillC9 = Math.round(c9.skill);
    /* card 4: after health first drops under 10%, the next 2s (4-5 ticks) take no damage */
    const m4 = c4.hp[0], i4 = c4.hp.findIndex((v) => v < m4 * 0.10 && v > 0); o.c4flat = i4 >= 0 && c4.hp.slice(i4, i4 + 4).every((v) => v === c4.hp[i4]); o.c4ticks = c4.ticks; o.baseTicks = base.ticks;
    o.c2 = +cardSkillMul(eq([1]), "kessa", 0.2, 5).toFixed(3); o.c2high = cardSkillMul(eq([1]), "kessa", 0.5, 5); const c6 = run([5], true); useF1 = true; const e7 = run(null, false, true), c7 = run([6], false, true); useF1 = false; o.c6 = Math.round(c6.hp[12]) > Math.round(base.hp[12]); o.c7 = Math.round(c7.cannon) > Math.round(e7.cannon); o.c7r = [Math.round(e7.cannon), Math.round(c7.cannon)]; useF1 = true; const sf = side(true); useF1 = false; o.f1 = { critRate: sf.critRate, critMult: sf.critMult, fortType: sf.fortType }; o.c5flux = c5.flux; const fi = c5.hp.findIndex((v, i) => i > 0 && c5.hp[i - 1] >= c5.hp[0] * 0.5 && v < c5.hp[0] * 0.5); o.c5drop = fi > 0 ? +((c5.hp[fi - 1] - c5.hp[fi]) / c5.hp[0]).toFixed(2) : null; const c45 = run([3, 4], true); o.c45 = c45.flux === 1; o.baseFlux = base.flux;
    const sd0 = side(true); o.dbg = { fortType: sd0.fortType, fortDef: sd0.fortDef, refAtk: sd0.refAtk, critRate: sd0.critRate, critMult: sd0.critMult, def1: defReduce(sd0.refAtk, sd0.fortDef), def13: defReduce(sd0.refAtk, sd0.fortDef * 1.3) };
    return o;
  });
  console.log(JSON.stringify(r));
  assert.ok(Math.abs(r.c1 - 1.1) < 0.01, "card 1: infantry +10% ATK"); assert.ok(r.c1lyra, "card 1 leaves ranged heroes alone");
  assert.ok(Math.abs(r.c3 - 3) < 0.01, "card 3: Kessa +200% ATK under 50% health"); assert.ok(Math.abs(r.c3full - 3) < 0.01, "card 3 (v988): always on, full health too");
  assert.ok(Math.abs(r.c12 - 1.15) < 0.01 && r.c12roran && r.c12atk, "card 12: infantry +15% max HP only"); assert.ok(Math.abs(r.c12arena - 1.15) < 0.01 && r.c12arenaRoran, "card 12: Arena infantry HP bars +15%, cavalry untouched");
  assert.ok(Math.abs(r.c13 - 1.15) < 0.01 && r.c13gareth && Math.abs(r.c13arena - 1.15) < 1e-9, "card 13: cavalry +15% (Conquest + Arena), not infantry");
  assert.ok(r.c11five >= 1 && r.c11five < 1.001, "card 11: almost nothing with 5 heroes"); assert.ok(Math.abs(r.c11one - 3) < 0.01, "card 11 (v988): +200% with 1 hero"); assert.strictEqual(r.c11zeroBonus, 2, "card 11: +200% with no heroes");
  assert.ok(r.skillC8 > r.skillBase, "card 8: faster skills -> more skill damage");
  assert.ok(r.c9low === 0.05 && r.c9high === 0, "card 9: +5% cooldown bonus only under 90% health");
  assert.ok(r.c10 === 1.25 && r.c10off === 1, "card 10: +25% hero damage only above 25% cooldown bonus");
  assert.ok(r.c4flat, "card 4: 2s with no fortress damage after dropping under 10%");
  assert.ok(r.c5flux === 1 && r.baseFlux === 0, "card 5: Polar Flux fires once");
  assert.ok(r.c5drop >= 0.3, "card 5: it hits your own fortress too (30%+ drop in that tick)"); assert.ok(r.c45, "cards 4+5 together");
  assert.ok(r.c2 === 1.3 && r.c2high === 1, "card 2: Arc Burst +30% only under 30% health");
  assert.ok(r.c6, "card 6: both on Type 1 -> fortress takes less damage");
  assert.ok(r.c7, "card 7: bigger super bursts -> more cannon damage (needs crit chance)");
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
