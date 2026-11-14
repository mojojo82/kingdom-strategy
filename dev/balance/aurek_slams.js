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
    const mk = (ros, isP) => { const st = arenaSideStats(ros, hs, 20, arenaBaseHpPlayer, false, null, null, undefined, ZERO_BONUS); (st.heroHp || []).forEach((e) => { e.runL = arenaRunDist(400, 240, ros.indexOf(e.id), isP); }); return st; };
    const opps = [["lyra", "roran", "kessa", "juno", "pip"], ["lyra", "kessa", "sera", "vesper", "seraphine"], ["roran", "kessa", "juno", "pip", "vesper"], ["lyra", "roran", "sera", "juno", "seraphine"]];
    const teams = { "Aurek + 4 ranged": ["aurek", "lyra", "kessa", "juno", "pip"], "melee team": ["aurek", "gareth", "bram", "torvald", "halo7"] }, out = [];
    Object.keys(teams).forEach((tn) => { const dist = {}; let tot = 0, n = 0, first = [], lens = 0;
      opps.forEach((op, oi) => { for (let s = 0; s < 10; s++) { const sd = "ac" + tn + oi + s, sim = arenaMakeSim(mk(teams[tn], true), mk(op, false), { rng: worldPvpSeededRng(sd), critSeed: sd }); let c = 0, t = 0;
        for (let i = 0; i < 400; i++) { const x = sim.step(); t++; if ((x.info.casts || []).indexOf("p_aurek") >= 0) { c++; if (c === 1) first.push(t * ARENA_TICK_MS / 1000); } if (x.done) break; }
        dist[c] = (dist[c] || 0) + 1; tot += c; n++; lens += t * ARENA_TICK_MS / 1000; } });
      out.push({ tn, avgSlams: (tot / n).toFixed(2), slamsPerFight: dist, firstSlamSec: (first.reduce((a, b) => a + b, 0) / Math.max(1, first.length)).toFixed(1), fightSec: (lens / n).toFixed(1) }); });
    return out; });
  r.forEach((x) => console.log(JSON.stringify(x)));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
