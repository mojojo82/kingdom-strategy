/* v1216: map pan smoothness at normal zoom (monsters on screen), CPU throttled 4x. GAMEFILE=old build to compare; HIDE=css selector to hide. */
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
  await P.fill("#ksE", "perf" + Date.now() + "@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Hunter"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  await P.evaluate(() => { try { setScreen("world"); } catch (e) {} centerMapOnHome(); });
  await P.waitForTimeout(2000);
  if (process.env.HIDE) await P.addStyleTag({ content: process.env.HIDE + "{display:none !important}" });
  const info = await P.evaluate(() => { const vp = document.getElementById("mapviewport"), r = vp.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, lod: mapLod(), mons: document.querySelectorAll(".mon-map").length, monMsEach: +(window.__mrMs / Math.max(1, window.__mr)).toFixed(2) }; });
  const cdp = await P.context().newCDPSession(P); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await P.evaluate(() => { window.__ft = []; let last = performance.now(); (function f(t) { window.__ft.push(t - last); last = t; if (window.__ft.length < 600) requestAnimationFrame(f); })(performance.now());
    window.__mr = 0; window.__mrMs = 0; if (window.monsterRender) { const om = window.monsterRender; window.monsterRender = function () { const t = performance.now(); const r = om.apply(this, arguments); window.__mrMs += performance.now() - t; window.__mr++; return r; }; } window.__rv = 0; window.__rvMs = 0; const o = window.renderVisibleTiles; window.renderVisibleTiles = function () { const t = performance.now(); const r = o.apply(this, arguments); window.__rvMs += performance.now() - t; window.__rv++; return r; }; });
  await P.mouse.move(info.x, info.y); await P.mouse.down();
  for (let k = 0; k < 3; k++) { for (let s = 0; s < 40; s++) await P.mouse.move(info.x + s * 5, info.y + s * 4); for (let s = 40; s > 0; s--) await P.mouse.move(info.x + s * 5, info.y + s * 4); }
  await P.mouse.up(); await P.waitForTimeout(300);
  const r = await P.evaluate(() => { const f = window.__ft.slice(3).sort((a, b) => a - b), avg = f.reduce((a, b) => a + b, 0) / f.length; return { frames: f.length, avgMs: +avg.toFixed(1), fps: Math.round(1000 / avg), p95: +f[Math.floor(f.length * 0.95)].toFixed(1), rv: window.__rv, rvMsEach: +(window.__rvMs / Math.max(1, window.__rv)).toFixed(2), mons: document.querySelectorAll(".mon-map").length, monMsEach: +(window.__mrMs / Math.max(1, window.__mr)).toFixed(2) }; });
  console.log(JSON.stringify(Object.assign({ build: (GAME.match(/var KS_BUILD = "(v\d+)"/) || [])[1], hide: process.env.HIDE || "", lod: info.lod }, r)));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
