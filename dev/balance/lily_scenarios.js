/* after v1722 (Harley: "in what scenarios does Lily do good"): Lily teams of different make-ups vs different opponent types, Lv80 25* skills 5, Arena engine, no cards/weapons. Based on team_rank.js.
   Full-team Arena ranking (v1692, Harley): random 5-hero teams from the whole roster, at most ONE of the "big" heroes (Iron Lily, Kessa, Hanzo, Tom)
   per team. Every team fights every other team, both sides, fixed seeds; a team's score = its win rate (draws = half). Shows where the teams with each
   big hero (and with none) rank.  Usage: node dev/balance/team_rank.js [--per 12] [--seeds 1] [--levels 40,80] */
const fs = require("fs"), path = require("path"), ROOT = path.join(__dirname, "../..");
const args = process.argv.slice(2), arg = (k, d) => { const i = args.indexOf("--" + k); return i >= 0 ? args[i + 1] : d; };
const PER = +arg("per", 12), SEEDS = +arg("seeds", 1), LEVELS = arg("levels", "40,80").split(",").map(Number);
(async () => {
  const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
  const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome";
  const GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8"), FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8");
  const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 } });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, require(path.join(ROOT, "dev/tests/siteroute.js"))(GAME));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => process.stderr.write("PAGEERR " + e.message + "\n"));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/", { timeout: 180000 }); await P.waitForSelector("#ksAuth .box", { timeout: 120000 });
  await P.fill("#ksE", "trank" + process.pid + "@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 120000 }); await P.fill("#ksN", "Sim"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => setScreen("city"));
  const res = await P.evaluate(async () => {
    const ALL = Object.keys(HERO_DEFS).filter((k) => !HERO_DEFS[k].comingSoon || k === "ironlily"), BIG = ["ironlily", "kessa", "hanzo", "tom"];
    const MEL = ALL.filter((k) => HERO_DEFS[k].class === "infantry" && !BIG.includes(k)), RNG = ALL.filter((k) => HERO_DEFS[k].class !== "infantry" && !BIG.includes(k));
    let rs = 4242; const rnd = () => { rs = (rs * 1103515245 + 12345) & 0x7fffffff; return rs / 0x7fffffff; };
    const pick = (arr, n) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };
    const lvl = 80, hs = {}; ALL.forEach((k) => { hs[k] = { owned: true, level: lvl, stars: 25, skillLevels: { conquest: [5, 5, 5], expedition: [5, 5, 5] } }; });
    const mk = (roster, isP) => { const st = arenaSideStats(roster, hs, 20, arenaBaseHpPlayer, false, null, null, undefined, ZERO_BONUS); (st.heroHp || []).forEach((e) => { const ix = roster.indexOf(e.id); if (ix >= 0) e.runL = arenaRunDist(400, 240, ix, isP); }); return st; };
    const N = 15, gen = (f) => { const o = []; for (let i = 0; i < N; i++) o.push(f()); return o; };
    const LILY = { "Lily + 4 ranged": gen(() => pick(RNG, 4).concat(["ironlily"])), "Lily + 4 melee": gen(() => pick(MEL, 4).concat(["ironlily"])), "Lily + 2 melee + 2 ranged": gen(() => pick(MEL, 2).concat(pick(RNG, 2), ["ironlily"])) };
    const OPP = { "all-ranged teams": gen(() => pick(RNG, 5)), "all-melee teams": gen(() => pick(MEL, Math.min(5, MEL.length))), "mixed teams (no Hanzo/Kessa)": gen(() => pick(MEL, 2).concat(pick(RNG, 3))), "teams with Kessa": gen(() => pick(MEL.concat(RNG), 4).concat(["kessa"])), "teams with Hanzo": gen(() => pick(MEL.concat(RNG), 4).concat(["hanzo"])) };
    const out = { mel: MEL, rng: RNG, rows: [] };
    for (const ln of Object.keys(LILY)) { const row = { lily: ln };
      for (const on of Object.keys(OPP)) { let w = 0, n = 0;
        LILY[ln].forEach((T, i) => OPP[on].forEach((O, j) => { for (let s = 0; s < 2; s++) { const seed = "L|" + i + "|" + j + "|" + s; const A = s ? arenaMakeSim(mk(T, true), mk(O, false), { rng: worldPvpSeededRng(seed), critSeed: seed }).runToEnd() : arenaMakeSim(mk(O, true), mk(T, false), { rng: worldPvpSeededRng(seed), critSeed: seed }).runToEnd();
          if ((s && A === "player") || (!s && A === "ai")) w++; else if (A !== "player" && A !== "ai") w += 0.5; n++; } }));
        row[on] = Math.round(100 * w / n); await new Promise((r) => setTimeout(r, 0)); }
      out.rows.push(row); }
    // same teams with Lily swapped for a random other hero of the pool, as a baseline
    const base = { lily: "same teams, Lily swapped for Aurek" };
    for (const on of Object.keys(OPP)) { let w = 0, n = 0;
      Object.values(LILY).forEach((arr) => arr.forEach((T, i) => { const T2 = T.map((k) => k === "ironlily" ? (T.includes("aurek") ? "gareth" : "aurek") : k); OPP[on].forEach((O, j) => { const seed = "B|" + i + "|" + j; const A = arenaMakeSim(mk(T2, true), mk(O, false), { rng: worldPvpSeededRng(seed), critSeed: seed }).runToEnd(); if (A === "player") w++; else if (A !== "ai") w += 0.5; n++; }); }));
      base[on] = Math.round(100 * w / n); }
    out.rows.push(base);
    return out;
  });
  console.log("melee pool:", res.mel.join(","), "| ranged pool:", res.rng.join(","));
  res.rows.forEach((r) => console.log(JSON.stringify(r)));
  fs.writeFileSync(path.join(__dirname, "results", "lily_scenarios.json"), JSON.stringify(res, null, 1));
  await b.close();
})();
