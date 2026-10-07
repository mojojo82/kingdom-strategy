/* v926d: moving sea foam on the World map (plain elements inside the map, CSS-animated). Checks: foam appears and drifts, never on painted land,
   sea colour unchanged, it scrolls natively with the map (elements keep their map position), stops being recycled off the World map, the FPS badge
   readout, and the cost of the twice-a-second recycle. Phone size. Run: node dev/simfork/g185_seafoam.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const OUT = process.env.OUT || "/tmp/";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(path.join(ROOT, "test/index.html"), "utf8");
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
  const r = await P.evaluate(async () => {
    const out = {}, vp = document.getElementById("mapviewport");
    out.seaBg = getComputedStyle(vp).backgroundImage.slice(0, 60);
    terrainEnsure(); const mid = seaFoamTileAt(vp.scrollLeft + vp.clientWidth / 2, vp.scrollTop + vp.clientHeight / 2);
    for (let y = mid[1] - 4; y <= mid[1] + 4; y++) for (let x = mid[0] - 4; x <= mid[0] + 4; x++) terrainArr[y * terrainN + x] = 1;
    seaFoam.zoomKey = ""; seaFoamTick(); /* re-place every streak now that there is land */
    let onLand = 0, maxLive = 0; const t0 = performance.now();
    await new Promise((res) => { const iv = setInterval(() => { const live = seaFoam.els.filter((e) => e.style.display !== "none"); maxLive = Math.max(maxLive, live.length); live.forEach((e) => { const t = seaFoamTileAt(+e.dataset.x, +e.dataset.y); if (Math.abs(t[0] - mid[0]) <= 4 && Math.abs(t[1] - mid[1]) <= 4) onLand++; }); if (performance.now() - t0 > 6000) { clearInterval(iv); res(); } }, 250); });
    out.onLand = onLand; out.maxLive = maxLive;
    const e0 = seaFoam.els.find((e) => e.style.display !== "none"); const tr1 = getComputedStyle(e0).transform; await new Promise((r) => setTimeout(r, 600)); out.drifts = getComputedStyle(e0).transform !== tr1;
    out.inside = document.getElementById("mapworld").firstChild === seaFoam.box;
    const e1 = seaFoam.els.filter((e) => e.style.display !== "none" && +e.dataset.end - performance.now() > 1500).sort((a, b) => Math.abs(+a.dataset.x - vp.scrollLeft - vp.clientWidth / 2) - Math.abs(+b.dataset.x - vp.scrollLeft - vp.clientWidth / 2))[0] || e0; /* a streak mid-view with life left, so the next tick can't recycle it */
    const l0 = e1.style.left; vp.scrollLeft += 80; await new Promise((r) => setTimeout(r, 120)); out.scrollsNatively = e1.style.left === l0;
    let tot = 0; for (let i = 0; i < 40; i++) { const a = performance.now(); seaFoamTick(); tot += performance.now() - a; } out.msPerTick = Math.round(tot / 40 * 100) / 100;
    out.badge = document.getElementById("fpsCounter").textContent;
    setScreen("conquest"); const snap = seaFoam.els.map((e) => e.dataset.end).join(); await new Promise((r) => setTimeout(r, 1200)); out.idleOffMap = seaFoam.els.map((e) => e.dataset.end).join() === snap; setScreen("world");
    return out;
  });
  await P.waitForTimeout(2500); await P.screenshot({ path: OUT + "seafoam_phone.png" });
  console.log(JSON.stringify(r)); console.log("errs", errs.slice(0, 3));
  if (!process.env.NOASSERT) { assert.ok(r.maxLive >= 10, "foam shows"); assert.strictEqual(r.onLand, 0, "never on land"); assert.ok(r.drifts, "drifts"); assert.ok(r.inside && r.scrollsNatively, "inside the map, scrolls with it");
    assert.strictEqual(r.seaBg, "linear-gradient(rgb(47, 107, 147), rgb(53, 117, 155))", "sea colour unchanged"); assert.ok(/v9[2-9][0-9]/.test(r.badge) && /🌊/.test(r.badge), "badge readout"); assert.ok(r.idleOffMap, "nothing recycled off the map"); assert.ok(r.msPerTick < 3, "cheap");
    assert.deepStrictEqual(errs, []); console.log("ALL OK"); }
  await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
