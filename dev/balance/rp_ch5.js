/* RP rate vs Conquest (Harley, 11 Oct 2026): is Research Point income too high, and would a lower rate make Chapter 5 a wall?
   Only Fortress research changes Conquest (the normal tree is troops / economy / growth), so: for a few player setups, buy Fortress I research
   with a growing RP budget (cheapest next level first), climb Conquest until stuck, and report the wall. For each budget also report
   (a) how long the research timers take in total and (b) how long the Academy needs to earn that RP at several rates.
   node dev/balance/rp_ch5.js   (WORKERS=4 to run in parallel) */
const fs = require("fs"), path = require("path"), cp = require("child_process");
const ROOT = path.join(__dirname, "../..");
const BUDGETS = [0, 3e4, 1e5, 3e5, 1e6, 3e6, 1e7, 3e7];
const SETUPS = {
  duo20: { label: "Gareth + Lyra Lv20, TH10", heroes: ["gareth", "lyra"], lvl: 20, stars: 0, sk: 1, th: 10 },
  four30: { label: "4 heroes Lv30 1*, TH15", heroes: ["gareth", "lyra", "roran", "kessa"], lvl: 30, stars: 5, sk: 1, th: 15 },
  five40: { label: "5 heroes Lv40 2*, TH20", heroes: ["gareth", "lyra", "roran", "kessa", "sera"], lvl: 40, stars: 10, sk: 2, th: 20 }
};
const lab = (gl) => (Math.floor((gl - 1) / 20) + 1) + "-" + (((gl - 1) % 20) + 1);
if (process.env.KS_WORKER) worker(); else main();

async function main() {
  const jobs = []; Object.keys(SETUPS).forEach((s) => BUDGETS.forEach((b) => jobs.push({ setup: s, budget: b })));
  const W = Math.max(1, Math.min(+(process.env.WORKERS || 4), jobs.length)), parts = Array.from({ length: W }, () => []);
  jobs.forEach((j, i) => parts[i % W].push(j));
  const res = (await Promise.all(parts.map((p) => new Promise((ok, bad) => {
    const ch = cp.spawn(process.execPath, [__filename], { env: Object.assign({}, process.env, { KS_WORKER: "1", KS_JOBS: JSON.stringify(p) }), stdio: ["ignore", "pipe", "inherit"] });
    let out = ""; ch.stdout.on("data", (d) => { out += d; }); ch.on("close", (c) => { if (c) bad(new Error("worker " + c)); else ok(JSON.parse(out.slice(out.lastIndexOf("@@") + 2))); });
  })))).flat();
  const hrs = (s) => s < 3600 ? Math.round(s / 60) + "m" : s < 172800 ? (s / 3600).toFixed(1) + "h" : (s / 86400).toFixed(1) + "d";
  const out = { when: new Date().toISOString(), rows: [] };
  Object.keys(SETUPS).forEach((s) => {
    console.log("\n" + SETUPS[s].label);
    console.log("  RP budget   wall   timers   | RP earn time at Academy 10:  x1 (now)  x0.5   x0.25");
    BUDGETS.forEach((b) => {
      const r = res.find((x) => x.setup === s && x.budget === b), earn = (mult) => hrs(r.spent / (3 * 10 * mult));
      out.rows.push(Object.assign({ label: SETUPS[s].label }, r));
      console.log("  " + String(b).padStart(9) + "  " + lab(r.wall).padStart(5) + "  " + hrs(r.timerSec).padStart(7) + "   |" + " ".repeat(30) + earn(1).padStart(6) + earn(0.5).padStart(8) + earn(0.25).padStart(8));
    });
  });
  fs.mkdirSync(path.join(__dirname, "results"), { recursive: true }); fs.writeFileSync(path.join(__dirname, "results", "rp_ch5.json"), JSON.stringify(out, null, 1));
}

async function worker() {
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
  await P.fill("#ksE", "rp" + process.pid + "@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 20000 }); await P.fill("#ksN", "Sim"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => setScreen("city"));
  const out = [];
  for (const job of JSON.parse(process.env.KS_JOBS)) {
    out.push(await P.evaluate(async ({ job, SU }) => {
      /* Fortress I research: buy the cheapest next level anywhere in the tree until the budget runs out */
      const T = FORTRESS1_TREE, ft = {}; let spent = 0, timerSec = 0;
      for (;;) { let best = null;
        Object.keys(T).forEach((k) => { const lv = (ft[k] || 0) + 1; if (lv > T[k].maxLevel) return; const c = fortressNodeCost(k, lv); if (!best || c < best.c) best = { k, lv, c }; });
        if (!best || spent + best.c > job.budget) break; ft[best.k] = best.lv; spent += best.c; timerSec += fortressTimeFor(best.k, best.lv); }
      let simTime = 1000; const sim = createGame({ now: () => simTime, mapSize: 5, seed: 1, combatSeed: 500000 }), s = sim.state;
      Object.keys(s.heroes).forEach((k) => { s.heroes[k].owned = false; s.heroes[k].level = 0; s.heroes[k].stars = 0; s.heroes[k].skillLevels = { conquest: [1, 1, 1], expedition: [1, 1, 1] }; });
      SU.heroes.forEach((k) => { const h = s.heroes[k]; h.owned = true; h.level = SU.lvl; h.stars = SU.stars; h.skillLevels = { conquest: [SU.sk, SU.sk, SU.sk], expedition: [SU.sk, SU.sk, SU.sk] }; });
      s.conquestRoster = SU.heroes.slice(0, 5); s.equippedWeapons = []; s.weaponLevels = {}; s.tech = {}; s.fortressTech = ft;
      Object.keys(s.buildings).forEach((k) => { s.buildings[k].level = k === "townhall" ? SU.th : 0; });
      s.equippedEsper = null; s.idle.fortressCannonEnabled = true; s.idle.fortressCannonTargetMode = "front"; setEquipBonus({});
      const STABLE = 20000, MAXT = 300000; let last = sim.idleLevelLabel(), lastAt = 0, i = 0;
      for (; i < MAXT; i++) { simTime += 1000; sim.tick(); const L = sim.idleLevelLabel(); if (L !== last) { last = L; lastAt = i; } if (i - lastAt > STABLE) break; if (i % 5000 === 0) await new Promise((r) => setTimeout(r, 0)); }
      return { setup: job.setup, budget: job.budget, spent, timerSec, nodes: Object.keys(ft).length, levels: Object.values(ft).reduce((a, x) => a + x, 0), wall: (s.idle.chapter - 1) * 20 + s.idle.levelNum };
    }, { job, SU: SETUPS[job.setup] }));
  }
  await b.close();
  process.stdout.write("@@" + JSON.stringify(out));
}
