/* Full-team Arena ranking (v1692, Harley): random 5-hero teams from the whole roster, at most ONE of the "big" heroes (Iron Lily, Kessa, Hanzo, Tom)
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
  const res = await P.evaluate(async ({ PER, SEEDS, LEVELS }) => {
    const BIG = ["ironlily", "kessa", "hanzo", "tom"], ALL = Object.keys(HERO_DEFS).filter((k) => !HERO_DEFS[k].comingSoon), REST = ALL.filter((k) => BIG.indexOf(k) < 0);
    let rs = 777; const rnd = () => { rs = (rs * 1103515245 + 12345) & 0x7fffffff; return rs / 0x7fffffff; };
    const pick = (arr, n) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };
    const teams = []; BIG.concat(["none"]).forEach((bg) => { for (let i = 0; i < PER; i++) teams.push({ tag: bg, ros: bg === "none" ? pick(REST, 5) : pick(REST, 4).concat([bg]) }); });
    teams.forEach((t) => { t.ros = pick(t.ros, 5); }); /* random slot order */
    const out = { teams: teams.map((t) => ({ tag: t.tag, ros: t.ros })), levels: {}, names: {} }; ALL.forEach((k) => { out.names[k] = HERO_DEFS[k].name; });
    for (const lvl of LEVELS) {
      const arms = lvl >= 80 ? 25 : 10, sk = lvl >= 80 ? 5 : 3, hs = {}; ALL.forEach((k) => { hs[k] = { owned: true, level: lvl, stars: arms, skillLevels: { conquest: [sk, sk, sk], expedition: [sk, sk, sk] } }; });
      const mk = (roster, isP) => { const st = arenaSideStats(roster, hs, 20, arenaBaseHpPlayer, false, null, null, undefined, ZERO_BONUS); (st.heroHp || []).forEach((e) => { const ix = roster.indexOf(e.id); if (ix >= 0) e.runL = arenaRunDist(400, 240, ix, isP); }); return st; };
      const sc = teams.map(() => ({ w: 0, l: 0, d: 0 })); let fights = 0;
      for (let i = 0; i < teams.length; i++) { for (let j = 0; j < teams.length; j++) { if (i === j) continue;
          for (let s = 0; s < SEEDS; s++) { const seed = "T" + lvl + "|" + i + "|" + j + "|" + s; const w = arenaMakeSim(mk(teams[i].ros, true), mk(teams[j].ros, false), { rng: worldPvpSeededRng(seed), critSeed: seed }).runToEnd(); fights++;
            if (w === "player") { sc[i].w++; sc[j].l++; } else if (w === "ai") { sc[i].l++; sc[j].w++; } else { sc[i].d++; sc[j].d++; } } }
        await new Promise((r2) => setTimeout(r2, 0)); }
      out.levels[lvl] = { sc, fights };
    }
    return out;
  }, { PER, SEEDS, LEVELS });
  const lines = [];
  for (const lvl of Object.keys(res.levels)) {
    const { sc, fights } = res.levels[lvl];
    const rows = res.teams.map((t, i) => { const s = sc[i], g = s.w + s.l + s.d; return { t, p: g ? (s.w + s.d / 2) / g : 0 }; }).sort((a, b) => b.p - a.p);
    lines.push("\nLv" + lvl + "  (" + res.teams.length + " teams, " + fights + " fights)");
    const byTag = {}; rows.forEach((r, i) => { (byTag[r.t.tag] = byTag[r.t.tag] || []).push({ rank: i + 1, p: r.p }); });
    Object.keys(byTag).forEach((tg) => { const a = byTag[tg], avgP = a.reduce((s, x) => s + x.p, 0) / a.length, avgR = a.reduce((s, x) => s + x.rank, 0) / a.length;
      lines.push("  " + (tg + "         ").slice(0, 9) + " avg win " + (avgP * 100).toFixed(1).padStart(5) + "%  avg rank " + avgR.toFixed(1).padStart(5) + "  best " + a[0].rank + "  worst " + a[a.length - 1].rank + "  ranks " + a.map((x) => x.rank).join(",")); });
    lines.push("  top 15:"); rows.slice(0, 15).forEach((r, i) => lines.push("   " + String(i + 1).padStart(2) + ". " + (r.p * 100).toFixed(1).padStart(5) + "%  [" + r.t.tag + "] " + r.t.ros.map((k) => res.names[k]).join(", ")));
    lines.push("  Tom teams:"); rows.forEach((r, i) => { if (r.t.tag === "tom") lines.push("   " + String(i + 1).padStart(2) + ". " + (r.p * 100).toFixed(1).padStart(5) + "%  " + r.t.ros.map((k) => res.names[k]).join(", ")); });
  }
  console.log(lines.join("\n"));
  fs.writeFileSync(path.join(__dirname, "results", "team_rank_" + (process.env.TAG || "latest") + ".json"), JSON.stringify(res, null, 1));
  await b.close();
})();
