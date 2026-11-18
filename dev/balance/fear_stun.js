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
rep("playerCd[a.key] += a.cooldown * cardCdMul('P'); playerFlash.push(a.key);", "playerCd[a.key] += a.cooldown * cardCdMul('P'); playerFlash.push(a.key); if (window.__tfCast) window.__tfCast('P', a.key, tick, dtS, aHH, pHH); if (window.__st && window.__st.reset && a.key === 'tfear') (aiStats.actives || []).forEach(function (a2) { var e2 = aHH && aHH.by[a2.key]; if (e2 && !e2.ko) aiCd[a2.key] = a2.cooldown; });");
rep("aiCd[a.key] += a.cooldown * cardCdMul('A'); aiFlash.push(a.key);", "aiCd[a.key] += a.cooldown * cardCdMul('A'); aiFlash.push(a.key); if (window.__tfCast) window.__tfCast('A', a.key, tick, dtS, pHH, aHH); if (window.__st && window.__st.reset && a.key === 'tfear') (playerStats.actives || []).forEach(function (a2) { var e2 = pHH && pHH.by[a2.key]; if (e2 && !e2.ko) playerCd[a2.key] = a2.cooldown; });");
rep("playerCd[a.key] -= cdStep;", "playerCd[a.key] -= cdStep * (pHH && pHH.by[a.key] && pHH.by[a.key].stunT > tick ? 0 : 1);");
rep("aiCd[a.key] -= cdStep;", "aiCd[a.key] -= cdStep * (aHH && aHH.by[a.key] && aHH.by[a.key].stunT > tick ? 0 : 1);");
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
  if (process.env.SLOW8) await P.evaluate(() => { window.__slow8 = true; });
  if (process.env.HITF) await P.evaluate(() => { window.__HITF = true; });
  if (process.env.LOWF) await P.evaluate(() => { window.__LOWF = true; });
  const r = await P.evaluate(() => {
    const d = Object.assign({}, HERO_DEFS.aurek, { name: "Siphon" }); d.conquestSkills = HERO_DEFS.aurek.conquestSkills.map((s) => Object.assign({}, s));
    const sk = d.conquestSkills[0]; sk.name = "Fear"; HERO_DEFS.tfear = d; if (HERO_ANIMS.aurek) HERO_ANIMS.tfear = HERO_ANIMS.aurek; if (HERO_ANIMS.aurek_skill) HERO_ANIMS.tfear_skill = HERO_ANIMS.aurek_skill;
    window.__st = { S: 0, own: true };
    window.__tfCast = (sd, key, tick, dtS, oh, mh) => { if (key !== "tfear" || !window.__st.S) return; const T = tick + Math.round(window.__st.S / dtS);
      [oh, window.__st.own ? mh : null].forEach((h) => { if (h) h.list.forEach((e) => { if (e.ko || e.dead || e.id === "tfear") return; e.stunT = T; }); }); if (window.__st.reset && oh) window.__resetQ = { oh, sd }; };
    const BASE = ["gareth", "lyra", "kessa", "sera"], ALL = BASE.concat(["hanzo", "aurek", "tfear"]);
    const hsAt = (L) => { const hs = {}; ALL.forEach((k) => { hs[k] = { owned: true, level: L[0], stars: L[1], skillLevels: { conquest: [L[2], L[2], L[2]], expedition: [1, 1, 1] } }; }); return hs; };
    const side = (keys, L, isP) => { const s2 = arenaSideStats(keys, hsAt(L), 15, 0, false, null, null, undefined, ZERO_BONUS); (s2.heroHp || []).forEach((e) => { e.runL = arenaRunDist(400, 240, Math.max(0, keys.indexOf(e.id)), isP); }); return s2; };
    let CASTS = 0;
    const fight = (pK, aK, L, seed, mySide) => { const A = side(pK, L, true), B = side(aK, L, false); const sim = arenaMakeSim(A, B, { rng: worldPvpSeededRng(seed), critSeed: seed });
      let res; for (let t = 0; t < 4000; t++) { res = sim.step(); ((mySide === "P" ? res.info.playerFlash : res.info.aiFlash) || []).forEach((k) => { if (k === "tfear") CASTS++; }); if (res.done) break; }
      const mine = mySide === "P" ? sim.playerHp / A.maxHp : sim.aiHp / B.maxHp, theirs = mySide === "P" ? sim.aiHp / B.maxHp : sim.playerHp / A.maxHp; return { r: res.winner || res.result, m: mine - theirs }; };
    const rate = (me, opp, L) => { let w = 0, dr = 0, n = 0, m = 0; CASTS = 0; const T = BASE.concat([me]), O = BASE.concat([opp]); for (let s = 0; s < 20; s++) { const r1 = fight(T, O, L, "t" + s, "P"), r2 = fight(O, T, L, "h" + s, "A");
        [[r1, "player"], [r2, "ai"]].forEach(([x, wn]) => { w += x.r === wn; dr += x.r === "draw"; m += x.m; n++; }); }
      return { win: Math.round(100 * w / n), draw: Math.round(100 * dr / n), lose: Math.round(100 * (n - w - dr) / n), hpMargin: Math.round(100 * m / n), castsPerFight: +(CASTS / n).toFixed(1) }; };
    const out = {}; const L80 = [80, 25, 5, 30];
    ["hanzo", "aurek"].forEach((opp) => {
      [[4, true, false], [6, true, false], [8, true, false], [1, true, true], [2, true, true], [3, true, true], [0.5, false, false], [1, false, false]].forEach(([S, own, reset]) => { window.__st = { S, own, reset }; out["vs " + opp + " | stun " + S + "s " + (own ? "both sides" : "enemies only") + (reset ? " + enemy timers reset" : "")] = rate("tfear", opp, L80); }); });
    return JSON.stringify(out, null, 1);
  });
  console.log(r); fs.writeFileSync(path.join(__dirname, "results", "fear_stun_both2.json"), r); if (errs.length) console.log("ERRS", errs.slice(0, 3)); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
