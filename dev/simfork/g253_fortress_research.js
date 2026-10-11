/* v1069: fortress research repriced (~100M per tree, 1.5k first level) and on the research lane with timers; lane shared with normal research; survives a reload. Run: node dev/simfork/g253_fortress_research.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const OUT = process.env.OUT || "/tmp/";
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
  await P.fill("#ksE", "g253@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Wet"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const o = await P.evaluate(() => { const st = game.state, r = {};
    r.c1 = fortressNodeCost("heavyShells", 1); r.c3 = fortressNodeCost("t3_walls", 1); r.t1 = fortressTimeFor("heavyShells", 1);
    const p0 = game.governorPower(); const keep = st.fortressTech; st.fortressTech = fortressMaxMap(1); const pMax1 = game.governorPower(); st.fortressTech = fortressMaxMap(3); const pMax3 = game.governorPower(); st.fortressTech = keep;
    r.powMax1 = pMax1 - p0; r.powMax3 = pMax3 - p0; /* v1071: power uses the old scale, a maxed tree = 1.917M points x 4 x POWER_SCALE */
    r.tot1 = fortressTreeTotalCost(); let t3 = 0; for (const k in FORTRESS3_TREE) for (let l = 1; l <= FORTRESS3_TREE[k].maxLevel; l++) t3 += fortressNodeCost(k, l); r.tot3 = t3;
    st.researchPoints = 0; r.poor = game.researchFortress("heavyShells").reason;
    st.researchPoints = 100000; const a = game.researchFortress("heavyShells"); r.started = a.ok; r.lvNow = (st.fortressTech || {}).heavyShells || 0; r.q = st.researchQueue && [st.researchQueue.key, st.researchQueue.fort, st.researchQueue.toLevel];
    r.rpLeft = st.researchPoints; r.busyFort = game.researchFortress("heavyShells").reason; r.busyTech = game.researchTech("pavedRoads").reason;
    return r; });
  o.hub = await P.evaluate(() => { const d = researchQueueDef(game.state.researchQueue); return d ? d.name : ""; });
  await P.evaluate(() => persist()); await P.waitForTimeout(5000);
  /* reopen the game in a new tab (same browser storage + same fake server) */
  /* the saved game keeps the queued fortress research: load the local save back into a cleared state */
  o.afterReload = await P.evaluate(() => { const saved = JSON.parse(localStorage.getItem("kingdom_prototype_save_v1")); game.state.researchQueue = null; game.loadState(saved); const q = game.state.researchQueue; return q && [q.key, q.fort, q.toLevel]; });
  o.done = await P.evaluate(async () => { game.researchFinishNow(); await new Promise((r) => setTimeout(r, 2500)); return [(game.state.fortressTech || {}).heavyShells || 0, !!game.state.researchQueue]; });
  console.log(JSON.stringify(o), errs);
  assert.ok(Math.abs(o.powMax1 - o.powMax3) / o.powMax1 < 0.01 && o.powMax1 < 2e8, "power of a maxed tree is the old scale, same for I and III (" + o.powMax1 + ")");
  assert.strictEqual(o.c1, 1500); assert.strictEqual(o.c3, 1500); assert.ok(Math.abs(o.tot1 - 100e6) < 1e6 && Math.abs(o.tot3 - 100e6) < 1e6, "both trees ~100M");
  assert.ok(o.t1 >= 100 && o.t1 <= 180, "first level ~2 min");
  assert.strictEqual(o.poor, "not_enough_research"); assert.ok(o.started && o.lvNow === 0 && o.q[0] === "heavyShells" && o.q[1] === 1 && o.q[2] === 1, "queued, not instant");
  assert.strictEqual(o.rpLeft, 98500); assert.strictEqual(o.busyFort, "queue_busy"); assert.strictEqual(o.busyTech, "queue_busy", "one lane for both");
  assert.ok(/Heavy Shells/.test(o.hub), "hub shows it"); assert.deepStrictEqual(o.afterReload, ["heavyShells", 1, 1], "survives reload");
  assert.deepStrictEqual(o.done, [1, false], "finishing applies the level");
  assert.deepStrictEqual(errs, []); console.log("g253 OK"); await b.close();
})();
