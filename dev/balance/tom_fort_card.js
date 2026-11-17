/* v1720 (Harley): theoretical Tom support card - "+X% damage from Heaven Splitter to the enemy fortress". How big must X get before
   [4 heroes + Tom + card] is level with [same 4 heroes + Hanzo]? Real Arena sim; the game file is patched in memory only (Tom's slash damage
   to the fortress x (1 + X) on the side holding the card). Both teams same level, same weapon build on both sides (5 builds), Tom's team attacks AND defends, 3 seeds.
   Run: node dev/balance/tom_fort_card.js [base4 csv] */
const fs = require("fs"), path = require("path"), ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "playwright");
let GAME = fs.readFileSync(path.join(ROOT, "test/index.html"), "utf8");
const P0 = "if (q.sd === 'P') { playerDmg += q.v; projP += q.v;", A0 = "} else { aiDmg += q.v; projA += q.v;";
if (GAME.split(P0).length !== 3 || GAME.split(A0).length !== 3) throw new Error("patch points moved");
GAME = GAME.split(P0).join("if (q.sd === 'P') { var tfm = q.key === 'tom' ? (window.__tomFortP || 1) : 1; if (q.key === 'tom') window.__tfHitP = (window.__tfHitP || 0) + q.v; playerDmg += q.v * tfm; projP += q.v * tfm;")
           .split(A0).join("} else { var tfa = q.key === 'tom' ? (window.__tomFortA || 1) : 1; if (q.key === 'tom') window.__tfHitA = (window.__tfHitA || 0) + q.v; aiDmg += q.v * tfa; projA += q.v * tfa;");
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
const BASE = (process.argv[2] || "gareth,lyra,kessa,sera").split(",");
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome", args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 } });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, require(path.join(ROOT, "dev/tests/siteroute.js"))(GAME));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/", { waitUntil: "domcontentloaded", timeout: 180000 }); await P.waitForSelector("#ksAuth .box", { timeout: 120000 });
  await P.fill("#ksE", "tf" + process.pid + "@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 120000 }); await P.fill("#ksN", "Sim"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  if (process.env.DIAG) await P.evaluate(() => { window.__diag = true; });
  if (process.env.XS) await P.evaluate((x) => { window.__XS = x; }, JSON.parse(process.env.XS));
  const r = await P.evaluate((BASE) => {
    const kit = (ids, wl) => { const specs = []; let hex = 0; WEAPON_DEFS.forEach((w) => { if (!ids.includes(w.id)) return; const s = game.weaponStatsAtLevel(w, wl); if (w.kind === "shield") { hex = Math.max(hex, s.shieldPct || 0); return; } specs.push(s); }); return { specs, hex }; };
    const ALL = BASE.concat(["tom", "hanzo"]);
    const hsAt = (lvl, arms, sk) => { const hs = {}; ALL.forEach((k) => { hs[k] = { owned: true, level: lvl, stars: arms, skillLevels: { conquest: [sk, sk, sk], expedition: [1, 1, 1] } }; }); return hs; };
    const side = (keys, L, isP) => { const s2 = arenaSideStats(keys, hsAt(L[0], L[1], L[2]), 15, 0, false, null, null, undefined, ZERO_BONUS); (s2.heroHp || []).forEach((e) => { e.runL = arenaRunDist(400, 240, Math.max(0, keys.indexOf(e.id)), isP); }); return s2; };
    const BUILDS = [[], ["emp_gun", "railgun", "clone_task"], ["hex_shield", "railgun", "status_wave"], ["hex_shield", "emp_gun", "railgun"], ["missile_barrage", "laser_beam", "orbit_shield"]];
    const TOM = BASE.concat(["tom"]), HAN = BASE.concat(["hanzo"]);
    const fight = (pK, aK, L, K, seed) => arenaMakeSim(side(pK, L, true), side(aK, L, false), { rng: worldPvpSeededRng(seed), critSeed: seed, weapons: K.specs, aiWeapons: K.specs, shieldPct: K.hex, aiShieldPct: K.hex }).runToEnd();
    const rate = (X, L) => { let w = 0, n = 0; BUILDS.forEach((ids) => { const K = kit(ids, L[3]); for (let s = 0; s < 3; s++) {
        window.__tomFortP = 1 + X; window.__tomFortA = 1; w += fight(TOM, HAN, L, K, "t" + s) === "player" ? 1 : 0; n++;   /* Tom attacks */
        window.__tomFortP = 1; window.__tomFortA = 1 + X; w += fight(HAN, TOM, L, K, "h" + s) === "ai" ? 1 : 0; n++; } });  /* Tom defends */
      window.__tomFortP = window.__tomFortA = 1; return Math.round(100 * w / n); };
    const out = {}; [["Lv40", [40, 10, 3, 15]], ["Lv80", [80, 25, 5, 30]]].forEach(([nm, L]) => { out[nm] = {}; (window.__diag ? [0] : (window.__XS || [0, 0.1, 0.25, 0.5, 1, 1.5, 2, 3, 5, 8])).forEach((X) => { out[nm]["+" + Math.round(X * 100) + "%"] = rate(X, L); }); });
    if (window.__diag) { const d = {}; const L = [80, 25, 5, 30];
      [["TOMvHAN", TOM, HAN], ["TOMalone", ["tom"], []], ["TOMvBASE", TOM, BASE]].forEach(([lab, pk, ak]) => { window.__tfHitP = 0; const tr = { src: {}, aiSrc: {}, perTick: [] }; const A = side(pk, L, true), B = side(ak, L, false); if (lab === "TOMalone") { B.maxHp = 1e8; }
        const sim = arenaMakeSim(A, B, { rng: worldPvpSeededRng("d"), critSeed: "d", trace: tr, aiCannon: lab !== "TOMalone" }); let t = 0, res, hp = [], casts = [], koAt = [], wasKo = false; for (; t < 600; t++) { res = sim.step(); if ((res.info.playerFlash || []).indexOf("tom") >= 0) casts.push(Math.round(t * ARENA_TICK_MS / 100) / 10); const ph = (res.info.playerHeroes || []).filter((e) => e.id === "tom")[0]; if (ph && ph.ko && !wasKo) koAt.push(Math.round(t * ARENA_TICK_MS / 100) / 10); wasKo = !!(ph && ph.ko); if (t % 25 === 0) hp.push(Math.round(res.info.aiHp != null ? res.info.aiHp : sim.aiHp)); if (res.done) break; }
        const tH = sim.pHH && sim.pHH.by && sim.pHH.by.tom; const act = (A.actives || []).filter((x) => x.key === "tom")[0]; d[lab] = { tomKOs: tH ? tH.kos : null, tomKoAt: koAt, sec: Math.round(t * ARENA_TICK_MS / 1000), win: res.winner || res.result, tomCasts: casts, slashValue: act ? Math.round(act.value) : null, tomBasic: Math.round(((A.attackers || []).filter((x) => x.id === "tom")[0] || {}).dmg || 0), tomFortHits: Math.round(window.__tfHitP), aiHpEvery5s: hp}; }); out.diag = d; }
    return JSON.stringify(out);
  }, BASE);
  console.log("base", BASE.join(","), r); if (errs.length) console.log("ERRS", errs.slice(0, 3)); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
