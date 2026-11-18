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
rep("playerCd[a.key] += a.cooldown * cardCdMul('P'); playerFlash.push(a.key);", "playerCd[a.key] += a.cooldown * cardCdMul('P'); playerFlash.push(a.key); if (window.__tfCast) window.__tfCast('P', a.key, tick, dtS, aHH, pHH); if (window.__st && window.__st.oldReset && a.key === 'tfear') { (aiStats.actives || []).forEach(function (a2) { var e2 = aHH && aHH.by[a2.key]; if (e2 && !e2.ko) aiCd[a2.key] = a2.cooldown; }); if (window.__st.resetOwn) (playerStats.actives || []).forEach(function (a2) { if (a2.key === 'tfear') return; var e2 = pHH && pHH.by[a2.key]; if (e2 && !e2.ko) playerCd[a2.key] = a2.cooldown; }); };");
rep("aiCd[a.key] += a.cooldown * cardCdMul('A'); aiFlash.push(a.key);", "aiCd[a.key] += a.cooldown * cardCdMul('A'); aiFlash.push(a.key); if (window.__tfCast) window.__tfCast('A', a.key, tick, dtS, pHH, aHH); if (window.__st && window.__st.oldReset && a.key === 'tfear') { (playerStats.actives || []).forEach(function (a2) { var e2 = pHH && pHH.by[a2.key]; if (e2 && !e2.ko) playerCd[a2.key] = a2.cooldown; }); if (window.__st.resetOwn) (aiStats.actives || []).forEach(function (a2) { if (a2.key === 'tfear') return; var e2 = aHH && aHH.by[a2.key]; if (e2 && !e2.ko) aiCd[a2.key] = a2.cooldown; }); };");
rep("playerCd[a.key] -= cdStep;", "playerCd[a.key] -= cdStep * (pHH && pHH.by[a.key] && pHH.by[a.key].stunT > tick ? 0 : 1);");
rep("aiCd[a.key] -= cdStep;", "aiCd[a.key] -= cdStep * (aHH && aHH.by[a.key] && aHH.by[a.key].stunT > tick ? 0 : 1);");
rep("var eligible = !isKo(hh, a.id) &&", "var eligible = !isKo(hh, a.id) && !(hh && hh.by[a.id] && hh.by[a.id].stunT > tick) &&");
rep("if (e.air || e.castUntil > tick) {", "if (e.air || e.castUntil > tick || e.stunT > tick) {");
rep("if (waveQ.length) { var waveKeep = [];", "if (window.__ftTick) window.__ftTick(tick, dtS, pHH, aHH, playerCd, aiCd, playerStats, aiStats);\n    if (waveQ.length) { var waveKeep = [];");
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
    window.__st = { S: 0 }; let PEND = [], AURA = { casts: 0, hit: 0, hanzo: 0 }, WARD = { casts: 0, bael: 0 };
    { const w = Object.assign({}, HERO_DEFS.lyra, { name: 'Warden' }); w.conquestSkills = HERO_DEFS.lyra.conquestSkills.map((x) => Object.assign({}, x)); HERO_DEFS.tward = w; if (HERO_ANIMS.lyra) HERO_ANIMS.tward = HERO_ANIMS.lyra; }
    window.__tfCast = (sd, key, tick, dtS, oh, mh) => { if (key !== "tfear" || !window.__st.S) return; PEND.push({ sd, until: tick + Math.round((window.__st.wait || 0) / dtS) }); };
    window.__ftTick = (tick, dtS, pHH, aHH, pCd, aCd, pSt, aSt) => {
      if (window.__ward) { const W = window.__ward; [pHH, aHH].forEach((h) => { if (!h || (!W.self && (!h.by.tward || h.by.tward.ko)) || (W.self && !h.by.tfear)) return; const due = tick === 1 || (tick > 1 && (tick - 1) % Math.round(W.every / dtS) === 0); if (!due) return;
          let best = null; if (W.self) { best = h.by.tfear && !h.by.tfear.ko ? h.by.tfear : null; } else h.list.forEach((e) => { if (e.ko || e.dead || e.droid || e.float) return; if (!best || e.max > best.max) best = e; }); if (best) { best.sh = Math.max(best.sh || 0, W.pct * best.max); WARD.casts++; if (best.id === "tfear") WARD.bael++; } }); }
      if (!PEND.length) return; const keep = [];
      PEND.forEach((q) => { const mine = q.sd === "P" ? pHH : aHH, opp = q.sd === "P" ? aHH : pHH, ocd = q.sd === "P" ? aCd : pCd, ost = q.sd === "P" ? aSt : pSt, me = mine && mine.by.tfear;
        if (!me || me.ko || !opp) return; const R = window.__st.R;
        if (window.__st.gaze) { let best = null, bcd = 1e9; (ost.actives || []).forEach((a2) => { const e2 = opp.by[a2.key]; if (!e2 || e2.ko || e2.dead || e2.droid) return; const c = ocd[a2.key] == null ? 1e9 : ocd[a2.key]; if (c < bcd) { bcd = c; best = e2; } });
          AURA.minB = Math.min(AURA.minB == null ? 1e9 : AURA.minB, bcd); AURA.seen = (AURA.seen || 0) + 1; if (!best) { if (tick < q.until) keep.push(q); return; } if (window.__st.interrupt && bcd > window.__st.interrupt && tick < q.until) { keep.push(q); return; } best.stunT = tick + Math.round(window.__st.S / dtS); if (!window.__st.noReset) ocd[best.id] = (ost.actives || []).find((a2) => a2.key === best.id).cooldown; AURA.casts++; AURA.hit++; if (best.id === "hanzo") AURA.hanzo++; (AURA.who = AURA.who || {})[best.id] = (AURA.who[best.id] || 0) + 1; return; }
        const near = opp.list.filter((o) => !o.ko && !o.dead && !o.droid && ((o.infantry ? o.d : 0) + me.d >= 1 - R));
        if (!near.length && tick < q.until) { keep.push(q); return; } if (!near.length) return;
        const T = tick + Math.round(window.__st.S / dtS); AURA.casts++;
        near.forEach((o) => { o.stunT = T; AURA.hit++; if (o.id === "hanzo") AURA.hanzo++; if (window.__st.reset) (ost.actives || []).forEach((a2) => { if (a2.key === o.id) ocd[a2.key] = a2.cooldown; }); }); });
      PEND = keep; };
    const BASE = ["gareth", "lyra", "kessa", "sera"], ALL = BASE.concat(["hanzo", "aurek", "tfear", "zarek", "tward", "tom", "roran", "juno", "pip", "vesper"]);
    const hsAt = (L) => { const hs = {}; ALL.forEach((k) => { hs[k] = { owned: true, level: L[0], stars: L[1], skillLevels: { conquest: [L[2], L[2], L[2]], expedition: [1, 1, 1] } }; }); return hs; };
    const side = (keys, L, isP) => { const s2 = arenaSideStats(keys, hsAt(L), 15, 0, false, null, null, undefined, ZERO_BONUS); if (window.__hpK) (s2.heroHp || []).forEach((e) => { if (e.id === 'tfear') e.max = Math.round(e.max * window.__hpK); }); if (window.__cdr && keys.includes('tfear')) s2.fortCdr = window.__cdr; (s2.heroHp || []).forEach((e) => { e.runL = arenaRunDist(400, 240, Math.max(0, keys.indexOf(e.id)), isP); }); return s2; };
    let CASTS = 0;
    const fight = (pK, aK, L, seed, mySide) => { const A = side(pK, L, true), B = side(aK, L, false); const cmB = () => { if (!window.__cmOn) return null; const m = cardModsBlank(); m.cdr = 0.05; m.cdrLow = { pct: 0.05, below: 0.90 }; if (window.__cmOn === 2) m.cdrDmg = { over: 0.25, pct: 0.25 }; m.any = true; return m; };
      const sim = arenaMakeSim(A, B, { rng: worldPvpSeededRng(seed), critSeed: seed, cardMods: pK.includes('tfear') ? cmB() : null, aiCardMods: aK.includes('tfear') ? cmB() : null });
      let res; for (let t = 0; t < 4000; t++) { res = sim.step(); ((mySide === "P" ? res.info.playerFlash : res.info.aiFlash) || []).forEach((k) => { if (k === "tfear") CASTS++; }); if (res.done) break; }
      const mine = mySide === "P" ? sim.playerHp / A.maxHp : sim.aiHp / B.maxHp, theirs = mySide === "P" ? sim.aiHp / B.maxHp : sim.playerHp / A.maxHp; return { r: res.winner || res.result, m: mine - theirs }; };
    const rate = (me, opp, L) => { let w = 0, dr = 0, n = 0, m = 0; CASTS = 0; const T = Array.isArray(me) ? me : BASE.concat([me]), O = Array.isArray(opp) ? opp : BASE.concat([opp]); if (new Set(T).size !== T.length || new Set(O).size !== O.length) throw new Error("duplicate hero"); for (let s = 0; s < 20; s++) { const r1 = fight(T, O, L, "t" + s, "P"), r2 = fight(O, T, L, "h" + s, "A");
        [[r1, "player"], [r2, "ai"]].forEach(([x, wn]) => { w += x.r === wn; dr += x.r === "draw"; m += x.m; n++; }); }
      return { win: Math.round(100 * w / n), draw: Math.round(100 * dr / n), lose: Math.round(100 * (n - w - dr) / n), hpMargin: Math.round(100 * m / n), castsPerFight: +(CASTS / n).toFixed(1) }; };
    const out = {}; const L80 = [80, 25, 5, 30];
    [["Hanzo team", BASE.concat(["hanzo"])]].forEach(([on, O]) => {
      window.__st = { S: 0 }; out["vs " + on + " | no fear"] = rate("tfear", O, L80);
      const T = BASE.concat(["tfear"]); window.__hpK = 0; window.__ward = null;
      [[0, 0, "no cards"], [0.45, 2, "full build + Overclock"]].forEach(([cdr, cm, nm]) => [0, 2, 4, 6, 8, 10, 15, 20].forEach((S) => {
        window.__cdr = cdr; window.__cmOn = cm; window.__st = S ? { S, gaze: true, noReset: true, wait: 0 } : { S: 0 }; AURA = { casts: 0, hit: 0, hanzo: 0, who: {} };
        const r = rate(T, O, L80); r.gazes = +(AURA.casts / 40).toFixed(1); r.picked = AURA.who;
        out["vs " + on + " | " + nm + " | gaze stun " + S + "s"] = r; }));
      window.__cdr = 0; window.__cmOn = 0; });
    return JSON.stringify(out, null, 1);
  });
  console.log(r); fs.writeFileSync(path.join(__dirname, "results", "hanzo_stun_length.json"), r); if (errs.length) console.log("ERRS", errs.slice(0, 3)); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
