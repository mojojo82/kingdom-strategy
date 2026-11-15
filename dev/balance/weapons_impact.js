/* How much do weapons decide an Arena fight? Lv80 5* heroes skills 5, full fortress research both sides. EXCL=hanzo,ironlily (default). Run: PW_PATH=playwright CHROME_PATH=... node dev/balance/weapons_impact.js */
const fs = require("fs"), path = require("path");
const ROOT = require("path").join(__dirname, "../.."), OUTD = __dirname + "/results";
const { chromium } = require("playwright");
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, require(path.join(ROOT, "dev/tests/siteroute.js"))(GAME));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/", { timeout: 120000 }); await P.waitForSelector("#ksAuth .box", { timeout: 120000 });
  await P.fill("#ksE", "sc" + Date.now() + "@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 120000 }); await P.fill("#ksN", "PipTest"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => { const st = game.state; ["caelum", "kessa", "lyra"].forEach((k) => { st.heroes[k].owned = true; st.heroes[k].level = 40; st.heroes[k].skillLevels = { conquest: [3, 5, 3], expedition: [1, 1, 1] }; }); st.conquestRoster = ["caelum", "kessa", "lyra"]; document.querySelectorAll(".ks-update, #ksUpdate").forEach((e) => e.remove()); setScreen("more", "arena"); });
  await P.waitForTimeout(3000);
  if (process.env.SKIPR) await P.evaluate(() => { ARENA_MELEE_BASIC_SKIPS_RANGED = true; });
  await P.evaluate((ex) => { window.__EXCL = ex; }, process.env.EXCL || "hanzo,ironlily"); if (process.env.OLDARENA) await P.evaluate(() => { ARENA_BASIC_MULT_ON = false; });
  if (process.env.MULT) await P.evaluate((m) => { ARENA_MELEE_ATK_MULT = m; }, +process.env.MULT);
  const r = await P.evaluate(() => {
    const EX = (window.__EXCL || "hanzo,ironlily").split(","), H = Object.keys(HERO_DEFS).filter((k) => !HERO_DEFS[k].comingSoon && EX.indexOf(k) < 0), hs = {};
    H.forEach((k) => { hs[k] = { owned: true, level: 80, stars: 25, skillLevels: { conquest: [5, 5, 5], expedition: [5, 5, 5] } }; });
    const T = FORTRESS1_TREE, F1 = {}; Object.keys(T).forEach((k) => { F1[k] = T[k].maxLevel; });
    const mk = (ros, isP) => { const st = arenaSideStats(ros, hs, 20, arenaBaseHpPlayer, false, null, F1, undefined, ZERO_BONUS); (st.heroHp || []).forEach((e) => { e.runL = arenaRunDist(400, 240, ros.indexOf(e.id), isP); }); return st; };
    const kit = (lv) => { if (!lv) return { specs: [], shieldPct: 0, salvo: null }; const m = {}; ["missile_barrage", "laser_beam", "railgun"].forEach((id) => { m[id] = lv; }); return botWeaponsToSim(m); };
    const fight = (a, b, ka, kb, seed) => { const sim = arenaMakeSim(mk(a, true), mk(b, false), { rng: worldPvpSeededRng(seed), critSeed: seed, weapons: ka.specs, aiWeapons: kb.specs, shieldPct: ka.shieldPct, aiShieldPct: kb.shieldPct, salvoP: ka.salvo, salvoA: kb.salvo }); const w = sim.runToEnd(); return w === "player" ? 1 : w === "ai" ? 0 : 0.5; };
    /* a wins %, both sides swapped, 2 seeds */
    const wr = (a, b, la, lb, tag) => { let s = 0, n = 0; for (let sd = 0; sd < 2; sd++) { s += fight(a, b, kit(la), kit(lb), tag + "a" + sd); s += 1 - fight(b, a, kit(lb), kit(la), tag + "b" + sd); n += 2; } return s / n; };
    let rs = 12345; const rnd = () => { rs = (rs * 1103515245 + 12345) % 2147483648; return rs / 2147483648; };
    const team = () => { const a = H.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, 5); };
    const out = {};
    /* A: same 5 heroes on both sides, one side armed */
    const A = []; for (let i = 0; i < 30; i++) A.push(team());
    [[50, 0], [50, 25], [25, 0], [10, 0]].forEach(([x, y]) => { let s = 0; A.forEach((t, i) => { s += wr(t, t, x, y, "A" + i + x + y); }); out["sameHeroes_W" + x + "_vs_W" + y] = Math.round(100 * s / A.length); });
    /* B: random team vs random team */
    const N = 150, P2 = []; for (let i = 0; i < N; i++) P2.push([team(), team()]);
    let flipArm = 0, lopsided = 0, flipArmLop = 0, sameBoth = 0, close = 0, flipClose = 0, flipHalf = 0;
    P2.forEach(([a, b], i) => { const base = wr(a, b, 0, 0, "B" + i), strong = base >= 0.5 ? a : b, weak = base >= 0.5 ? b : a, bw = Math.max(base, 1 - base);
      const armedWeak = wr(weak, strong, 50, 0, "Bw" + i), halfArmed = wr(weak, strong, 50, 25, "Bh" + i), both = wr(a, b, 50, 50, "Bb" + i);
      if (armedWeak > 0.5) flipArm++; if (halfArmed > 0.5) flipHalf++;
      if (bw >= 0.75) { lopsided++; if (armedWeak > 0.5) flipArmLop++; } else { close++; if (armedWeak > 0.5) flipClose++; }
      if ((base >= 0.5) === (both >= 0.5)) sameBoth++; });
    out.randomPairs = N; out.weakerTeamWinsWhenOnlyItHasLv50Weapons = Math.round(100 * flipArm / N);
    out.weakerTeamWinsWithLv50vsEnemyLv25 = Math.round(100 * flipHalf / N);
    out.lopsidedPairs = lopsided; out.lopsidedFlippedByWeapons = lopsided ? Math.round(100 * flipArmLop / lopsided) : null;
    out.closePairs = close; out.closeFlippedByWeapons = close ? Math.round(100 * flipClose / close) : null;
    out.sameWinnerWhenBothArmed = Math.round(100 * sameBoth / N);
    return out;
  });
  console.log(JSON.stringify(r, null, 1), "\nerrs", JSON.stringify(errs.slice(0, 3)));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
