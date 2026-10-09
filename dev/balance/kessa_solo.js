/* Kessa-only + cards (11,2,3,4,8) vs 5-hero teams (no cards), sim only. Grid: card 11 one-hero ATK bonus x fortress HP multiplier. node dev/balance/kessa_solo.js */
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
  await P.fill("#ksE", "kso@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Emp"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.waitForTimeout(1500);
  const r = await P.evaluate(() => {
    const st = game.state, FIVE = ["gareth", "lyra", "roran", "kessa", "sera"], out = [];
    const kit = (ids) => { const specs = []; let hex = 0; WEAPON_DEFS.forEach((w) => { if (!ids.includes(w.id)) return; const s = game.weaponStatsAtLevel(w, 30); if (w.kind === "shield") { hex = Math.max(hex, s.shieldPct || 0); return; } specs.push(simSpecOf(w, s, w.kind === "fx" ? 0 : s.dmg)); }); simApplyDup(specs, ids, null, null); return { specs, hex }; };
    const hsAt = (lvl, arms) => { const hs = {}; FIVE.forEach((k) => { hs[k] = { owned: true, level: lvl, stars: arms, skillLevels: { conquest: [3, 3, 3], expedition: [3, 3, 3] } }; }); return hs; };
    let HPX = 1; const side = (keys, lvl, isP) => { const s2 = arenaSideStats(keys, hsAt(lvl, lvl >= 80 ? 25 : lvl >= 40 ? 10 : 0), 15, 0, false, null, null, undefined, ZERO_BONUS); if (keys.length === 1) s2.maxHp *= HPX; (s2.heroHp || []).forEach((e) => { e.runL = arenaRunDist(400, 240, Math.max(0, FIVE.indexOf(e.id)), isP); }); return s2; };
    const BUILDS = [[], ["emp_gun", "railgun", "clone_task"], ["hex_shield", "railgun", "status_wave"], ["hex_shield", "emp_gun", "railgun"], ["missile_barrage", "laser_beam", "orbit_shield"]];
    const KIT = [10, 1, 2, 3, 7]; /* Lone Wolf, Storm's Fury, Desperate Spark, Last Bastion, Quick Study */
    const keep = Object.assign({}, CARD_EFFECTS_BY_NAME["#11"]);
    const one = (pKeys, pLvl, pCm, bKeys, bLvl, bCm, K, seed) => { const pl = side(pKeys, pLvl, true), ai = side(bKeys, bLvl, false);
      const r = arenaMakeSim(pl, ai, { rng: worldPvpSeededRng(seed), critSeed: seed, weapons: K.specs, aiWeapons: K.specs, shieldPct: K.hex, aiShieldPct: K.hex, cardMods: pCm, aiCardMods: bCm }).runToEnd(); return r === "player" ? 1 : r === "ai" ? 0 : 0.5; };
    /* A vs B, same weapon build both sides, A attacks + A defends, 3 seeds each -> A's win % */
    const rate = (aKeys, aLvl, aCm, bKeys, bLvl) => { let w = 0, n = 0; BUILDS.forEach((ids) => { const K = kit(ids); for (let s = 0; s < 3; s++) { w += one(aKeys, aLvl, aCm, bKeys, bLvl, null, K, "a" + s); w += 1 - one(bKeys, bLvl, null, aKeys, aLvl, aCm, K, "d" + s); n += 2; } }); return Math.round(100 * w / n); };
    [[40, 40], [40, 30], [80, 80], [80, 60]].forEach(([me, opp]) => { [1, 2, 3, 5].forEach((hx) => { HPX = hx; const row = { me, opp, fortHPx: hx };
      [0.2, 1, 2, 3].forEach((b) => { CARD_EFFECTS_BY_NAME["#11"] = { kind: "soloAtk", pct: b / 0.1, perHero: 0.1 }; st.equippedCards = KIT; row["+" + Math.round(b * 100) + "%"] = rate(["kessa"], me, cardModsFrom(st), FIVE, opp); }); out.push(row); }); }); HPX = 1;
    CARD_EFFECTS_BY_NAME["#11"] = keep;
    const s1 = side(["kessa"], 40, true), s5 = side(FIVE, 40, true); out.push({ fortHp1: Math.round(s1.maxHp), fortHp5: Math.round(s5.maxHp) });
    return JSON.stringify(out);
  });
  console.log(r.replace(/\},\{/g, "},\n{")); if (errs.length) console.log("ERRS", errs.slice(0, 3)); await b.close();
})();
