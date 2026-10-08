/* Balance test kit (v954). One command, the real TEST game engine, headless, deterministic seeds.
   node dev/balance/run.js [--cfg '{"rangedPct":50,"heroDmgMult":3}'] [--only conquest,swap,arena] [--seeds 2] [--save name] [--vs baseline]
   - conquest: each player setup climbs Conquest until stuck -> where they get stuck ("wall") and Gareth's first KO.
   - swap:     6 heroes owned, each one left out in turn -> how far the other 5 get (who is a must-pick in Conquest).
   - arena:    teams = 6 heroes minus one, every pair fights both ways -> wins (who is a must-pick in Arena).
   --cfg sets hero rules (game.heroKoCfg keys) for BOTH modes; enemyScale:{..} = Conquest enemy scaling; arenaBaseHp = extra Arena fortress HP (game default 0, Harley's owner copy 1870). Results: dev/balance/results/<name>.json; --vs prints the change against a saved run. */
const fs = require("fs"), path = require("path"), cp = require("child_process");
const ROOT = path.join(__dirname, "../..");
const args = process.argv.slice(2), arg = (k, d) => { const i = args.indexOf("--" + k); return i >= 0 ? args[i + 1] : d; };
const CFG = JSON.parse(arg("cfg", "{}")), ONLY = arg("only", "conquest,swap,arena").split(","), SEEDS = +arg("seeds", 2), SAVE = arg("save", ""), VS = arg("vs", "");
const SETUPS = { new: "New player (Gareth+Lyra Lv1)", duo20: "Gareth+Lyra Lv20", five40: "5 heroes Lv40 2*", five80: "5 heroes Lv80 5*", maxall: "Max heroes+weapons+buildings" };
const HEROES = ["gareth", "lyra", "roran", "kessa", "sera", "torvald"];
const lab = (gl) => gl == null ? "never" : (Math.floor((gl - 1) / 20) + 1) + "-" + (((gl - 1) % 20) + 1);

if (process.env.KS_WORKER) { worker(); } else { main(); }

async function main() {
  const jobs = [];
  if (ONLY.includes("conquest")) Object.keys(SETUPS).forEach((s) => { for (let sd = 0; sd < SEEDS; sd++) jobs.push({ kind: "cq", setup: s, seed: sd }); });
  if (ONLY.includes("swap")) ["six40", "six80"].forEach((s) => HEROES.forEach((out) => { for (let sd = 0; sd < SEEDS; sd++) jobs.push({ kind: "cq", setup: s, out, seed: sd }); }));
  if (ONLY.includes("arena")) jobs.push({ kind: "arena" });
  const W = Math.max(1, Math.min(+(process.env.WORKERS || 2), jobs.length)), parts = Array.from({ length: W }, () => []);
  jobs.sort((a, b) => (b.kind === "arena") - (a.kind === "arena")).forEach((j, i) => parts[i % W].push(j));
  const res = (await Promise.all(parts.map((p) => new Promise((ok, bad) => {
    const ch = cp.spawn(process.execPath, [__filename, ...args], { env: Object.assign({}, process.env, { KS_WORKER: "1", KS_JOBS: JSON.stringify(p) }), stdio: ["ignore", "pipe", "inherit"] });
    let out = ""; ch.stdout.on("data", (d) => { out += d; }); ch.on("close", (c) => { if (c) bad(new Error("worker " + c)); else { try { ok(JSON.parse(out.slice(out.lastIndexOf("@@") + 2))); } catch (e) { bad(e); } } });
  })))).flat();
  const R = summarise(res); R.cfg = CFG; R.when = new Date().toISOString();
  print(R, VS ? JSON.parse(fs.readFileSync(path.join(__dirname, "results", VS + ".json"), "utf8")) : null);
  if (SAVE) { fs.mkdirSync(path.join(__dirname, "results"), { recursive: true }); fs.writeFileSync(path.join(__dirname, "results", SAVE + ".json"), JSON.stringify(R, null, 1)); console.log("saved results/" + SAVE + ".json"); }
}
function med(a) { a = a.slice().sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; }
function summarise(res) {
  const R = { conquest: {}, swap: {}, arena: null };
  res.forEach((r) => {
    if (r.kind === "arena") { R.arena = r.arena; return; }
    const k = r.out ? r.setup + "|" + r.out : r.setup, box = r.out ? R.swap : R.conquest;
    (box[k] = box[k] || { walls: [], kos: [], koCount: [] }); box[k].walls.push(r.wall); box[k].kos.push(r.firstKo); box[k].koCount.push(r.koCount); (box[k].ds = box[k].ds || []).push(r.ds);
  });
  [R.conquest, R.swap].forEach((box) => Object.keys(box).forEach((k) => { const b = box[k]; b.wall = med(b.walls); const ks = b.kos.filter((x) => x != null); b.firstKo = ks.length ? Math.min.apply(null, ks) : null; }));
  return R;
}
function print(R, B) {
  const d = (a, b) => b == null ? "" : " (" + ((a - b) / 20 >= 0 ? "+" : "") + ((a - b) / 20).toFixed(1) + "ch)";
  console.log("\nCONFIG " + JSON.stringify(R.cfg));
  if (Object.keys(R.conquest).length) {
    console.log("\nCONQUEST           stuck at      Gareth first KO   (chapters before stuck)");
    Object.keys(SETUPS).forEach((s) => { const c = R.conquest[s]; if (!c) return; const b = B && B.conquest[s];
      console.log("  " + SETUPS[s].padEnd(30) + lab(c.wall).padEnd(6) + d(c.wall, b && b.wall).padEnd(10) + lab(c.firstKo).padEnd(7) + (c.firstKo != null ? ((c.wall - c.firstKo) / 20).toFixed(1) : "").padEnd(6) + (c.ds && c.ds[0] ? "  Death Strike: " + c.ds[0][0] + " fires, " + c.ds[0][1] + " finished off" : "")); });
  }
  if (Object.keys(R.swap).length) {
    console.log("\nCONQUEST SWAP (6 owned, one left out -> where the other 5 get stuck; lower = that hero matters more)");
    ["six40", "six80"].forEach((s) => { console.log("  " + (s === "six40" ? "Lv40 2*" : "Lv80 5*") + ": " + HEROES.map((h) => { const c = R.swap[s + "|" + h]; const b = B && B.swap[s + "|" + h]; return c ? "w/o " + h + " " + lab(c.wall) + d(c.wall, b && b.wall) : ""; }).join(" | ")); });
  }
  if (R.arena) {
    console.log("\nARENA ROUND-ROBIN (team = 6 minus the named hero; wins-losses-draws; a team that loses a lot = that hero matters a lot)");
    Object.keys(R.arena).forEach((t) => console.log("  " + t + ": " + HEROES.map((h) => { const v = R.arena[t][h]; const b = B && B.arena && B.arena[t][h]; return "w/o " + h + " " + v.w + "-" + v.l + "-" + v.d + (b ? " (was " + b.w + "-" + b.l + ")" : ""); }).join(" | ")));
  }
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
  await P.fill("#ksE", "bal" + process.pid + "@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 20000 }); await P.fill("#ksN", "Sim"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => setScreen("city"));
  const out = [];
  for (const job of JSON.parse(process.env.KS_JOBS)) {
    out.push(await P.evaluate(async ({ job, CFG, HEROES }) => {
      const applyCfg = (c) => Object.keys(CFG).forEach((k) => { if (k !== "enemyScale" && k !== "arenaBaseHp") c[k] = CFG[k]; });
      if (CFG.enemyScale) Object.keys(CFG.enemyScale).forEach((k) => { enemyScale[k] = CFG.enemyScale[k]; }); /* Conquest enemy scaling (a global the sims share) */
      const W3 = ["missile_barrage", "laser_beam", "railgun"], FIVE = HEROES.slice(0, 5);
      if (job.kind === "arena") { /* every pair of "6 minus one" teams, both sides, 10 seeds, same levels, no bonuses */
        const saved = Object.assign({}, game.heroKoCfg); applyCfg(game.heroKoCfg);
        const res = {};
        for (const [tag, lvl, arms, sk] of [["Lv40 2*", 40, 10, 3], ["Lv80 5*", 80, 25, 5]]) {
          const hs = {}; HEROES.forEach((k) => { hs[k] = { owned: true, level: lvl, stars: arms, skillLevels: { conquest: [sk, sk, sk], expedition: [sk, sk, sk] } }; });
          const teams = HEROES.map((x) => ({ out: x, roster: HEROES.filter((k) => k !== x) })), score = {}; HEROES.forEach((x) => { score[x] = { w: 0, l: 0, d: 0 }; });
          const mk = (roster, isP) => { const st = arenaSideStats(roster, hs, 20, CFG.arenaBaseHp != null ? CFG.arenaBaseHp : arenaBaseHpPlayer, false, null, null, undefined, ZERO_BONUS); (st.heroHp || []).forEach((e) => { const ix = roster.indexOf(e.id); if (ix >= 0) e.runL = arenaRunDist(400, 240, ix, isP); }); return st; };
          for (let i = 0; i < teams.length; i++) for (let j = 0; j < teams.length; j++) { if (i === j) continue;
            for (let s = 0; s < 10; s++) { const seed = tag + "|" + i + "|" + j + "|" + s; const sim = arenaMakeSim(mk(teams[i].roster, true), mk(teams[j].roster, false), { rng: worldPvpSeededRng(seed), critSeed: seed });
              const w = sim.runToEnd(), A = score[teams[i].out], B = score[teams[j].out]; if (w === "player") { A.w++; B.l++; } else if (w === "ai") { A.l++; B.w++; } else { A.d++; B.d++; } } }
          res[tag] = score;
        }
        Object.assign(game.heroKoCfg, saved);
        return { kind: "arena", arena: res };
      }
      let simTime = 1000; const sim = createGame({ now: () => simTime, mapSize: 5, seed: 1, combatSeed: 500000 + job.seed * 104729 });
      const s = sim.state;
      HEROES.forEach((k) => { s.heroes[k].owned = false; s.heroes[k].level = 0; s.heroes[k].stars = 0; s.heroes[k].skillLevels = { conquest: [1, 1, 1], expedition: [1, 1, 1] }; });
      ["gareth", "lyra"].forEach((k) => { s.heroes[k].owned = true; s.heroes[k].level = 1; });
      s.conquestRoster = ["gareth", "lyra"]; s.equippedWeapons = []; s.weaponLevels = {}; s.tech = {}; s.fortressTech = {};
      Object.keys(s.buildings).forEach((k) => { s.buildings[k].level = k === "townhall" ? 1 : 0; });
      s.equippedEsper = null; s.idle.fortressCannonEnabled = true; s.idle.fortressCannonTargetMode = "front"; setEquipBonus({});
      const heroes = (keys, lvl, sk, arms) => { keys.forEach((k) => { const h = s.heroes[k]; h.owned = true; h.level = lvl; h.stars = arms; h.skillLevels = { conquest: [sk, sk, sk], expedition: [sk, sk, sk] }; }); s.conquestRoster = keys.slice(0, 5); };
      ({ new: () => {}, duo20: () => heroes(["gareth", "lyra"], 20, 2, 0), five40: () => heroes(FIVE, 40, 3, 10), five80: () => heroes(FIVE, 80, 5, 25),
         maxall: () => { heroes(FIVE, 80, 5, 25); W3.forEach((id) => { s.weaponLevels[id] = 50; }); s.equippedWeapons = W3.slice(); Object.keys(s.buildings).forEach((k) => { s.buildings[k].level = BUILDING_DEFS[k].maxLevel; }); },
         six40: () => heroes(HEROES, 40, 3, 10), six80: () => heroes(HEROES, 80, 5, 25) })[job.setup]();
      if (job.out) s.conquestRoster = HEROES.filter((k) => k !== job.out);
      applyCfg(sim.heroKoCfg);
      const STABLE = 20000, MAXT = 300000; let last = sim.idleLevelLabel(), lastAt = 0, i = 0, firstKo = null, wasKo = false, koCount = 0;
      for (; i < MAXT; i++) {
        simTime += 1000; sim.tick();
        const e = s.idle.heroHp && s.idle.heroHp.gareth, ko = !!(e && e.ko);
        if (ko && !wasKo) { koCount++; if (firstKo == null) firstKo = (s.idle.chapter - 1) * 20 + s.idle.levelNum; } wasKo = ko;
        const L = sim.idleLevelLabel(); if (L !== last) { last = L; lastAt = i; }
        if (i - lastAt > STABLE) break;
        if (i % 5000 === 0) await new Promise((r) => setTimeout(r, 0));
      }
      setEquipBonus({});
      return Object.assign({}, job, { wall: (s.idle.chapter - 1) * 20 + s.idle.levelNum, firstKo, koCount, ds: [s.idle.limitFires || 0, s.idle.limitKills || 0, i] });
    }, { job, CFG, HEROES }));
  }
  await b.close();
  process.stdout.write("@@" + JSON.stringify(out));
}
