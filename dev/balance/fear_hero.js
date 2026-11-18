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
rep("playerCd[a.key] += a.cooldown * cardCdMul('P'); playerFlash.push(a.key);", "playerCd[a.key] += a.cooldown * cardCdMul('P'); playerFlash.push(a.key); if (window.__tfCast) window.__tfCast('P', a.key, tick, dtS, aHH);");
rep("aiCd[a.key] += a.cooldown * cardCdMul('A'); aiFlash.push(a.key);", "aiCd[a.key] += a.cooldown * cardCdMul('A'); aiFlash.push(a.key); if (window.__tfCast) window.__tfCast('A', a.key, tick, dtS, pHH);");
rep("var budget = (e.gerbil ? GERBIL_RUN_PX_PER_SEC : heroMoveSpeed(e.id)) * dtS;", "var budget = (e.gerbil ? GERBIL_RUN_PX_PER_SEC : heroMoveSpeed(e.id)) * dtS * (e.fearT > tick ? 1 - window.__fear.pct : 1);");
rep("cd[a.id] -= cdStep;", "cd[a.id] -= cdStep * (hh && hh.by[a.id] && hh.by[a.id].fearT > tick ? 1 - window.__fear.pct : 1);");
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
  if (process.env.LOWF) await P.evaluate(() => { window.__LOWF = true; });
  const r = await P.evaluate(() => {
    const d = Object.assign({}, HERO_DEFS.aurek, { name: "Siphon" }); d.conquestSkills = HERO_DEFS.aurek.conquestSkills.map((s) => Object.assign({}, s));
    const sk = d.conquestSkills[0]; sk.name = "Fear"; HERO_DEFS.tfear = d; if (HERO_ANIMS.aurek) HERO_ANIMS.tfear = HERO_ANIMS.aurek; if (HERO_ANIMS.aurek_skill) HERO_ANIMS.tfear_skill = HERO_ANIMS.aurek_skill;
    window.__fear = { pct: 0, D: 0 };
    window.__tfCast = (sd, key, tick, dtS, oh) => { if (key !== "tfear" || !oh || !window.__fear.pct) return; oh.list.forEach((e) => { if (e.ko || e.dead || e.droid) return; e.fearT = tick + Math.round(window.__fear.D / dtS); }); };
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
    (window.__LOWF ? ["aurek"] : ["hanzo", "aurek"]).forEach((opp) => {
      window.__fear = { pct: 0, D: 0 }; out["vs " + opp + " team | Aurek copy, no fear"] = rate("tfear", opp, L80);
      (window.__LOWF ? [[0.05, 2], [0.1, 2], [0.1, 3], [0.15, 2], [0.15, 3], [0.2, 2], [0.2, 3]] : [[0.3, 3], [0.3, 5], [0.5, 3], [0.5, 5], [0.7, 5]]).forEach(([pct, D]) => { window.__fear = { pct, D }; out["vs " + opp + " team | Fear " + Math.round(pct * 100) + "% slower for " + D + "s"] = rate("tfear", opp, L80); });
      if (window.__LOWF) return; window.__fear = { pct: 0.5, D: 5 }; const keep = sk.pctByLevel; sk.pctByLevel = [0, 0, 0, 0, 0]; out["vs " + opp + " team | Fear 50% 5s, NO skill damage"] = rate("tfear", opp, L80); sk.pctByLevel = keep;
    });
    return JSON.stringify(out, null, 1);
  });
  console.log(r); fs.writeFileSync(path.join(__dirname, "results", process.env.LOWF ? "fear_hero_low.json" : "fear_hero.json"), r); if (errs.length) console.log("ERRS", errs.slice(0, 3)); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
