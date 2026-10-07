/* v927: server chip top-right of the World map; view-centre X/Y at the bottom middle; tap X/Y to jump. Run: node dev/simfork/g186_mapcoords.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const OUT = process.env.OUT || "/tmp/";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  async function run(vp, tag, email) {
    const ctx = await b.newContext({ viewport: vp });
    await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
    await ctx.exposeFunction("__fbcall", call);
    await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
    await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
    await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(tag + ": " + e.message));
    await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
    await P.fill("#ksE", email); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
    await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Scout"); await P.click("#ksGo"); await P.waitForTimeout(5000);
    await P.evaluate(() => setScreen("world")); await P.waitForTimeout(1200);
    await P.evaluate(() => centerMapOnHome()); await P.waitForTimeout(900);
    const r = await P.evaluate(() => {
      const box = (id) => { const e = document.getElementById(id); if (!e) return null; const b = e.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top), r: Math.round(b.right), b: Math.round(b.bottom), w: Math.round(b.width), shown: getComputedStyle(e).display !== "none" }; };
      return { chip: box("ksFbBadge"), coords: box("mapCoords"), map: box("mapviewport"), recon: box("mapReconBtn"), mail: box("mapMailBtn"), fps: box("fpsCounter"), text: document.getElementById("mapCoords").textContent, home: game.state.homeTileId, vw: innerWidth };
    });
    await P.screenshot({ path: OUT + "map_coords_" + tag + ".png" });
    const hx = r.home.split(",").map(Number), m = r.text.match(/X:(\d+)\s+Y:(\d+)/);
    console.log(tag, JSON.stringify(r));
    assert.ok(m && Math.abs(+m[1] - hx[0]) <= 1 && Math.abs(+m[2] - hx[1]) <= 1, "coords show home after Center on Home");
    assert.ok(r.chip.r >= r.map.r - 12 && r.chip.y <= r.map.y + 12, "chip top-right of map");
    assert.ok(r.chip.x > r.fps.r, "chip not over the FPS badge");
    assert.ok(Math.abs((r.coords.x + r.coords.r) / 2 - (r.map.x + r.map.r) / 2) <= 2, "coords centred");
    assert.ok(r.coords.b < r.map.b, "coords on the map");
    if (r.recon.shown) assert.ok(r.recon.y >= r.chip.b || r.recon.x >= r.chip.r || r.recon.r <= r.chip.x, "recon not under chip");
    /* home bubble: hidden while home is on screen; shows on the edge toward home once you scroll away; tap goes home */
    const hb0 = await P.evaluate(() => ({ on: document.getElementById("mapHomeBubble").classList.contains("on"), centerBtn: getComputedStyle(document.getElementById("mapCenterHomeBtn")).display }));
    assert.deepStrictEqual(hb0, { on: false, centerBtn: "none" });
    await P.evaluate(() => { const v = document.getElementById("mapviewport"); v.scrollLeft += 1500; v.scrollTop += 900; }); await P.waitForTimeout(400);
    const hb1 = await P.evaluate(() => { const e = document.getElementById("mapHomeBubble"), b = e.getBoundingClientRect(), v = document.getElementById("mapviewport").getBoundingClientRect(); return { on: e.classList.contains("on"), x: b.left + b.width / 2, y: b.top + b.height / 2, txt: e.textContent, v: { l: v.left, r: v.left + document.getElementById("mapviewport").clientWidth, t: v.top, b: Math.min(v.bottom, innerHeight) } }; });
    console.log(tag, "bubble after scrolling right/down:", JSON.stringify(hb1));
    await P.screenshot({ path: OUT + "map_home_" + tag + ".png" });
    assert.ok(hb1.on && /\d+ km/.test(hb1.txt), "bubble shows distance");
    assert.ok(hb1.x > hb1.v.l && hb1.x < hb1.v.r && hb1.y > hb1.v.t && hb1.y < hb1.v.b, "bubble inside the map");
    assert.ok(hb1.x < (hb1.v.l + hb1.v.r) / 2 + 1 || hb1.y < (hb1.v.t + hb1.v.b) / 2 + 1, "bubble on the home side (up/left)");
    await P.click("#mapHomeBubble"); await P.waitForTimeout(500);
    const hb2 = await P.evaluate(() => ({ on: document.getElementById("mapHomeBubble").classList.contains("on"), t: document.getElementById("mapCoords").textContent }));
    assert.ok(!hb2.on && hb2.t === r.text, "tap bubble -> back home"); 
    /* v930: home BELOW the view -> bubble must sit above the X/Y pill (phones: above the chat bar) */
    await P.evaluate(() => { centerMapOnHome(); const v = document.getElementById("mapviewport"); v.scrollTop -= 1400; }); await P.waitForTimeout(400);
    const hb3 = await P.evaluate(() => { const e = document.getElementById("mapHomeBubble").getBoundingClientRect(), c = document.getElementById("mapCoords").getBoundingClientRect(); return { on: document.getElementById("mapHomeBubble").classList.contains("on"), bb: e.bottom, pillTop: c.top }; });
    console.log(tag, "home below:", JSON.stringify(hb3)); await P.screenshot({ path: OUT + "map_home_below_" + tag + ".png" });
    assert.ok(hb3.on && hb3.bb <= hb3.pillTop, "bubble above the X/Y pill / chat bar");
    await P.evaluate(() => centerMapOnHome()); await P.waitForTimeout(300);
    /* scroll changes the coords */
    const t0 = r.text; await P.evaluate(() => { const v = document.getElementById("mapviewport"); v.scrollLeft += 400; v.scrollTop += 300; }); await P.waitForTimeout(300);
    const t1 = await P.evaluate(() => document.getElementById("mapCoords").textContent); assert.notStrictEqual(t0, t1, "coords follow scrolling");
    /* tap -> jump */
    P.once("dialog", (d) => d.accept("40 55")); await P.click("#mapCoords"); await P.waitForTimeout(900);
    const t2 = await P.evaluate(() => document.getElementById("mapCoords").textContent); console.log(tag, "jump ->", t2);
    const m2 = t2.match(/X:(\d+)\s+Y:(\d+)/); assert.ok(Math.abs(+m2[1] - 40) <= 1 && Math.abs(+m2[2] - 55) <= 1, "jump lands");
    /* leaving World puts the chip back and hides coords */
    await P.evaluate(() => setScreen("city")); await P.waitForTimeout(700);
    const off = await P.evaluate(() => ({ parent: document.getElementById("ksFbBadge").parentNode.tagName, coords: getComputedStyle(document.getElementById("mapCoords")).display }));
    assert.deepStrictEqual(off, { parent: "BODY", coords: "none" }); assert.ok(!(await P.evaluate(() => document.getElementById("mapHomeBubble").classList.contains("on"))), "bubble gone off World");
    await ctx.close();
  }
  await run({ width: 430, height: 932 }, "phone", "g186a@test.dev");
  await run({ width: 1400, height: 900 }, "pc", "g186b@test.dev");
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
