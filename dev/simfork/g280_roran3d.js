/* v1123: the 3D Roran in Conquest: his throw plays on each basic attack and the spear (style "spear") leaves his hand after the wind-up; Arena draws him too. Run: node dev/simfork/g280_roran3d.js */
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
  await P.fill("#ksE", "g280@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Roran"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => { setScreen("conquest"); const I = game.state.idle; game.state.heroes.roran.owned = true; game.state.conquestRoster = ["roran"]; I.skillAuto = false; I.levelNum = 3; I.chapter = 1;
    window.__keep = setInterval(() => { const I = game.state.idle; if (I.heroHp) Object.values(I.heroHp).forEach((x) => x.hp = 1e12); }, 200); });
  await P.waitForTimeout(4000);
  const r = await P.evaluate(async () => {
    const seen = { states: {}, spears: [], drawn: 0 }; const t0 = performance.now();
    const oDraw = drawHeroAnim; drawHeroAnim = function (ctx, key, x, feetY, state) { if (key === "roran") seen.states[state] = (seen.states[state] || 0) + 1; return oDraw.apply(this, arguments); };
    const oP = spawnProjectile; spawnProjectile = function (w, h, ox, oy, tx, ty, a, id, d, s, style) { if (style === "spear") seen.spears.push({ ox, oy }); const r = oP.apply(this, arguments); if (style === "spear") seen.delay = idleAnim.projectiles[idleAnim.projectiles.length - 1].delay; return r; };
    const oDI = CanvasRenderingContext2D.prototype.drawImage; CanvasRenderingContext2D.prototype.drawImage = function (img) { if (img === heroSpearImgCache.roran) seen.drawn++; return oDI.apply(this, arguments); };
    let nx = 0; while (performance.now() - t0 < 9000) { await new Promise((res) => setTimeout(res, 100)); if (performance.now() - t0 > nx) { nx += 1600; const e = game.state.idle.enemies[0]; if (e && idleAnim.enemyById[e.id]) idleAnim.pendingBasicShots.push({ aid: "roran", id: e.id, dmg: 1 }); } }
    drawHeroAnim = oDraw; spawnProjectile = oP; CanvasRenderingContext2D.prototype.drawImage = oDI; return seen;
  });
  console.log(JSON.stringify({ states: r.states, spears: r.spears.length, delay: r.delay, drawn: r.drawn, errs }));
  await b.close();
  if (!process.env.NOASSERT) {
    assert.deepStrictEqual(errs, []); assert(r.states.idle > 0 && r.states.attack > 0, "idle + throw drawn"); assert(r.spears.length > 0 && r.drawn > 0, "spear thrown and drawn");
    assert(Math.abs(r.delay - 13.5 / 20) < 0.01, "spear waits for the release frame"); console.log("g280 ok");
  }
})().catch((e) => { console.error(e); process.exit(1); });
