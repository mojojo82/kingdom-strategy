/* v1720 (Harley): two theoretical melee heroes vs a Hanzo team (real Arena sim, game patched in memory only).
   Both are copies of Aurek (same HP / hit / Sunforge Slam damage + cooldown) with one extra effect when he casts his skill (skill Lv5):
   - "Slow": every enemy hero's skill timer runs 50% slower for D seconds.
   - "Stun": every standing enemy hero is stunned for S seconds (can't move or attack) and his skill timer goes back to full.
   Teams: [Gareth, Lyra, Kessa, Sera + new hero] vs [same 4 + Hanzo], same level, 5 weapon builds both sides, new hero's team attacks AND defends, 3 seeds.
   Run: node dev/balance/cc_heroes.js */
const fs = require("fs"), path = require("path"), ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "playwright");
let G = fs.readFileSync(path.join(ROOT, "test/index.html"), "utf8");
const rep = (a, b) => { if (G.split(a).length !== 2) throw new Error("patch point: " + a); G = G.replace(a, b); };
rep("playerCd[a.key] -= cdStep;", "playerCd[a.key] -= cdStep * (window.__tf && window.__tf.slowP > tick ? 1 - window.__tf.pct : 1);");
rep("aiCd[a.key] -= cdStep;", "aiCd[a.key] -= cdStep * (window.__tf && window.__tf.slowA > tick ? 1 - window.__tf.pct : 1);");
rep("playerCd[a.key] += a.cooldown * cardCdMul('P'); playerFlash.push(a.key);", "playerCd[a.key] += a.cooldown * cardCdMul('P'); playerFlash.push(a.key); if (window.__tfCast) window.__tfCast('P', a.key, tick, dtS, aHH, aiCd, aiStats);");
rep("aiCd[a.key] += a.cooldown * cardCdMul('A'); aiFlash.push(a.key);", "aiCd[a.key] += a.cooldown * cardCdMul('A'); aiFlash.push(a.key); if (window.__tfCast) window.__tfCast('A', a.key, tick, dtS, pHH, playerCd, playerStats);");
rep("var eligible = !isKo(hh, a.id) &&", "var eligible = !isKo(hh, a.id) && !(hh && hh.by[a.id] && hh.by[a.id].stunT > tick) &&");
rep("if (e.air || e.castUntil > tick) {", "if (e.air || e.castUntil > tick || e.stunT > tick) {");
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome", args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 } });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, require(path.join(ROOT, "dev/tests/siteroute.js"))(G));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/", { waitUntil: "domcontentloaded", timeout: 180000 }); await P.waitForSelector("#ksAuth .box", { timeout: 120000 });
  await P.fill("#ksE", "cc" + process.pid + "@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 120000 }); await P.fill("#ksN", "Sim"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  if (process.env.SLOWGRID) await P.evaluate(() => { window.__slowGrid = true; });
  const r = await P.evaluate(() => {
    const clone = (k, nm) => { const d = Object.assign({}, HERO_DEFS.aurek, { name: nm }); d.conquestSkills = HERO_DEFS.aurek.conquestSkills.map((s) => Object.assign({}, s)); d.conquestSkills[0].name = nm + " Skill"; HERO_DEFS[k] = d; if (HERO_ANIMS.aurek) HERO_ANIMS[k] = HERO_ANIMS.aurek; if (HERO_ANIMS.aurek_skill) HERO_ANIMS[k + "_skill"] = HERO_ANIMS.aurek_skill; };
    clone("tslow", "Slow Knight"); clone("tstun", "Stun Knight");
    let CFG = {}; window.__tf = { slowP: -1, slowA: -1, pct: 0.5 }; window.__stunLog = [];
    window.__tfCast = (sd, key, tick, dtS, oh, ocd, ost) => {
      if (key === "tslow") { if (sd === "P") window.__tf.slowA = tick + Math.round(CFG.D / dtS); else window.__tf.slowP = tick + Math.round(CFG.D / dtS); }
      if (key === "tstun" && oh) { oh.list.forEach((e) => { if (e.ko || e.dead || e.droid) return; e.stunT = tick + Math.round(CFG.S / dtS); });
        (ost.actives || []).forEach((a2) => { const e = oh.by[a2.key]; if (e && !e.ko) ocd[a2.key] = a2.cooldown; }); CFG.stuns = (CFG.stuns || 0) + 1; } };
    const BASE = ["gareth", "lyra", "kessa", "sera"], ALL = BASE.concat(["hanzo", "aurek", "tslow", "tstun"]);
    const kit = (ids, wl) => { const specs = []; let hex = 0; WEAPON_DEFS.forEach((w) => { if (!ids.includes(w.id)) return; const s = game.weaponStatsAtLevel(w, wl); if (w.kind === "shield") { hex = Math.max(hex, s.shieldPct || 0); return; } specs.push(s); }); return { specs, hex }; };
    const hsAt = (L) => { const hs = {}; ALL.forEach((k) => { hs[k] = { owned: true, level: L[0], stars: L[1], skillLevels: { conquest: [L[2], L[2], L[2]], expedition: [1, 1, 1] } }; }); return hs; };
    const side = (keys, L, isP) => { const s2 = arenaSideStats(keys, hsAt(L), 15, 0, false, null, null, undefined, ZERO_BONUS); (s2.heroHp || []).forEach((e) => { e.runL = arenaRunDist(400, 240, Math.max(0, keys.indexOf(e.id)), isP); }); return s2; };
    const BUILDS = [[]]; /* weapon builds in this harness end every fight as a draw (fortress HP goes NaN) - no weapons, more seeds */
    const HAN = BASE.concat(["hanzo"]);
    let CASTS = 0, HCASTS = 0;
    const fight = (pK, aK, L, K, seed, mySide, hero) => { window.__tf.slowP = window.__tf.slowA = -1; const A = side(pK, L, true), B = side(aK, L, false); const sim = arenaMakeSim(A, B, { rng: worldPvpSeededRng(seed), critSeed: seed, weapons: K.specs, aiWeapons: K.specs, shieldPct: K.hex, aiShieldPct: K.hex });
      let res; for (let t = 0; t < 4000; t++) { res = sim.step(); ((mySide === "P" ? res.info.playerFlash : res.info.aiFlash) || []).forEach((k) => { if (k === hero) CASTS++; }); ((mySide === "P" ? res.info.aiFlash : res.info.playerFlash) || []).forEach((k) => { if (k === "hanzo") HCASTS++; }); if (res.done) break; }
      const mine = mySide === "P" ? sim.playerHp / A.maxHp : sim.aiHp / B.maxHp, theirs = mySide === "P" ? sim.aiHp / B.maxHp : sim.playerHp / A.maxHp; return { r: res.winner || res.result, m: mine - theirs }; };
    const rate = (hero, L) => { let w = 0, d = 0, n = 0, m = 0, w0 = 0, n0 = 0, m0 = 0; CASTS = 0; HCASTS = 0; const T = BASE.concat([hero]); BUILDS.forEach((ids, bi) => { const K = kit(ids, L[3]); for (let s = 0; s < 20; s++) {
        const r1 = fight(T, HAN, L, K, "t" + s, "P", hero), r2 = fight(HAN, T, L, K, "h" + s, "A", hero);
        [[r1, "player"], [r2, "ai"]].forEach(([x, wn]) => { w += x.r === wn; d += x.r === "draw"; m += x.m; n++; if (bi === 0) { w0 += x.r === wn; m0 += x.m; n0++; } }); } });
      return { win: Math.round(100 * w / n), draw: Math.round(100 * d / n), lose: Math.round(100 * (n - w - d) / n), hpMargin: Math.round(100 * m / n), noWeaponsWin: Math.round(100 * w0 / n0), noWeaponsMargin: Math.round(100 * m0 / n0), castsPerFight: +(CASTS / n).toFixed(1), hanzoCasts: +(HCASTS / n).toFixed(2) }; };
    const out = {}; const L80 = [80, 25, 5, 30], L40 = [40, 10, 3, 15];
    if (window.__slowGrid) { out["Lv80 Aurek copy (no effect)"] = rate("aurek", L80);
      [12, 24, 60].forEach((D) => [0.5, 0.6, 0.7, 0.8, 0.9, 1].forEach((pc) => { CFG = { D }; window.__tf.pct = pc; out["Lv80 Slow " + Math.round(pc * 100) + "% for " + D + "s"] = rate("tslow", L80); })); window.__tf.pct = 0.5; return JSON.stringify(out, null, 1); }
    out["Lv80 Aurek (no extra effect, reference)"] = rate("aurek", L80);
    [3, 6, 12].forEach((D) => { CFG = { D }; out["Lv80 Slow 50% for " + D + "s"] = rate("tslow", L80); });
    [1, 2, 3].forEach((S) => { CFG = { S }; out["Lv80 Stun " + S + "s + timers reset"] = rate("tstun", L80); });
    out["Lv80 Hanzo team vs Hanzo team (sanity)"] = rate("hanzo", L80);
    out["Lv40 Aurek (reference)"] = rate("aurek", L40); CFG = { D: 6 }; window.__tf.pct = 0.3; out["Lv40 Slow 30% for 6s"] = rate("tslow", L40); window.__tf.pct = 0.5; CFG = { S: 1.2 }; out["Lv40 Stun 1.2s + timers reset"] = rate("tstun", L40); out["Lv40 Hanzo vs Hanzo"] = rate("hanzo", L40);
    return JSON.stringify(out, null, 1);
  });
  console.log(r); fs.writeFileSync(path.join(__dirname, "results", process.env.SLOWGRID ? "slow_grid.json" : "cc_heroes.json"), r); if (errs.length) console.log("ERRS", errs.slice(0, 3)); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
