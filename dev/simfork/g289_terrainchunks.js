/* v1155: painted land at full detail is drawn as a few chunk canvases instead of hundreds of small rotated ones - same picture. Paints a block of land
   (grass, grass 2, sand, forest) in a test world, zoom 0.7, then compares canvas count + screenshot against GAMEFILE2 (the old build) if given. Run: node dev/simfork/g289_terrainchunks.js */
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
  await P.fill("#ksE", "g289" + shotName + "@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Terr"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  await P.evaluate(() => setScreen("world")); await P.waitForTimeout(2000);
  await P.evaluate((big) => { terrainEnsure(); const n = terrainN, X = 40, Y = 10, SZ = big ? 6 : 1;
    for (let y = Y; y < Y + 40 * SZ; y++) for (let x = X; x < X + 45 * SZ; x++) { const dx = (x - X) / SZ - 22, dy = (y - Y) / SZ - 20, r = Math.hypot(dx, dy * 1.1) + 3 * Math.sin(x * 0.7) * Math.cos(y * 0.5); if (r < 19) terrainArr[y * n + x] = r < 6 ? 4 : r < 9 ? 3 : (x + y) % 9 === 0 ? 2 : 1; }
    for (let cy = 0; cy < Math.ceil(n / TERRAIN_CHUNK); cy++) for (let cx = 0; cx < Math.ceil(n / TERRAIN_CHUNK); cx++) { const x0 = cx * TERRAIN_CHUNK, y0 = cy * TERRAIN_CHUNK; let any = false; for (let y = y0; y < Math.min(n, y0 + TERRAIN_CHUNK) && !any; y++) for (let x = x0; x < Math.min(n, x0 + TERRAIN_CHUNK); x++) if (terrainArr[y * n + x]) { any = true; break; } if (any) terrainLandChunks[cx + "_" + cy] = 1; }
    terrainClearAll(); try { forestRefreshSoon(); } catch (e) {} setMapZoom(0.7); const vp = document.getElementById("mapviewport"), c = tileCenterPx({ x: 62, y: 30 }); vp.scrollLeft = c.x - vp.clientWidth / 2; vp.scrollTop = c.y - vp.clientHeight / 2; renderVisibleTiles(); }, !!process.env.BIG);
  await P.waitForTimeout(2500);
  const scroll = await P.evaluate(async () => { let draws = 0; const ctxp = CanvasRenderingContext2D.prototype, od = ctxp.drawImage; ctxp.drawImage = function (img) { if (this.canvas.classList && this.canvas.classList.contains("terr-ch")) draws++; return od.apply(this, arguments); };
    const vp = document.getElementById("mapviewport"), x0 = vp.scrollLeft; for (let k = 0; k < 60; k++) { vp.scrollLeft = x0 + k * 6; await new Promise((r) => requestAnimationFrame(r)); } for (let k = 0; k < 60; k++) { vp.scrollLeft = x0 + (59 - k) * 6; await new Promise((r) => requestAnimationFrame(r)); }
    ctxp.drawImage = od; return draws; });
  const zoomMs = await P.evaluate(async (zseq) => { const out = []; const vp = document.getElementById("mapviewport");
    for (const z of (zseq ? zseq.split(",").map(Number) : [0.45, 0.7, 0.45, 0.7, 0.9, 0.45, 0.7])) { let worst = 0, last = performance.now(), go = true; const f = (t) => { worst = Math.max(worst, t - last); last = t; if (go) requestAnimationFrame(f); }; requestAnimationFrame(f);
      await new Promise((r) => requestAnimationFrame(r)); last = performance.now(); setMapZoom(z, vp.clientWidth / 2, vp.clientHeight / 2); renderVisibleTiles(); await new Promise((r) => setTimeout(r, 900)); go = false; out.push(z + ":" + Math.round(worst)); }
    return out.join(" ") + " | cache " + (typeof terrainCellCache !== "undefined" ? terrainCellCache.size : "-"); }, process.env.ZSEQ || "");
  const info = await P.evaluate((sc) => ({ chunked: typeof TERR_USE_CHUNKS !== "undefined" && TERR_USE_CHUNKS, canvases: document.querySelectorAll("#mapTerrainLayer canvas").length, lod: mapLod(), z: mapZoom, cellDrawsWhileScrolling: sc }), scroll); info.zoomWorstFrameMs = zoomMs;
  await P.evaluate(() => { document.querySelectorAll("#mapworld .tile, .map-decor, .map-forest, #mapSeaFoam, #fpsCounter, #mapCoords").forEach((e) => e.style.visibility = "hidden"); });
  await P.waitForTimeout(300);
  const vpBox = await P.evaluate(() => { const r = document.getElementById("mapviewport").getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
  await P.screenshot({ path: path.join(__dirname, "out_g289_" + shotName + ".png"), clip: vpBox });
  await b.close(); return { info, errs };
}
(async () => {
  const now = await run(GAME, "new"); console.log("new", JSON.stringify(now));
  if (process.env.GAMEFILE2) { const old = await run(fs.readFileSync(process.env.GAMEFILE2, "utf8"), "old"); console.log("old", JSON.stringify(old)); }
  if (!process.env.NOASSERT) { assert.deepStrictEqual(now.errs, []); assert(now.info.chunked && now.info.cellDrawsWhileScrolling < 2000 && now.info.canvases < 60, "chunks (phones too since v1160), not redrawn while scrolling"); assert(now.info.canvases > 0 && now.info.lod === 0, "few chunk canvases at full detail"); console.log("g289 ok"); }
})().catch((e) => { console.error(e); process.exit(1); });
