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
    const SK = HERO_DEFS.bram.conquestSkills[1], f0 = SK.hitsToFill;
    const myTeams = { "melee team": ["bram", "gareth", "torvald", "halo7", "caelum"], "Bram + 4 ranged": ["bram", "lyra", "kessa", "juno", "pip"] };
    const opps = [["lyra", "roran", "kessa", "juno", "pip"], ["lyra", "kessa", "sera", "vesper", "seraphine"], ["roran", "kessa", "juno", "pip", "vesper"], ["lyra", "roran", "sera", "juno", "seraphine"]];
    const out = [], st0 = mk(myTeams["melee team"], true), Lb = st0.limits.find((l) => l.key === "bram"), opH = mk(opps[0], false).heroHp.map((e) => e.id + ":" + Math.round(e.max));
    out.push({ blastValueLv5: Math.round(Lb.value), enemyHeroMaxHp: opH.join(" "), enemyFortHp: Math.round(mk(opps[0], false).maxHp) });
    [2, 3, 4, 5, 6, 8].forEach((fill) => { SK.hitsToFill = fill; SK.takenPts = 1; SK.swingPts = 0;
      Object.keys(myTeams).forEach((tn) => { let fights = 0, withFire = 0, fires = 0, firstAt = [];
        opps.forEach((op, oi) => { for (let s = 0; s < 5; s++) { const sd = "bc" + fill + tn + oi + s, sim = arenaMakeSim(mk(myTeams[tn], true), mk(op, false), { rng: worldPvpSeededRng(sd), critSeed: sd }); let n = 0, t = 0;
          for (let i = 0; i < 400; i++) { const x = sim.step(); t++; if ((x.info.pressure || []).indexOf("bram") >= 0) { n++; if (n === 1) firstAt.push(t * ARENA_TICK_MS / 1000); } if (x.done) break; }
          fights++; fires += n; if (n) withFire++; } });
        out.push({ fill, tn, fightsWithABlast: Math.round(100 * withFire / fights) + "%", blastsPerFight: (fires / fights).toFixed(2), firstBlastSec: firstAt.length ? (firstAt.reduce((a, b) => a + b, 0) / firstAt.length).toFixed(1) : "-" }); }); });
    SK.hitsToFill = f0; return out; });
  r.forEach((x) => console.log(JSON.stringify(x)));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
