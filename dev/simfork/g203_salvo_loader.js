/* v957: Salvo Loader - first cannon burst of every fight is a super burst (Fortress I), same in Conquest and Arena; other weapons untouched. Run: node dev/simfork/g203_salvo_loader.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 } });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "g203@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Salvo"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const r = await P.evaluate(() => {
    const o = {}, wd = WEAPON_DEFS_BY_ID.salvo_loader;
    o.def = !!wd && wd.kind === "fx" && /super burst/.test(wd.desc(wd, game.weaponStatsAtLevel(wd, 1)));
    o.notDrawn = wd.rarity === "Elite" && WEAPON_DEFS.filter((w) => !w.visualOnly && !w.noDraw && w.rarity === "Elite").some((w) => w.id === "salvo_loader"); /* v958: in the draws, lowest rarity */
    o.othersSame = WEAPON_DEFS.filter((w) => w.id !== "salvo_loader").length === 16;
    o.lv50 = JSON.stringify(game.weaponStatsAtLevel(wd, 50).p); o.lowFort = salvoBurstMult(salvoSpec(["salvo_loader"], () => game.weaponStatsAtLevel(wd, 10)), 1, 2); o.lowFortLater = salvoBurstMult(salvoSpec(["salvo_loader"], () => game.weaponStatsAtLevel(wd, 10)), 2, 2); o.lv1 = JSON.stringify(game.weaponStatsAtLevel(wd, 1).p);
    /* Arena: same teams, Fortress I maxed, with / without the weapon; and a Fortress III with it (cannot super-burst -> nothing) */
    const hs = {}; ["gareth", "lyra", "roran", "kessa", "sera"].forEach((k) => { hs[k] = { owned: true, level: 40, stars: 10, skillLevels: { conquest: [3, 3, 3], expedition: [3, 3, 3] } }; });
    const ro = ["gareth", "lyra", "roran", "kessa", "sera"];
    const side = (fort, isP) => { const st = arenaSideStats(ro, hs, 20, 0, false, null, fort, undefined, ZERO_BONUS); (st.heroHp || []).forEach((e) => { e.runL = arenaRunDist(400, 240, ro.indexOf(e.id), isP); }); return st; };
    const firstBurst = (fort, salvo) => { const tr = { src: {}, aiSrc: {}, perTick: [] }; const sim = arenaMakeSim(side(fort, true), side(null, false), { rng: worldPvpSeededRng("s1"), critSeed: "s1", trace: tr, salvoP: salvo }); sim.runToEnd(); return (tr.bursts || [])[0]; };
    const sp1 = salvoSpec(["salvo_loader"], () => game.weaponStatsAtLevel(wd, 1)), sp50 = salvoSpec(["salvo_loader"], () => game.weaponStatsAtLevel(wd, 50));
    const f1 = fortressMaxMap(1), f3 = fortressMaxMap(3), cm = fortressBonusFrom(f1).critMult;
    o.arenaF1 = (firstBurst(f1, sp1) || {}).mult; o.arenaF1noW = (firstBurst(f1, null) || {}).mult; o.arenaF3 = (firstBurst(f3, sp1) || { mult: 1 }).mult; o.critMult = cm;
    o.arenaLv50 = (firstBurst(f1, sp50) || {}).mult;
    o.pattern50 = [1, 2, 3, 4, 5, 6, 7, 8].filter((n) => salvoForces(sp50, n)).join(",");
    /* Conquest: first burst of each level attempt */
    let t = 1000; const sim = createGame({ now: () => t, mapSize: 5, seed: 1, combatSeed: 4 }); const s = sim.state;
    s.fortressTech = fortressMaxMap(1); s.weaponLevels.salvo_loader = 1; s.equippedWeapons = ["salvo_loader"]; s.idle.fortressCannonEnabled = true;
    let firstMult = null; for (let i = 0; i < 60 && firstMult == null; i++) { t += 1000; sim.tick(); if (s.idle.salvoBurstNo === 1 && s.idle.fortressCannonFiring) firstMult = s.idle.fortressCannonCritMult; }
    o.cqFirst = firstMult;
    o.dupSkips = !(function () { const el = ["salvo_loader", "laser_beam", "duplicate"].filter(function (id) { const d = WEAPON_DEFS_BY_ID[id]; return d && !d.visualOnly && d.fx !== "dup" && d.fx !== "orbit" && d.fx !== "salvo"; }); return el.indexOf("salvo_loader") >= 0; })();
    return o;
  });
  console.log(JSON.stringify(r));
  assert.ok(r.def && r.notDrawn && r.othersSame, "weapon defined, in the Elite draws, 16 others unchanged");
  assert.strictEqual(r.arenaF1, r.critMult, "Arena: Fortress I opens with a super burst"); assert.ok(r.arenaF1noW === 1 || r.arenaF1noW === r.critMult);
  assert.strictEqual(r.arenaF3, 1, "Fortress III gains nothing (cannot super-burst)");
  assert.ok(Math.abs(r.arenaLv50 - r.critMult * 3) < 1e-9, "Lv50: super bursts +200%"); assert.strictEqual(r.pattern50, "1,4,7", "Lv50: every 3rd burst after the opener"); assert.strictEqual(r.lowFort, 5, "Lv10 on an unresearched Fortress I: x2 base, +150% = x5 (nearly useless without tech)"); assert.strictEqual(r.lowFortLater, 5, "same multiplier on any super burst");
  assert.strictEqual(r.cqFirst, r.critMult, "Conquest: first burst of the level is a super burst");
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
