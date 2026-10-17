/* v1254/v1256 (Harley): TEST-only world-map stress buttons 10/20/30 send visual-only ships ~20 tiles out; they vanish on arrival; nothing saved / sent. Run: node dev/simfork/g345_stress_ships.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call0 = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store), DELAY = 1500;
 /* the FIRST move is slow to reach the server (cold start / bad signal), later ones are quick - so a second move can land first, like on a phone */
const call = call0;
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
  await P.fill("#ksE", "g345@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Stress"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  await P.evaluate(() => { setScreen("world"); stressBarShow(); }); await P.waitForTimeout(1500);
  const hidden0 = await P.evaluate(() => getComputedStyle(document.getElementById("mapStressBar")).display); /* v1256: hidden until turned on in Dev Tools */
  await P.evaluate(() => document.getElementById("devStressToggle").click()); await P.waitForTimeout(200);
  const fps = () => P.evaluate(() => new Promise((ok) => { let n = 0; const t0 = performance.now(); (function f() { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else ok(Math.round(n / ((performance.now() - t0) / 1000))); })(); }));
  const o = { bar: await P.evaluate(() => getComputedStyle(document.getElementById("mapStressBar")).display), fps0: await fps() };
  await P.click('[data-stress="30"]'); await P.waitForTimeout(1500);
  Object.assign(o, await P.evaluate(() => { const home = mapTileById(game.state.map, game.state.homeTileId);
    return { n: stressMarches.length, label: document.getElementById("mapStressN").textContent, inState: game.state.marches.length, saved: JSON.stringify(game.state).indexOf("st_") !== -1,
      dists: stressMarches.map((m) => { const t = mapTileById(game.state.map, m.tileId); return Math.round(Math.hypot(t.x - home.x, t.y - home.y)); }), empty: stressMarches.every((m) => mapTileById(game.state.map, m.tileId).type === "empty"),
      ships: document.querySelectorAll("#mapMarchLayer .march-marker").length, gl: !!document.getElementById("marchGL") }; }));
  o.fps30 = await fps();
  if (process.env.SHOTS) await P.screenshot({ path: process.env.SHOTS + "/g345_stress.png" });
  await P.evaluate(() => { stressMarches.forEach((m) => { m.arriveAt = vnow() - 1; }); }); await P.waitForTimeout(800);
  o.after = await P.evaluate(() => ({ n: stressMarches.length, label: document.getElementById("mapStressN").textContent }));
  await P.click('[data-stress="10"]'); await P.waitForTimeout(300); o.ten = await P.evaluate(() => stressMarches.length);
  await P.click('[data-stress="0"]'); await P.waitForTimeout(300); o.clear = await P.evaluate(() => stressMarches.length);
  console.log(JSON.stringify({ o, errs }));
  await b.close();
  assert.deepStrictEqual(errs, []);
  assert.strictEqual(hidden0, "none", "hidden by default"); assert.strictEqual(o.bar, "flex"); assert.strictEqual(o.n, 30); assert(/30 out/.test(o.label));
  assert(o.inState === 0 && !o.saved, "not in the save"); assert(o.dists.every((d) => d >= 17 && d <= 23) && o.empty, "~20 tiles out, empty tiles: " + o.dists);
  assert.strictEqual(o.after.n, 0, "gone on arrival"); assert.strictEqual(o.ten, 10); assert.strictEqual(o.clear, 0);
  console.log("g345 ok");
})().catch((e) => { console.error(e); process.exit(1); });
