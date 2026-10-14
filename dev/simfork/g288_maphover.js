/* v1153: PC-only slowdown when the mouse moves over a busy landmass on the world map (phones have no hover). Measures frame times while a mouse sweeps over the land near 58,26. Run: node dev/simfork/g288_maphover.js [hoverOff] */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
/* headless Chromium has no H.264 (phones do): for the test only, the game's mp4 is swapped for a VP9 webm of the same video */
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 1366, height: 860 }, deviceScaleFactor: 1 });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "g288@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Hover"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  await P.evaluate(() => setScreen("world")); await P.waitForTimeout(2500);
  await P.evaluate(([t, z]) => { if (z) setMapZoom(+z); const vp = document.getElementById("mapviewport"), xy = tileXY(t), c = tileCenterPx({ x: xy[0], y: xy[1] }); vp.scrollLeft = Math.max(0, c.x - vp.clientWidth / 2); vp.scrollTop = Math.max(0, c.y - vp.clientHeight / 2); }, [process.env.TILE || "58,26", process.env.ZOOM || ""]);
  await P.waitForTimeout(3000);
  await P.evaluate(() => mapProfSet(true)); await P.waitForTimeout(1200);
  if (process.env.THROTTLE) { const cdp = await ctx.newCDPSession(P); await cdp.send("Emulation.setCPUThrottlingRate", { rate: +process.env.THROTTLE }); }
  const V = { anim: "#mapworld *, #mapworld *::before, #mapworld *::after{animation-play-state:paused!important}", filt: "#mapworld *{filter:none!important}", wc: "#mapworld *{will-change:auto!important}", foam: "#mapSeaFoam{display:none!important}", decor: ".map-decor{display:none!important}", water: ".city-water,.city-water2{display:none!important}" };
  for (const k of (process.env.OFF || "").split(",").filter(Boolean)) await P.addStyleTag({ content: V[k] });
  if (process.argv[2] === "hoverOff") await P.addStyleTag({ content: ".tile:hover{transform:none!important;z-index:auto!important;border-color:transparent!important}" });
  const box = await P.evaluate(() => { const r = document.getElementById("mapviewport").getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  const measure = (sweep) => P.evaluate(async (sweep) => { const d = []; let last = performance.now(), stop = false; const f = (t) => { d.push(t - last); last = t; if (!stop) requestAnimationFrame(f); }; requestAnimationFrame(f); await new Promise((r) => setTimeout(r, 4000)); stop = true; d.sort((a, c) => a - c); const avg = d.reduce((a, c) => a + c, 0) / d.length; return { frames: d.length, avgMs: +avg.toFixed(1), p90: +d[Math.floor(d.length * 0.9)].toFixed(1), worst: +d[d.length - 1].toFixed(1) }; }, sweep);
  const still = measure(); await still;
  const stillR = await still;
  const moving = (async () => { for (let i = 0; i < 160; i++) { const t = i / 160; await P.mouse.move(box.x + box.w * (0.05 + 0.85 * ((i * 7) % 40) / 40), box.y + box.h * (0.05 + 0.85 * t)); await P.waitForTimeout(20); } })();
  const sweepR = await measure(); await moving;
  const hoverCount = await P.evaluate(() => ({ tiles: document.querySelectorAll("#mapworld .tile").length, all: document.querySelectorAll("#mapworld *").length, lod: mapLod(), px: +tilePxZ().toFixed(1), zoom: mapZoom, home: game.state.homeTileId }));
  const readout = await P.evaluate(() => document.getElementById("fpsCounter").textContent);
  console.log(readout); console.log(JSON.stringify({ mode: process.argv[2] || "normal", tiles: hoverCount, still: stillR, mouseSweep: sweepR, errs: errs.slice(0, 3) }));
  await P.screenshot({ path: path.join(__dirname, "out_g288.png") });
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
