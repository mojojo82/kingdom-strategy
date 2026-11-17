/* Alliance Siege rally damage (v1705): one World PvP-style battle - the leader's heroes + every member's troops vs the siege boss.
   Prints total damage for rally sizes / troop tiers / hero levels, to set the reward tiers.  Usage: node dev/balance/siege_rally.js */
const fs = require("fs"), path = require("path"), ROOT = path.join(__dirname, "../..");
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
  await P.fill("#ksE", "sgr" + process.pid + "@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 120000 }); await P.fill("#ksN", "Sim"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const res = await P.evaluate(() => {
    const out = [], ROS = ["gareth", "lyra", "seraphine", "torvald", "roran"].filter((k) => HERO_DEFS[k]);
    const S = game.state;
    for (const lvl of [20, 40, 80]) {
      const arms = lvl >= 80 ? 25 : lvl >= 40 ? 10 : 4, sk = lvl >= 80 ? 5 : lvl >= 40 ? 3 : 1;
      ROS.forEach((k) => { S.heroes[k] = Object.assign(S.heroes[k] || {}, { owned: true, level: lvl, stars: arms, skillLevels: { conquest: [sk, sk, sk], expedition: [sk, sk, sk] } }); });
      for (const tier of [3, 6, 10]) for (const total of [0, 20000, 100000, 400000, 900000]) for (const n of [1, 15]) {
        if (n === 1 && total > 100000) continue;
        const members = {}, armies = {}; for (let i = 0; i < n; i++) { const u = "u" + i; members[u] = u; const per = Math.floor(total / n / 3), a = {}; if (per > 0) ["infantry", "archer", "cavalry"].forEach((t) => { a[troopKey(t, tier)] = per; }); armies[u] = a; }
        const r = { id: "cal" + lvl + tier + total + n, leader: "u0", members, armies, heroes: ROS };
        const t0 = performance.now(), o = sgRallyBattle(r, game);
        out.push({ lvl, tier, total, n, dmg: o.total, lead: o.shares.u0, other: n > 1 ? o.shares.u1 : null, troopPart: o.troopPart, surv: o.survived, secs: o.secs, bossLv: o.lv, ms: Math.round(performance.now() - t0) });
      }
    }
    return out;
  });
  const f = (x) => x == null ? "-" : x >= 1e9 ? (x / 1e9).toFixed(2) + "B" : x >= 1e6 ? (x / 1e6).toFixed(2) + "M" : x >= 1e3 ? (x / 1e3).toFixed(1) + "K" : String(x);
  console.log("heroLv tier troops players |  damage   leader  member  troop% survived secs bossLv ms");
  res.forEach((r) => console.log(String(r.lvl).padStart(5), ("T" + r.tier).padStart(4), f(r.total).padStart(7), String(r.n).padStart(6), " |", f(r.dmg).padStart(8), f(r.lead).padStart(8), f(r.other).padStart(7), (r.troopPart * 100).toFixed(0).padStart(5) + "%", String(r.surv).padStart(7), String(r.secs).padStart(4), String(r.bossLv).padStart(5), String(r.ms).padStart(5)));
  fs.writeFileSync(path.join(__dirname, "results", "siege_rally_latest.json"), JSON.stringify(res, null, 1));
  await b.close();
})();
