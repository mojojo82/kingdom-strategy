/* v926: moving sea foam on the World map. Checks: foam appears and moves, never on painted land, the sea colour is unchanged, it stays put while
   the map is dragged, it stops off the World map; measures the foam's own cost per frame. Phone size. Run: node dev/simfork/g185_seafoam.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const OUT = process.env.OUT || "/tmp/";
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
  await P.fill("#ksE", "g185@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Sailor"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => setScreen("world")); await P.waitForTimeout(2500);
  const hasFoam = typeof (await P.evaluate(() => typeof seaFoam)) === "string" && (await P.evaluate(() => typeof seaFoam !== "undefined"));
  /* paint a block of land in view, then check no foam is ever on it */
  const r = await P.evaluate(async (hasFoam) => {
    const out = {}, vp = document.getElementById("mapviewport");
    out.seaBg = getComputedStyle(vp).backgroundImage.slice(0, 60);
    if (!hasFoam) return out;
    terrainEnsure(); const mid = seaFoamTileAt(vp.scrollLeft + vp.clientWidth / 2, vp.scrollTop + vp.clientHeight / 2);
    for (let y = mid[1] - 4; y <= mid[1] + 4; y++) for (let x = mid[0] - 4; x <= mid[0] + 4; x++) terrainArr[y * terrainN + x] = 1;
    seaFoam.list = [];
    let onLand = 0, samples = 0, maxN = 0; const cost = []; const orig = seaFoamFrame;
    const t0 = performance.now(); let moved = null;
    await new Promise((res) => { const iv = setInterval(() => { samples++; maxN = Math.max(maxN, seaFoam.list.length); seaFoam.list.forEach((f) => { const t = seaFoamTileAt(f.x, f.y); if (Math.abs(t[0] - mid[0]) <= 4 && Math.abs(t[1] - mid[1]) <= 4) onLand++; }); if (!moved && seaFoam.list[0]) moved = { f: seaFoam.list[0], x: seaFoam.list[0].x }; if (performance.now() - t0 > 4000) { clearInterval(iv); res(); } }, 100); });
    out.onLand = onLand; out.samples = samples; out.maxN = maxN; out.moves = moved ? Math.round((moved.f.x - moved.x) * 10) / 10 : null;
    /* cost of one foam frame */
    const vp2 = vp; let tot = 0; for (let i = 0; i < 60; i++) { seaFoam.last = 0; const a = performance.now(); seaFoamFrame(performance.now() + i * 40); tot += performance.now() - a; } out.msPerFrame = Math.round(tot / 60 * 100) / 100; seaFoam.last = 0;
    /* drag the map: foam keeps its map position (canvas follows the view) */
    const f0 = seaFoam.list[0], fx = f0 && f0.x; vp.scrollLeft += 120; await new Promise((r) => setTimeout(r, 200)); out.dragKeepsFoam = !f0 || Math.abs(f0.x - fx) < 3; out.layerOutsideMap = !document.getElementById("mapworld").contains(seaFoam.cv) && seaFoam.cv.parentNode === vp.parentNode;
    out.layerBg = getComputedStyle(seaFoam.cv).backgroundImage.slice(0, 60); out.windowBg = getComputedStyle(vp).backgroundColor + " " + getComputedStyle(vp).backgroundImage.slice(0, 20);
    /* off the World map it stops */
    setScreen("conquest"); await new Promise((r) => setTimeout(r, 300)); const lastA = seaFoam.last; await new Promise((r) => setTimeout(r, 600)); out.stopsOffMap = seaFoam.last === lastA; setScreen("world");
    return out;
  }, hasFoam);
  await P.waitForTimeout(1500); await P.screenshot({ path: OUT + "seafoam_phone.png" });
  console.log(JSON.stringify(r)); console.log("errs", errs.slice(0, 3));
  if (!process.env.NOASSERT) { assert.ok(r.maxN >= 10, "foam shows"); assert.strictEqual(r.onLand, 0, "never on land"); assert.ok(r.moves > 0, "drifts"); assert.ok(r.dragKeepsFoam, "stays on the water when dragging"); assert.ok(r.layerOutsideMap, "layer behind the map window, not inside the scrolling map"); assert.strictEqual(r.layerBg, "linear-gradient(rgb(47, 107, 147), rgb(53, 117, 155))", "same sea gradient as the map always had"); assert.ok(r.stopsOffMap, "stops off the map"); assert.ok(r.msPerFrame < 2, "cheap"); assert.deepStrictEqual(errs, []); console.log("ALL OK"); }
  await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
