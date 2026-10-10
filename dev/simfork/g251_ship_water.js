/* v1057/v1058: water round the 3D march ships (wake, foam, ripples), drawn in the ship WebGL canvas while sailing and parked; gone when the Dev Tools switch is off. Run: node dev/simfork/g251_ship_water.js */
/* v1048: march ship skin per formation (Skins > Marches); the march carries it, it is shared, and the 3D ship is drawn with it. Run: node dev/simfork/g249_march_skins.js */
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
  await P.fill("#ksE", "g251@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Emp"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const o = {}; await P.evaluate(async () => { const st = game.state; st.troops.infantry = 500; st.formations[1].troops = { infantry: 50, archer: 0, cavalry: 0 }; setScreen("world");
    const h = tileXY(st.homeTileId); let t = null; for (let r = 7; r < 20 && !t; r++) for (let dx = -r; dx <= r && !t; dx++) { const tt = mapTileById(st.map, (h[0] + dx) + "," + (h[1] + r)); if (tt && tt.type === "resource") t = tt; }
    selectedTile = t.id; renderTileInfo(); await new Promise((r) => setTimeout(r, 300));
    [...document.querySelectorAll(".formation-attack-btn")][1].click(); await new Promise((r) => setTimeout(r, 300));
    const m = st.marches[st.marches.length - 1]; m.skin = "ghost_galleon"; m.travelSec = 1000; m.arriveAt = vnow() + 450000; march3dOn = true; return 1; });
  const ink = () => P.evaluate(() => { updateMarchMarkers(true); const gl = marchGL.gl, W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, px = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px); let n = 0; for (let k = 3; k < px.length; k += 4) if (px[k] > 20) n++; return n; });
  await P.waitForTimeout(600);
  o.sail = await ink(); o.waterV = await P.evaluate(() => marchWater.n);
  await P.evaluate(() => { const m = game.state.marches[game.state.marches.length - 1]; m.action = "attack"; m.status = "acting"; m.arriveAt = vnow() - 800; m.actionEnd = vnow() + 120000; });
  await P.waitForTimeout(300); o.park = await ink();
  o.parkV = await P.evaluate(() => marchWater.n); await P.evaluate(() => document.getElementById("devMarch3dWaterBtn").click()); o.off = await ink(); o.btn = await P.evaluate(() => document.getElementById("devMarch3dWaterBtn").textContent);
  o.gl = await P.evaluate(() => marchGL.gl.getError());
  console.log(JSON.stringify(o), errs);
  assert.ok(o.waterV > 300 && o.parkV > 300, "water built while sailing and parked"); assert.ok(o.sail > o.off + 500, "water pixels drawn (vs switched off)"); assert.ok(o.park > o.off + 500, "parked water drawn"); assert.ok(/Off/.test(o.btn)); assert.strictEqual(o.gl, 0); assert.deepStrictEqual(errs, []);
  console.log("g251 OK"); await b.close();
})();
