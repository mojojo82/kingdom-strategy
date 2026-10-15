/* v1175 (Harley): a speedup used on less time than it's worth gives the unused part back as 5 min + 1 min speedups of the same type (like Kingshot).
   Builds, training and research; 5 min speedups refund 1 min ones; the new speedups work and show in the Backpack (grey 1 min, green 5 min, blue 1h).
   Screenshot out_g297_backpack.png.  Run: node dev/simfork/g297_speedup_refund.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "g297@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Speedy"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const r = await P.evaluate(() => {
    const st = game.state, out = {}, T = () => Date.now();
    st.resources.food = st.resources.wood = st.resources.stone = st.resources.gold = 1e9; st.buildings.townhall.level = 7;
    st.speedups = { construction_1h: 3, general_1h: 2, general_5m: 1 };
    const up = game.startUpgrade("townhall"); const B = st.buildings.townhall.upgrading;
    B.finishAt = T() + 5 * 60000 + 2000;                          /* 5 min 2 s left: 1h construction -> done, 54 min 58 s back = 10x 5 min + 4x 1 min (58 s lost) */
    out.a = game.useSpeedup("construction_1h", "build", "townhall"); out.aSu = Object.assign({}, st.speedups); out.aDone = !st.buildings.townhall.upgrading || st.buildings.townhall.upgrading.finishAt <= T();
    game.tick();
    game.startUpgrade("townhall"); st.buildings.townhall.upgrading.finishAt = T() + 3 * 60000 + 30000; /* 3.5 min left: 1h general -> 56.5 min back = 11x 5 min + 1x 1 min */
    out.b = game.useSpeedup("general_1h", "build", "townhall"); out.bSu = Object.assign({}, st.speedups);
    game.tick();
    game.startUpgrade("townhall"); st.buildings.townhall.upgrading.finishAt = T() + 2 * 3600000; /* 2h left: no refund */
    out.c = game.useSpeedup("construction_1h", "build", "townhall"); out.cLeft = Math.round((st.buildings.townhall.upgrading.finishAt - T()) / 60000);
    st.buildings.townhall.upgrading.finishAt = T() + 2 * 60000 + 5000; /* 2 min left: 5 min general -> 2 min back as 1 min */
    out.d = game.useSpeedup("general_5m", "build", "townhall");
    out.e = game.useSpeedup("construction_5m", "research", null); /* construction can't do research */
    out.final = Object.assign({}, st.speedups);
    return out; });
  await P.evaluate(() => setScreen("world")); await P.waitForTimeout(800);
  await P.click("#mapBagBtn"); await P.waitForTimeout(400);
  await P.evaluate(() => document.querySelector('#bagPop [data-bc="speed"]').click()); await P.waitForTimeout(300);
  const tiles = await P.evaluate(() => [...document.querySelectorAll("#bagPop .bg-it")].map((t) => t.getAttribute("data-bi") + ":" + t.className + ":" + (t.querySelector("i") || {}).textContent + ":" + t.querySelector("b").textContent));
  await P.screenshot({ path: path.join(__dirname, "out_g297_backpack.png") });
  console.log(JSON.stringify({ r, tiles, errs }));
  await b.close();
  if (!process.env.NOASSERT) {
    assert.deepStrictEqual(errs, []);
    assert(r.a.ok && r.aDone && r.a.refund.construction_5m === 10 && r.a.refund.construction_1m === 4, "5 min 2 s left: 1h construction refunds 10x 5 min + 4x 1 min");
    assert(r.b.ok && r.b.refund.general_5m === 11 && r.b.refund.general_1m === 1, "3.5 min left: 1h general refunds 11x 5 min + 1x 1 min");
    assert(r.c.ok && Object.keys(r.c.refund).length === 0 && r.cLeft === 60, "2h left: no refund, 1h off");
    assert(r.d.ok && r.d.refund.general_1m === 2 && !r.d.refund.general_5m, "5 min on 2 min: 2x 1 min back");
    assert(!r.e.ok, "construction speedup can't be used on research");
    assert.deepStrictEqual(r.final, { construction_1h: 1, general_1h: 1, general_5m: 11, construction_5m: 10, construction_1m: 4, general_1m: 3 }, "counts");
    assert(tiles.some((t) => /^su_con5:bg-it r1( sel)?:5 min:x10/.test(t)) && tiles.some((t) => /^su_gen1:bg-it r0( sel)?:1 min:x3/.test(t)) && tiles.some((t) => /^su_con:bg-it r2( sel)?:1h:x1/.test(t)), "Backpack tiles");
    console.log("g297 ok");
  }
})().catch((e) => { console.error(e); process.exit(1); });
