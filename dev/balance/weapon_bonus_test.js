/* Harley (18 Oct): with the v1252 weapon level bonus, how does a stronger player do vs a weaker one, and how long do fights last -
   bonus on ATK+HP+DEF (as built) vs ATK only. Same heroes / gear / fortress on both sides; only weapon levels differ (every weapon owned, META 3 equipped).
   Run: node dev/balance/weapon_bonus_test.js */
const fs = require("fs"), path = require("path"); const ROOT = path.join(__dirname, "../..");
(async () => {
  const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
  const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
  const GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8"), FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8");
  const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 } });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => process.stderr.write("PAGEERR " + e.message + "\n"));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "bal" + "wb"+process.pid + "@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 20000 }); await P.fill("#ksN", "Sim"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => setScreen("city"));

  const res = await P.evaluate(([ONLY, PAIRS]) => {
    const HE = Object.keys(HERO_DEFS).filter((k) => !HERO_DEFS[k].comingSoon && HERO_DEFS[k].class !== "governor" && !HERO_DEFS[k].vipOnly).slice(0, 5);
    const hs = {}; HE.forEach((k) => { hs[k] = { owned: true, level: 80, stars: 25, skillLevels: { conquest: [5, 5, 5], expedition: [5, 5, 5] } }; });
    const ALL = WEAPON_DEFS.filter((w) => !w.visualOnly), W3 = ["missile_barrage", "laser_beam", "railgun"], GEAR = { atk: 48, hp: 48, def: 29, skill: 24, boss: 24, support: 24 };
    const wb = (L) => ALL.reduce((a, w) => a + (WEAPON_LEVEL_BONUS[w.rarity] || 0) * L, 0);
    const side = (L, mode, isP) => { const b = Object.assign({}, GEAR), x = mode === "none" ? 0 : wb(L); b.atk += x; if (mode === "all") { b.hp += x; b.def += x; }
      const st = arenaSideStats(HE, hs, 20, 0, false, null, fortressMaxMap(1), undefined, b); (st.heroHp || []).forEach((e) => { e.runL = arenaRunDist(400, 240, HE.indexOf(e.id), isP); }); return st; };
    const kit = (L) => { const m = {}; W3.forEach((id) => { m[id] = L; }); return botWeaponsToSim(m); };
    const out = [];
    for (const [hi, lo] of (ONLY ? [[10, 10]] : PAIRS || [[10, 10], [30, 30], [50, 50], [20, 10], [35, 10], [50, 10], [50, 30]])) for (const mode of (ONLY ? ["none"] : ["all", "atk"])) {
      let sw = 0, n = 0, to = 0; const secs = [], left = [];
      for (let sd = 0; sd < (PAIRS ? 25 : 12); sd++) for (const strongIsP of [true, false]) {
        const seed = "wb" + hi + lo + mode + sd + strongIsP, kh = kit(hi), kl = kit(lo);
        const P0 = strongIsP ? side(hi, mode, true) : side(lo, mode, true), A0 = strongIsP ? side(lo, mode, false) : side(hi, mode, false);
        const sim = arenaMakeSim(P0, A0, { rng: worldPvpSeededRng(seed), critSeed: seed, weapons: (strongIsP ? kh : kl).specs, aiWeapons: (strongIsP ? kl : kh).specs, shieldPct: (strongIsP ? kh : kl).shieldPct, aiShieldPct: (strongIsP ? kl : kh).shieldPct });
        const w = sim.runToEnd(); n++; secs.push(sim.tick * ARENA_TICK_MS / 1000);
        const strongWon = (w === "player") === strongIsP && w !== "draw"; if (strongWon) sw++;
        if (sim.playerHp > 0 && sim.aiHp > 0) to++;
        const wHp = w === "player" ? sim.playerHp / P0.maxHp : w === "ai" ? sim.aiHp / A0.maxHp : 0; left.push(wHp);
      }
      secs.sort((a, b) => a - b); const med = secs[secs.length >> 1];
      out.push({ match: hi === lo ? "Even Lv" + hi : "Lv" + hi + " vs Lv" + lo, mode, bonusHi: wb(hi), bonusLo: wb(lo), strongWin: Math.round(100 * sw / n), medSecs: Math.round(med), timeouts: to, winnerHpLeft: Math.round(100 * left.reduce((a, b) => a + b, 0) / n) });
    }
    return out;
  }, [!!process.env.WB_ONLY, process.env.WB_PAIRS ? JSON.parse(process.env.WB_PAIRS) : null]);
  console.log(JSON.stringify(res, null, 0).replace(/},{/g, "},\n{"));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
