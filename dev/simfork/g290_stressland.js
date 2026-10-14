/* v1160: Dev Tools "Stress-test land" button - 4 continents (~40% land) on this device only. Checks the land share, that nothing reaches the server
   or the device save, and times zooming over it. Run: MOBILE=1 node dev/simfork/g290_stressland.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
/* headless Chromium has no H.264 (phones do): for the test only, the game's mp4 is swapped for a VP9 webm of the same video */
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
async function run(gameHtml, shotName) {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext(process.env.MOBILE ? { viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } : { viewport: { width: 1366, height: 860 }, deviceScaleFactor: 1 });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: gameHtml }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "g290" + shotName + "@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Terr"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  await P.evaluate(() => setScreen("world")); await P.waitForTimeout(2000);
  const before = JSON.stringify(Object.keys(store).filter((k) => k.indexOf("terrain/") >= 0).sort()), lsBefore = await P.evaluate(() => localStorage.getItem(TERRAIN_KEY_V2));
  P.on("dialog", (d) => d.accept());
  await P.evaluate(() => { const vp = document.getElementById("mapviewport"); setMapZoom(0.7); const c = tileCenterPx({ x: Math.round(terrainN * 0.27), y: Math.round(terrainN * 0.28) }); vp.scrollLeft = c.x - vp.clientWidth / 2; vp.scrollTop = c.y - vp.clientHeight / 2; renderVisibleTiles(); });
  await P.evaluate(() => document.getElementById("devStressLandBtn").click()); await P.waitForTimeout(2500);
  const gen = await P.evaluate(() => { let land = 0, c = [0, 0, 0, 0, 0]; for (let i = 0; i < terrainArr.length; i++) { c[terrainArr[i]]++; if (terrainArr[i]) land++; } return { n: terrainN, frac: +(land / terrainArr.length).toFixed(3), codes: c, note: document.getElementById("devStressLandNote").textContent, btn: document.getElementById("devStressLandBtn").textContent, landChunks: Object.keys(terrainLandChunks).length }; });
  /* paint one cell with the painter path too - it must not reach the server either */
  await P.evaluate(() => { terrainArr[5] = 1; terrainMarkDirty(5, 0); }); await P.waitForTimeout(2000);
  const after = JSON.stringify(Object.keys(store).filter((k) => k.indexOf("terrain/") >= 0).sort()), lsAfter = await P.evaluate(() => localStorage.getItem(TERRAIN_KEY_V2));
  const zoomMs = await P.evaluate(async () => { const out = []; const vp = document.getElementById("mapviewport");
    for (const z of [0.45, 0.25, 0.12, 0.25, 0.45, 0.7, 0.25, 0.7]) { let worst = 0, last = performance.now(), go = true; const f = (t) => { worst = Math.max(worst, t - last); last = t; if (go) requestAnimationFrame(f); }; requestAnimationFrame(f);
      await new Promise((r) => requestAnimationFrame(r)); last = performance.now(); setMapZoom(z, vp.clientWidth / 2, vp.clientHeight / 2); renderVisibleTiles(); await new Promise((r) => setTimeout(r, 900)); go = false; out.push(z + ":" + Math.round(worst)); }
    return out.join(" "); });
  await P.evaluate(() => { const vp = document.getElementById("mapviewport"); setMapZoom(0.12, vp.clientWidth / 2, vp.clientHeight / 2); renderVisibleTiles(); }); await P.waitForTimeout(1500);
  const vpBox = await P.evaluate(() => { const r = document.getElementById("mapviewport").getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
  await P.screenshot({ path: path.join(__dirname, "out_g290_" + shotName + ".png"), clip: vpBox });
  await b.close(); return { gen, zoomMs, serverUnchanged: before === after, localUnchanged: lsBefore === lsAfter, errs };
}
(async () => {
  const r = await run(GAME, process.env.MOBILE ? "phone" : "pc"); console.log(JSON.stringify(r, null, 1));
  assert.deepStrictEqual(r.errs, []); assert(r.gen.frac > 0.36 && r.gen.frac < 0.44, "about 40% land"); assert(r.serverUnchanged, "nothing sent to the server"); assert(r.localUnchanged, "nothing saved on the device");
  assert(r.gen.codes[1] && r.gen.codes[2] && r.gen.codes[3] && r.gen.codes[4], "grass, sand, forest and grass 2 all used"); console.log("g290 ok");
})().catch((e) => { console.error(e); process.exit(1); });
