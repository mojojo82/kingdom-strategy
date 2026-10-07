/* v935: tapping World from Conquest must not freeze - the map box gets its real height before the first render (it was 66,000 px tall for up
   to 0.5 s and ~2,500 tiles were built: 1-2 s freeze). Phone size, CPU slowed x4. Run: node dev/simfork/g188_worldswitch.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
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
  await P.fill("#ksE", "g188@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Away"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const cdp = await ctx.newCDPSession(P); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await P.evaluate(() => setScreen("world")); await P.waitForTimeout(2500); await P.evaluate(() => setScreen("conquest")); await P.waitForTimeout(3000);
  const res = [];
  for (let i = 0; i < 3; i++) {
    res.push(await P.evaluate(async () => {
      const v = document.getElementById("mapviewport"); let maxH = 0, maxTiles = 0; const orig = window.renderVisibleTiles;
      window.renderVisibleTiles = function () { const r = orig.apply(this, arguments); maxH = Math.max(maxH, v.clientHeight); maxTiles = Math.max(maxTiles, Object.keys(mapTileEls).length); return r; };
      const t0 = performance.now(); setScreen("world"); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); const paint = Math.round(performance.now() - t0);
      await new Promise((r) => setTimeout(r, 1200)); window.renderVisibleTiles = orig; setScreen("conquest");
      return { paint, maxViewH: maxH, maxTiles, screenH: innerHeight };
    }));
    await P.waitForTimeout(2500);
  }
  console.log(JSON.stringify(res));
  res.forEach((r) => { assert.ok(r.maxViewH <= r.screenH, "map never sized taller than the screen"); assert.ok(r.maxTiles < 400, "no giant tile build"); assert.ok(r.paint < 1000, "World shows in under 1 s even on a slow CPU"); });
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
