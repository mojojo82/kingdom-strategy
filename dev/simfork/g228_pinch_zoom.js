/* v1007/v1008: pinch-zoom keeps the spot under your fingers under them (zoom + pan in one gesture). v1008: during the pinch the map is only
   stretched with a CSS transform (no scrolling / relayout), the real zoom + scroll is applied once when the fingers lift. The "you are here" pin stays on the base. Run: node dev/simfork/g228_pinch_zoom.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "g228@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Emp"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => { setScreen("world"); setMapZoom(mapZoom * 9 / tilePxZ()); centerMapOnTile(game.state.homeTileId); }); await P.waitForTimeout(1500);
  const cdp = await ctx.newCDPSession(P);
  const home = () => P.evaluate(() => { const vp = document.getElementById("mapviewport"), vr = vp.getBoundingClientRect(), c = tileCenterPx(mapTileById(game.state.map, game.state.homeTileId)), el = document.getElementById("myPin");
    const pr = el && el.style.display !== "none" ? el.getBoundingClientRect() : null;
    return { x: vr.left + c.x - vp.scrollLeft, y: vr.top + c.y - vp.scrollTop, z: mapZoom, tf: document.getElementById("mapworld").style.transform, sl: vp.scrollLeft, pin: pr ? [Math.round(pr.left + pr.width / 2), Math.round(pr.bottom)] : null }; });
  const touch = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts });
  const o = { cases: [] };
  /* pinch out and in around different spots while the fingers also drift (pan) */
  for (const [cx, cy, d0, d1, dx, dy] of [[215, 450, 140, 40, 30, -20], [120, 300, 40, 150, -25, 40], [250, 600, 140, 25, 10, 10], [215, 450, 25, 140, -15, -30]]) {
    const h0 = await home();
    await touch("touchStart", [{ x: cx - d0, y: cy }, { x: cx + d0, y: cy }]);
    const N = 8; for (let i = 1; i <= N; i++) { const d = d0 + (d1 - d0) * i / N, mx = cx + dx * i / N, my = cy + dy * i / N; await touch("touchMove", [{ x: mx - d, y: my }, { x: mx + d, y: my }]); await P.waitForTimeout(20); }
    await P.waitForTimeout(80); const mid = await home();
    await touch("touchEnd", []); await P.waitForTimeout(300); const h1 = await home();
    const f = h1.z / h0.z, ex = cx + dx + (h0.x - cx) * f, ey = cy + dy + (h0.y - cy) * f; /* where the base should be: same spot relative to the fingers */
    const pinMid = mid.pin && h0.pin ? [Math.round(mid.pin[0] - ex), Math.round(mid.pin[1] - ey)] : null; /* during the pinch the (stretched) pin already sits where the base will end up */
    o.cases.push({ f: +f.toFixed(2), off: [Math.round(h1.x - ex), Math.round(h1.y - ey)], tfDuring: !!mid.tf, noScrollDuring: mid.sl === h0.sl, tfAfter: h1.tf, pinMid, pinOff: h1.pin ? [h1.pin[0] - Math.round(h1.x), h1.pin[1] - Math.round(h1.y)] : null });
  }
  console.log(JSON.stringify(o));
  o.cases.forEach((c, i) => {
    assert.ok(Math.abs(c.f - 1) > 0.3, "case " + i + ": the zoom changed");
    assert.ok(Math.abs(c.off[0]) <= 3 && Math.abs(c.off[1]) <= 3, "case " + i + ": the map stays under the fingers (no jump)");
    assert.ok(c.tfDuring && c.noScrollDuring && c.tfAfter === "", "case " + i + ": stretched (no scrolling) during the pinch, cleared after");
    if (c.pinMid) assert.ok(Math.abs(c.pinMid[0]) <= 3 && Math.abs(c.pinMid[1]) <= 3, "case " + i + ": during the pinch the base follows the fingers");
    if (c.pinOff) assert.ok(Math.abs(c.pinOff[0]) <= 1 && Math.abs(c.pinOff[1]) <= 1, "case " + i + ": pin on the base");
  });
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
