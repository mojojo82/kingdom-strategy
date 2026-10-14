/* v1162: GPU land drawing (WebGL) on the stress-test land. Checks it is on with the stress land, screenshots GPU vs normal drawing at 3 zooms
   (compare out_g291_*_gpu/_cpu.png), and times scrolling + zooming both ways. Run: MOBILE=1 node dev/simfork/g291_gpuland.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
/* headless Chromium has no H.264 (phones do): for the test only, the game's mp4 is swapped for a VP9 webm of the same video */
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
async function run(gameHtml, shotName) {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] }), errs = [];
  const ctx = await b.newContext(process.env.MOBILE ? { viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } : { viewport: { width: 1366, height: 860 }, deviceScaleFactor: 1 });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: gameHtml }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "g291" + shotName + "@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Terr"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  await P.evaluate(() => setScreen("world")); await P.waitForTimeout(2000);
  P.on("dialog", (d) => d.accept());
  await P.evaluate(() => { const vp = document.getElementById("mapviewport"); setMapZoom(0.7); const c = tileCenterPx({ x: Math.round(terrainN * 0.27), y: Math.round(terrainN * 0.28) }); vp.scrollLeft = c.x - vp.clientWidth / 2; vp.scrollTop = c.y - vp.clientHeight / 2; renderVisibleTiles(); });
  await P.evaluate(() => document.getElementById("devStressLandBtn").click()); await P.waitForTimeout(2500);
  const st0 = await P.evaluate(() => ({ on: terrGL.on, failed: terrGL.failed, glCanvas: !!(terrGL.cv && terrGL.cv.parentNode), other: document.querySelectorAll("#mapTerrainLayer canvas:not(.terr-gl)").length, ms: terrGL.lastMs }));
  const hide = () => P.evaluate(() => { document.querySelectorAll("#mapworld .tile, .map-decor, .map-forest, #mapSeaFoam, #fpsCounter, #mapCoords, .whitecap").forEach((e) => e.style.visibility = "hidden"); });
  const box = await P.evaluate(() => { const r = document.getElementById("mapviewport").getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
  const shots = {};
  for (const [z, nm] of [[0.7, "z07"], [0.9, "z09"], [0.25, "z025"]]) {
    for (const gl of [true, false]) {
      await P.evaluate(([z, gl]) => { terrGLSet(gl); const vp = document.getElementById("mapviewport"); setMapZoom(z, vp.clientWidth / 2, vp.clientHeight / 2); renderVisibleTiles(); }, [z, gl]);
      await P.waitForTimeout(z < 0.4 ? 6000 : 4000); await hide(); await P.waitForTimeout(200);
      const f = path.join(__dirname, "out_g291_" + shotName + "_" + nm + (gl ? "_gpu" : "_cpu") + ".png"); await P.screenshot({ path: f, clip: box }); shots[nm + (gl ? "_gpu" : "_cpu")] = f;
      await P.evaluate(() => document.querySelectorAll("#mapworld .tile, .map-decor, .map-forest").forEach((e) => e.style.visibility = ""));
    }
  }
  const perf = {};
  for (const gl of [true, false]) {
    perf[gl ? "gpu" : "cpu"] = await P.evaluate(async (gl) => { terrGLSet(gl); const vp = document.getElementById("mapviewport"); setMapZoom(0.7, vp.clientWidth / 2, vp.clientHeight / 2); renderVisibleTiles(); await new Promise((r) => setTimeout(r, 3000));
      let sw = 0, last = performance.now(); const x0 = vp.scrollLeft, y0 = vp.scrollTop; for (let k = 0; k < 120; k++) { vp.scrollLeft = x0 + k * 10; vp.scrollTop = y0 + k * 6; vp.dispatchEvent(new Event("scroll")); await new Promise((r) => requestAnimationFrame(r)); const t = performance.now(); sw = Math.max(sw, t - last); last = t; }
      const zs = []; for (const z of [0.45, 0.25, 0.7, 0.25, 0.9, 0.7]) { let worst = 0, l2 = performance.now(), go = true; const f = (t) => { worst = Math.max(worst, t - l2); l2 = t; if (go) requestAnimationFrame(f); }; requestAnimationFrame(f);
        await new Promise((r) => requestAnimationFrame(r)); l2 = performance.now(); setMapZoom(z, vp.clientWidth / 2, vp.clientHeight / 2); renderVisibleTiles(); await new Promise((r) => setTimeout(r, 1200)); go = false; zs.push(z + ":" + Math.round(worst)); }
      return { scrollWorst: Math.round(sw), zoomWorst: zs.join(" "), glDraws: terrGL.draws, glLastMs: terrGL.lastMs && +terrGL.lastMs.toFixed(1) }; }, gl);
  }
  await b.close(); return { st0, perf, shots, errs };
}
(async () => {
  const r = await run(GAME, process.env.MOBILE ? "phone" : "pc"); console.log(JSON.stringify({ st0: r.st0, perf: r.perf, errs: r.errs }, null, 1));
  assert.deepStrictEqual(r.errs, []); assert(r.st0.on && !r.st0.failed && r.st0.glCanvas && r.st0.other === 0, "stress land drawn by the GPU canvas only");
  console.log("g291 ok");
})().catch((e) => { console.error(e); process.exit(1); });
