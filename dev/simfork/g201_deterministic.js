/* v954: combat has no true randomness - the same Conquest run (no combatSeed, like live play) and the same Arena battle seed replay identically. Run: node dev/simfork/g201_deterministic.js */
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
  await P.fill("#ksE", "g201@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Det"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const r = await P.evaluate(() => {
    const run = () => { let t = 1000; const sim = createGame({ now: () => t, mapSize: 5, seed: 1 }); const s = sim.state; /* no combatSeed = live play */
      ["gareth", "lyra", "roran", "kessa", "sera"].forEach((k) => { const h = s.heroes[k]; h.owned = true; h.level = 30; h.stars = 5; }); s.conquestRoster = ["gareth", "lyra", "roran", "kessa", "sera"];
      const trace = []; for (let i = 0; i < 4000; i++) { t += 1000; sim.tick(); if (i % 250 === 0) trace.push([sim.idleLevelLabel(), Math.round(s.idle.playerHp * 1000), (s.idle.enemies || []).map((e) => Math.round(e.hp * 100)).join(","), JSON.stringify(s.idle.heroHp || {})]); }
      return { trace: JSON.stringify(trace), label: sim.idleLevelLabel(), resets: s.idle.resetCount || 0 }; };
    const a = run(), b2 = run();
    const hs = {}; ["gareth", "lyra", "roran", "kessa", "sera", "torvald"].forEach((k) => { hs[k] = { owned: true, level: 50, stars: 10, skillLevels: { conquest: [3, 3, 3], expedition: [3, 3, 3] } }; });
    const fight = (seed) => { const mk = (ro, isP) => { const st = arenaSideStats(ro, hs, 20, arenaBaseHpPlayer, false, null, null, undefined, ZERO_BONUS); (st.heroHp || []).forEach((e) => { const ix = ro.indexOf(e.id); if (ix >= 0) e.runL = arenaRunDist(400, 240, ix, isP); }); return st; };
      const sim = arenaMakeSim(mk(["gareth", "lyra", "roran", "kessa", "sera"], true), mk(["torvald", "lyra", "roran", "kessa", "sera"], false), { rng: worldPvpSeededRng(seed), critSeed: seed }); const tr = []; let x; do { x = sim.step(); tr.push(Math.round(sim.playerHp * 100) + "/" + Math.round(sim.aiHp * 100)); } while (!x.done); return tr.join(" ") + " " + x.winner; };
    return { same: a.trace === b2.trace, label: a.label, resets: a.resets, arenaSame: fight("x|1") === fight("x|1"), arenaDiffSeed: fight("x|1") !== fight("x|2") };
  });
  console.log(JSON.stringify(r));
  assert.ok(r.same, "two live-style Conquest runs from the same state must match"); assert.ok(r.arenaSame, "same Arena seed, same fight"); assert.ok(r.arenaDiffSeed, "different seed, different fight");
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
