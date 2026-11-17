/* v1720 (Harley): drain hero v2 - a MELEE hero (copy of Aurek: same HP, hits, 12 s skill timer). When his skill fires he floats up into the sky for 3 s
   (swords can't reach him, he holds his spot) and drains a FLAT amount of HP from every enemy hero and the enemy fortress over those 3 s (6 pulses, 0.5 s apart,
   nobody can dodge it); everything drained heals his own fortress. Find the flat amount where his team is about even with a Hanzo team.
   [Gareth, Lyra, Kessa, Sera + drainer] vs [same 4 + Hanzo], no weapons, 20 seeds, attack + defend (40 fights). Run: node dev/balance/drain_melee.js */
const fs = require("fs"), path = require("path"), ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "playwright");
let G = fs.readFileSync(path.join(ROOT, "test/index.html"), "utf8");
const rep = (a, b) => { if (G.split(a).length !== 2) throw new Error("patch point: " + a); G = G.replace(a, b); };
rep("playerCd[a.key] += a.cooldown * cardCdMul('P'); playerFlash.push(a.key);", "playerCd[a.key] += a.cooldown * cardCdMul('P'); playerFlash.push(a.key); if (window.__drCast) window.__drCast('P', a.key, tick, dtS, pHH);");
rep("aiCd[a.key] += a.cooldown * cardCdMul('A'); aiFlash.push(a.key);", "aiCd[a.key] += a.cooldown * cardCdMul('A'); aiFlash.push(a.key); if (window.__drCast) window.__drCast('A', a.key, tick, dtS, aHH);");
rep("if (waveQ.length) { var waveKeep = [];", "if (window.__drTick) { var __t = window.__drTick(tick, pHH, aHH, playerStats, aiStats); if (__t) { playerDmg += __t.pF; aiDmg += __t.aF; playerHp = Math.min(playerStats.maxHp, playerHp + __t.pH); aiHp = Math.min(aiStats.maxHp, aiHp + __t.aH); } }\n    if (waveQ.length) { var waveKeep = [];");
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
  await P.fill("#ksE", "dm" + process.pid + "@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 120000 }); await P.fill("#ksN", "Sim"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  if (process.env.BIG) await P.evaluate(() => { window.__BIG = true; });
  if (process.env.FINE) await P.evaluate(() => { window.__FINE = true; });
  const r = await P.evaluate(() => {
    const d = Object.assign({}, HERO_DEFS.aurek, { name: "Drainer" }); d.conquestSkills = HERO_DEFS.aurek.conquestSkills.map((s) => Object.assign({}, s));
    const sk = d.conquestSkills[0]; sk.name = "Soul Drain"; sk.pctByLevel = [0, 0, 0, 0, 0]; HERO_DEFS.tdrain = d; if (HERO_ANIMS.aurek) HERO_ANIMS.tdrain = HERO_ANIMS.aurek;
    let CFG = { on: false, D: 0 }, Q = [], ST = { casts: 0, healed: 0, floatHits: 0 };
    window.__drCast = (sd, key, tick, dtS, mine) => { if (key !== "tdrain" || !CFG.on) return; const me = mine && mine.by.tdrain; if (!me || me.ko) return; ST.casts++;
      const T3 = Math.round(3 / dtS); me.float = true; me.castUntil = tick + T3; for (let i = 1; i <= 6; i++) Q.push({ sd, at: tick + Math.round(i * 0.5 / dtS) }); Q.push({ sd, at: tick + T3, land: true }); };
    window.__drTick = (tick, pHH, aHH, pSt, aSt) => { if (!Q.length) return null; const o = { pF: 0, aF: 0, pH: 0, aH: 0 }; const keep = [];
      Q.forEach((q) => { if (tick < q.at) { keep.push(q); return; } const mine = q.sd === "P" ? pHH : aHH, opp = q.sd === "P" ? aHH : pHH, ost = q.sd === "P" ? aSt : pSt, me = mine && mine.by.tdrain;
        if (q.land) { if (me) me.float = false; return; } if (!me || me.ko) { if (me) me.float = false; return; } /* knocked out mid-drain: it stops */
        const per = CFG.D / 6; let tot = 0;
        (opp ? opp.list : []).forEach((e) => { if (e.ko || e.dead || e.droid) return; const dm = per * (ost.dmgTakenMult || 1) * defReduce(e.refA, e.def) * (game.heroKoCfg.heroDmgMult || 1); tot += Math.min(e.hp, dm); e.hp -= dm;
          if (e.hp <= 1e-9) { e.hp = 0; e.ko = true; e.koTick = tick; e.koD = e.d; e.reviveT = game.heroKoCfg.reviveSec; e.kos = (e.kos || 0) + 1; e.d = 0; } });
        const fort = per * (ost.dmgTakenMult || 1); tot += fort; if (q.sd === "P") { o.pF += per; o.pH += tot; } else { o.aF += per; o.aH += tot; } ST.healed += tot; });
      Q = keep; return o; };
    const BASE = ["gareth", "lyra", "kessa", "sera"], ALL = BASE.concat(["hanzo", "tdrain"]);
    const hsAt = (L) => { const hs = {}; ALL.forEach((k) => { hs[k] = { owned: true, level: L[0], stars: L[1], skillLevels: { conquest: [L[2], L[2], L[2]], expedition: [1, 1, 1] } }; }); return hs; };
    const side = (keys, L, isP) => { const s2 = arenaSideStats(keys, hsAt(L), 15, 0, false, null, null, undefined, ZERO_BONUS); (s2.heroHp || []).forEach((e) => { e.runL = arenaRunDist(400, 240, Math.max(0, keys.indexOf(e.id)), isP); }); return s2; };
    const HAN = BASE.concat(["hanzo"]), T = BASE.concat(["tdrain"]);
    const fight = (pK, aK, L, seed, mySide) => { Q = []; const A = side(pK, L, true), B = side(aK, L, false); const sim = arenaMakeSim(A, B, { rng: worldPvpSeededRng(seed), critSeed: seed }); const res = sim.runToEnd();
      const mine = mySide === "P" ? sim.playerHp / A.maxHp : sim.aiHp / B.maxHp, theirs = mySide === "P" ? sim.aiHp / B.maxHp : sim.playerHp / A.maxHp; return { r: res, m: mine - theirs }; };
    const rate = (L) => { let w = 0, dr = 0, n = 0, m = 0; ST = { casts: 0, healed: 0 }; for (let s = 0; s < 20; s++) { const r1 = fight(T, HAN, L, "t" + s, "P"), r2 = fight(HAN, T, L, "h" + s, "A");
        [[r1, "player"], [r2, "ai"]].forEach(([x, wn]) => { w += x.r === wn; dr += x.r === "draw"; m += x.m; n++; }); }
      return { win: Math.round(100 * w / n), draw: Math.round(100 * dr / n), lose: Math.round(100 * (n - w - dr) / n), hpMargin: Math.round(100 * m / n), castsPerFight: +(ST.casts / n).toFixed(1), healedPerFight: Math.round(ST.healed / n) }; };
    const out = {};
    [["Lv80", [80, 25, 5, 30], (window.__FINE ? [750, 800, 850, 900] : window.__BIG ? [400, 700, 1000, 1500, 2000, 3000, 5000] : [10, 25, 50, 75, 100, 150, 250])], ["Lv40", [40, 10, 3, 15], (window.__FINE ? [325, 350, 375, 400] : window.__BIG ? [200, 300, 450, 700, 1000, 1500, 2500] : [5, 10, 25, 50, 75, 100, 150])]].forEach(([nm, L, DS]) => {
      out[nm + " hero HP"] = Math.round((side(T, L, true).heroHp || [])[0].max); out[nm + " fortress HP"] = Math.round(side(T, L, true).maxHp);
      CFG = { on: false }; out[nm + " plain Aurek copy (no drain, no float)"] = rate(L);
      CFG = { on: true, D: 0 }; out[nm + " float 3 s, drain 0"] = rate(L);
      DS.forEach((D) => { CFG = { on: true, D }; out[nm + " float 3 s, drain " + D + " per target"] = rate(L); });
    });
    return JSON.stringify(out, null, 1);
  });
  fs.writeFileSync(path.join(__dirname, "results", process.env.FINE ? "drain_melee_fine.json" : process.env.BIG ? "drain_melee_big.json" : "drain_melee.json"), r); if (errs.length) console.log("ERRS", errs.slice(0, 3)); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
