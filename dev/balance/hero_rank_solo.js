/* v1606: hero strength ranking - every hero Lv80 5* skills 5, no weapons: 1v1 Arena duel round robin (3 seeds each way) + solo damage to the kaiju in 60 s. Run: PW_PATH=playwright CHROME_PATH=... node dev/balance/hero_rank_solo.js */
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
  const r = await P.evaluate(() => {
    const H = Object.keys(HERO_DEFS).filter((k) => !HERO_DEFS[k].comingSoon), hs = {};
    H.forEach((k) => { hs[k] = { owned: true, level: 80, stars: 25, skillLevels: { conquest: [5, 5, 5], expedition: [5, 5, 5] } }; });
    const mk = (k, isP) => { const st = arenaSideStats([k], hs, 20, arenaBaseHpPlayer, false, null, null, undefined, ZERO_BONUS); (st.heroHp || []).forEach((e) => { e.runL = arenaRunDist(400, 240, 0, isP); }); return st; };
    const sc = {}; H.forEach((k) => { sc[k] = 0; });
    for (let a = 0; a < H.length; a++) for (let b = 0; b < H.length; b++) { if (a === b) continue; for (let s = 0; s < 3; s++) { const sd = "d" + a + "_" + b + "_" + s, sim = arenaMakeSim(mk(H[a], true), mk(H[b], false), { rng: worldPvpSeededRng(sd), critSeed: sd }); const w = sim.runToEnd(); if (w === "player") sc[H[a]]++; else if (w === "ai") sc[H[b]]++; else { sc[H[a]] += 0.5; sc[H[b]] += 0.5; } } }
    const kd = {}; H.forEach((k) => { let t = 0; for (let s = 0; s < 3; s++) { const sim = arenaMakeSim(mk(k, true), kaijuAiStats(KAIJU_INF), { rng: worldPvpSeededRng("k" + k + s), critSeed: "k" + k + s, boss: { passive: true }, aiCannon: false, aiWeapons: [], maxTicks: kaijuTicks() }); sim.runToEnd(); t += KAIJU_INF - sim.aiHp; } kd[k] = Math.round(t / 3); });
    const cannon = (() => { const st = arenaSideStats([], hs, 20, arenaBaseHpPlayer, false, null, null, undefined, ZERO_BONUS); const sim = arenaMakeSim(st, kaijuAiStats(KAIJU_INF), { rng: worldPvpSeededRng("c"), critSeed: "c", boss: { passive: true }, aiCannon: false, aiWeapons: [], maxTicks: kaijuTicks() }); sim.runToEnd(); return Math.round(KAIJU_INF - sim.aiHp); })();
    return H.map((k) => ({ k, name: HERO_DEFS[k].name, rar: HERO_DEFS[k].rarity, cls: HERO_DEFS[k].class, duel: Math.round(100 * sc[k] / ((H.length - 1) * 6)), kaiju: kd[k] - cannon })).sort((x, y) => y.duel - x.duel).concat([{ cannonOnly: cannon }]);
  });
  r.forEach((x) => console.log(JSON.stringify(x)));
  console.log("errs", errs.slice(0, 3)); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
