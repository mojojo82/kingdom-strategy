/* v1720 (Harley): theoretical deck rider whose skill "sucks HP out of everyone and everything on the opponent's side": every enemy hero AND the enemy
   fortress take the hit (nobody can dodge it - not even Hanzo, also mid-leap), and the total drained heals his own fortress. Real Arena sim, game patched in memory.
   He is a copy of Lyra (same HP / basic shots) with his own skill timer; the drain per target is set relative to Hanzo's Shuriken Storm hit at the same level.
   [Gareth, Lyra, Kessa, Sera + drainer] vs [same 4 + Hanzo], no weapons, 20 seeds, attack + defend. Run: node dev/balance/drain_hero.js */
const fs = require("fs"), path = require("path"), ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "playwright");
let G = fs.readFileSync(path.join(ROOT, "test/index.html"), "utf8");
const rep = (a, b) => { if (G.split(a).length !== 2) throw new Error("patch point: " + a); G = G.replace(a, b); };
rep("playerCd[a.key] += a.cooldown * cardCdMul('P'); playerFlash.push(a.key);", "playerCd[a.key] += a.cooldown * cardCdMul('P'); playerFlash.push(a.key); var __dp = window.__drCast ? window.__drCast(aHH, aiStats, a.key, tick) : null; if (__dp) { playerDmg += __dp.fort; playerHp = Math.min(playerStats.maxHp, playerHp + __dp.heal); }");
rep("aiCd[a.key] += a.cooldown * cardCdMul('A'); aiFlash.push(a.key);", "aiCd[a.key] += a.cooldown * cardCdMul('A'); aiFlash.push(a.key); var __da = window.__drCast ? window.__drCast(pHH, playerStats, a.key, tick) : null; if (__da) { aiDmg += __da.fort; aiHp = Math.min(aiStats.maxHp, aiHp + __da.heal); }");
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
  await P.fill("#ksE", "dr" + process.pid + "@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 120000 }); await P.fill("#ksN", "Sim"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  if (process.env.LOW) await P.evaluate(() => { window.__LOW = true; });
  const r = await P.evaluate(() => {
    const d = Object.assign({}, HERO_DEFS.lyra, { name: "Drainer" }); d.conquestSkills = HERO_DEFS.lyra.conquestSkills.map((s) => Object.assign({}, s));
    const sk = d.conquestSkills[0]; sk.name = "Soul Drain"; sk.pctByLevel = [0, 0, 0, 0, 0]; delete sk.cdByLevel; HERO_DEFS.tdrain = d; if (HERO_ANIMS.lyra) HERO_ANIMS.tdrain = HERO_ANIMS.lyra;
    let CFG = { on: false, dmg: 0, heal: 1 }, ST = { casts: 0, drained: 0, healed: 0, n: 0 };
    window.__drCast = (oh, ost, key, tick) => { if (key !== "tdrain" || !CFG.on) return null; let tot = 0;
      (oh ? oh.list : []).forEach((e) => { if (e.ko || e.dead || e.droid) return; const dm = CFG.dmg * (ost.dmgTakenMult || 1) * defReduce(e.refA, e.def) * (game.heroKoCfg.heroDmgMult || 1); const took = Math.min(e.hp, dm); e.hp -= dm; tot += took;
        if (e.hp <= 1e-9) { e.hp = 0; e.ko = true; e.koTick = tick; e.koD = e.d; e.reviveT = game.heroKoCfg.reviveSec; e.kos = (e.kos || 0) + 1; e.d = 0; } });
      const fort = CFG.dmg * (ost.dmgTakenMult || 1); tot += fort; ST.casts++; ST.drained += tot; ST.healed += tot * CFG.heal; return { fort: CFG.dmg, heal: tot * CFG.heal }; };
    const BASE = ["gareth", "lyra", "kessa", "sera"], ALL = BASE.concat(["hanzo", "tdrain"]);
    const hsAt = (L) => { const hs = {}; ALL.forEach((k) => { hs[k] = { owned: true, level: L[0], stars: L[1], skillLevels: { conquest: [L[2], L[2], L[2]], expedition: [1, 1, 1] } }; }); return hs; };
    const side = (keys, L, isP) => { const s2 = arenaSideStats(keys, hsAt(L), 15, 0, false, null, null, undefined, ZERO_BONUS); (s2.heroHp || []).forEach((e) => { e.runL = arenaRunDist(400, 240, Math.max(0, keys.indexOf(e.id)), isP); }); return s2; };
    const HAN = BASE.concat(["hanzo"]), T = BASE.concat(["tdrain"]);
    const fight = (pK, aK, L, seed, mySide) => { const A = side(pK, L, true), B = side(aK, L, false); const sim = arenaMakeSim(A, B, { rng: worldPvpSeededRng(seed), critSeed: seed }); const res = sim.runToEnd();
      const mine = mySide === "P" ? sim.playerHp / A.maxHp : sim.aiHp / B.maxHp, theirs = mySide === "P" ? sim.aiHp / B.maxHp : sim.playerHp / A.maxHp; return { r: res, m: mine - theirs }; };
    const rate = (L) => { let w = 0, dr = 0, n = 0, m = 0; ST = { casts: 0, drained: 0, healed: 0 }; for (let s = 0; s < 20; s++) { const r1 = fight(T, HAN, L, "t" + s, "P"), r2 = fight(HAN, T, L, "h" + s, "A");
        [[r1, "player"], [r2, "ai"]].forEach(([x, wn]) => { w += x.r === wn; dr += x.r === "draw"; m += x.m; n++; }); }
      return { win: Math.round(100 * w / n), draw: Math.round(100 * dr / n), lose: Math.round(100 * (n - w - dr) / n), hpMargin: Math.round(100 * m / n), castsPerFight: +(ST.casts / n).toFixed(1), healedPerFight: Math.round(ST.healed / n) }; };
    const out = {};
    [["Lv80", [80, 25, 5, 30]], ["Lv40", [40, 10, 3, 15]]].forEach(([nm, L]) => {
      const hz = (side(HAN, L, true).actives || []).filter((a) => a.key === "hanzo")[0], hv = hz ? hz.value : 0; out[nm + " Hanzo's Storm hit per target"] = Math.round(hv); out[nm + " fortress HP"] = Math.round(side(T, L, true).maxHp);
      CFG = { on: false }; out[nm + " drainer with no drain (plain Lyra copy)"] = rate(L);
      (window.__LOW ? [[12, 0.05, 1], [12, 0.1, 1], [12, 0.2, 1], [12, 0.3, 1], [12, 0.2, 0]] : [[12, 0.5, 1], [12, 1, 1], [10, 1, 1], [10, 1, 0], [10, 1.5, 1], [8, 1, 1], [8, 1.5, 1]]).forEach(([cd, mult, heal]) => { sk.cooldown = cd; CFG = { on: true, dmg: hv * mult, heal }; out[nm + " every " + cd + "s, drain = " + mult + "x Hanzo's hit, heal " + Math.round(heal * 100) + "%"] = rate(L); });
    });
    return JSON.stringify(out, null, 1);
  });
  fs.writeFileSync(path.join(__dirname, "results", process.env.LOW ? "drain_hero_low.json" : "drain_hero.json"), r); console.log(r); if (errs.length) console.log("ERRS", errs.slice(0, 3)); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
