/* v1121: the 3D Kessa in the Arena. Arc Burst plays the cast state and the Blender-texture bolt leaves her palm after the wind-up (player and AI side).
   Run: node dev/simfork/g279_arena_kessa.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "g279@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Kessa"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => { const h = game.state.heroes.kessa; h.owned = true; h.level = 40; h.stars = 10; game.state.conquestRoster = ["kessa"]; });
  await P.evaluate(() => setScreen("more", "arena")); await P.waitForTimeout(1500);
  await P.evaluate(() => { document.getElementById("arenaQuickMatchBtn").click(); }); await P.waitForTimeout(1500);
  const r = await P.evaluate(async () => {
    const seen = { states: {}, bolts: [], casts: [], delays: [], drawTex: 0 };
    const oDraw = drawHeroAnim; drawHeroAnim = function (ctx, key, x, feetY, state) { if (key === "kessa") seen.states[state] = (seen.states[state] || 0) + 1; return oDraw.apply(this, arguments); };
    const oSp = spawnArenaHeroLightning; spawnArenaHeroLightning = function (fx, fy, tx, ty, c, tex) { seen.bolts.push({ fx: Math.round(fx), fy: Math.round(fy), tx: Math.round(tx), c, tex: !!tex }); const hc = arenaAnim.heroCast || {}; const k = Object.keys(hc).sort((a, b) => hc[b].t0 - hc[a].t0)[0]; if (k) seen.delays.push(Math.round(performance.now() - hc[k].t0)); return oSp.apply(this, arguments); };
    const oDI = CanvasRenderingContext2D.prototype.drawImage; CanvasRenderingContext2D.prototype.drawImage = function (img) { if (img === kessaBoltImgCache) seen.drawTex++; return oDI.apply(this, arguments); };
    document.getElementById("arenaAttackBtn").click();
    const t0 = performance.now(), last = {}; let shot = false;
    while (performance.now() - t0 < 25000) { await new Promise((res) => setTimeout(res, 50)); const hc = arenaAnim.heroCast || {}; for (const k in hc) if (hc[k] !== last[k]) { last[k] = hc[k]; seen.casts.push(k + (hc[k].miss ? ":miss" : ":hit")); }
      if (!shot && seen.drawTex > 2) { shot = true; window.__shot = 1; } }
    drawHeroAnim = oDraw; spawnArenaHeroLightning = oSp; CanvasRenderingContext2D.prototype.drawImage = oDI; return seen;
  });
  console.log(JSON.stringify({ states: r.states, casts: r.casts.slice(0, 6), bolts: r.bolts.slice(0, 4), delays: r.delays.slice(0, 4), drawTex: r.drawTex, errs }));
  await b.close();
  if (!process.env.NOASSERT) {
    assert.deepStrictEqual(errs, []); assert(r.casts.length > 0 && (r.states.cast || r.states.castMiss), "Arena Arc Burst plays the cast state");
    assert(r.bolts.length > 0 && r.bolts.every((x) => x.tex), "bolt uses the Blender texture"); assert(r.delays.every((d) => d >= 380), "bolt waits for the wind-up");
    console.log("g279 ok");
  }
})().catch((e) => { console.error(e); process.exit(1); });
