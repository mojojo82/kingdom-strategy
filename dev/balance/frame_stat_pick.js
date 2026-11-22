/* FRAME STAT PICK (v1842, Harley 23 Nov 2026): which hero bonus stat is strongest in the ARENA - one side gets +X% to only ATK, only HP or only DEF on top of the same base bonus;
   win % and fortress-HP margin over random Lv80 5* teams, both sides swapped. Used to rank avatar-frame bonuses (every frame gives the same amount; the stat decides how good it is).
   node dev/balance/frame_stat_pick.js */
const fs = require("fs"), path = require("path");
const ROOT = require("path").join(__dirname, "../.."), OUTD = __dirname + "/results";
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome", args: ["--no-sandbox"] }), errs = [];
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
  if (process.env.NOCRIT) await P.evaluate(() => { fortressCritRoll = function () { return 1; }; }); if (process.env.NOSTAGGER) await P.evaluate(() => { worldPvpSeededRng = function () { return function () { return 0; }; }; });
  await P.evaluate((f) => { window.__FORT = f; }, +(process.env.FORT || 1)); await P.evaluate((p) => { window.__POOL = p; }, process.env.POOL || ""); await P.evaluate((ex) => { window.__EXCL = ex; }, process.env.EXCL || "hanzo,ironlily"); if (process.env.OLDARENA) await P.evaluate(() => { ARENA_BASIC_MULT_ON = false; });
  if (process.env.MULT) await P.evaluate((m) => { ARENA_MELEE_ATK_MULT = m; }, +process.env.MULT);
  const r = await P.evaluate(async () => {
    const EX = ["hanzo", "ironlily"], H = Object.keys(HERO_DEFS).filter((k) => !HERO_DEFS[k].comingSoon && EX.indexOf(k) < 0), hs = {};
    H.forEach((k) => { hs[k] = { owned: true, level: 80, stars: 25, skillLevels: { conquest: [5, 5, 5], expedition: [5, 5, 5] } }; });
    const F1 = {}; Object.keys(FORTRESS1_TREE).forEach((k) => { F1[k] = FORTRESS1_TREE[k].maxLevel; });
    const mk = (ros, isP, bx) => { const st = arenaSideStats(ros, hs, 20, arenaBaseHpPlayer, false, null, F1, undefined, bx); (st.heroHp || []).forEach((e) => { e.runL = arenaRunDist(400, 240, ros.indexOf(e.id), isP); }); return st; };
    const kit = (lv) => { if (!lv) return { specs: [], shieldPct: 0, salvo: null }; const m = {}; ["missile_barrage", "laser_beam", "railgun"].forEach((id) => { m[id] = lv; }); return botWeaponsToSim(m); };
    /* returns [win (1/0.5/0), margin = A's fortress HP left % minus B's] */
    const fight = (a, b, ka, kb, seed, xa, xb) => { const pa = mk(a, true, xa), pb = mk(b, false, xb); const sim = arenaMakeSim(pa, pb, { rng: worldPvpSeededRng(seed), critSeed: seed, weapons: ka.specs, aiWeapons: kb.specs, shieldPct: ka.shieldPct, aiShieldPct: kb.shieldPct, salvoP: ka.salvo, salvoA: kb.salvo }); const w = sim.runToEnd();
      return [w === "player" ? 1 : w === "ai" ? 0 : 0.5, sim.playerHp / pa.maxHp - sim.aiHp / pb.maxHp]; };
    let rs = 12345; const rnd = () => { rs = (rs * 1103515245 + 12345) % 2147483648; return rs / 2147483648; };
    const team = () => { const a = H.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, 5); };
    const TM = []; for (let i = 0; i < 16; i++) TM.push(team());
    const out = {};
    for (const base of [0, 300]) for (const wl of [0, 30]) for (const x of [10, 25]) for (const stat of ["atk", "hp", "def"]) {
      const B = { atk: base, hp: base, def: base, skill: base }, X = Object.assign({}, B); X[stat] = base + x;
      let w = 0, n = 0, m = 0;
      TM.forEach((t, i) => { for (let sd = 0; sd < 3; sd++) { let r1 = fight(t, t, kit(wl), kit(wl), "G" + i + "_" + sd, X, B); let r2 = fight(t, t, kit(wl), kit(wl), "H" + i + "_" + sd, B, X); w += r1[0] + (1 - r2[0]); m += r1[1] - r2[1]; n += 2; } });
      out["base" + base + " weapons" + wl + " +" + x + " " + stat] = { win: Math.round(100 * w / n), marginPct: Math.round(1000 * m / n) / 10 };
      await new Promise((r) => setTimeout(r, 0));
    }
    return out;
  });
  console.log(JSON.stringify(r, null, 1), "\nerrs", JSON.stringify(errs.slice(0, 3)));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
