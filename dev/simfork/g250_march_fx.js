/* v1054: attack marches park short of the target and fire shells at it (visual only); 3D ships stay visible far from the map corner. Run: node dev/simfork/g250_march_fx.js */
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
  await P.fill("#ksE", "g250@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Emp"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const o = await P.evaluate(async () => { const st = game.state; st.troops.infantry = 500; st.formations[1].troops = { infantry: 50, archer: 0, cavalry: 0 }; setScreen("world");
    const h = tileXY(st.homeTileId); let t = null; for (let r = 3; r < 15 && !t; r++) for (let dx = -r; dx <= r && !t; dx++) { const tt = mapTileById(st.map, (h[0] + dx) + "," + (h[1] + r)); if (tt && tt.type === "resource") t = tt; }
    selectedTile = t.id; renderTileInfo(); await new Promise((r) => setTimeout(r, 300));
    [...document.querySelectorAll(".formation-attack-btn")][1].click(); await new Promise((r) => setTimeout(r, 300));
    const m = st.marches[st.marches.length - 1]; m.action = "attack"; m.status = "acting"; m.arriveAt = vnow() - 1000; m.actionEnd = vnow() + 120000;
    window.__mt = t; centerMapOnTile && centerMapOnTile(t.id); march3dOn = true; setMapZoom(2.2); centerMapOnTile(t.id); return { id: m.id, tile: t.id, home: st.homeTileId }; });
  await P.waitForTimeout(1500);
  const shots = [];
  for (let i = 0; i < 6; i++) { await P.waitForTimeout(110);
    const g = await P.evaluate(() => { updateMarchMarkers(true); const gl = marchGL.gl, W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, px = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d"), im = x.createImageData(W, H);
      for (let y = 0; y < H; y++) im.data.set(px.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
      for (let k = 0; k < im.data.length; k += 4) { const a = im.data[k + 3]; if (a) { im.data[k] = Math.min(255, im.data[k] * 255 / a); im.data[k + 1] = Math.min(255, im.data[k + 1] * 255 / a); im.data[k + 2] = Math.min(255, im.data[k + 2] * 255 / a); } }
      let lit = 0; for (let k = 3; k < px.length; k += 4) if (px[k]) lit++; x.putImageData(im, 0, 0); const r = marchGL.cv.getBoundingClientRect(); return { lit, url: c.toDataURL(), x: r.left, y: r.top, w: r.width, h: r.height }; });
    shots.push(await P.evaluate(() => document.querySelectorAll(".mfx-shot,.mfx-boom").length)); await P.screenshot({ path: (process.env.OUT || "/tmp/") + "fx" + i + ".png" });
    o.lit = Math.max(o.lit || 0, g.lit); fs.writeFileSync((process.env.OUT || "/tmp/") + "gl" + i + ".png", Buffer.from(g.url.split(",")[1], "base64")); fs.writeFileSync((process.env.OUT || "/tmp/") + "gl" + i + ".json", JSON.stringify(g, (k, v) => k === "url" ? undefined : v)); }
  o.counts = shots;
  o.mk = await P.evaluate(() => { const e = document.querySelector(".march-marker.acting"); const tp = marchTileCenterPx(window.__mt); return e && [e.style.left, e.style.top, tp.x, tp.y]; });
  await P.evaluate(() => { march3dOn = true; }); await P.waitForTimeout(1500);
  o.gl = await P.evaluate(() => [marchGL.ok, marchGL.gl && marchGL.gl.getError(), document.querySelectorAll(".mfx-shot").length]);
  o.glLit = shots.length;
  console.log(JSON.stringify(o), errs);
  const assert = require("assert");
  assert.ok(o.counts.some((n) => n > 0), "shells/bursts appear while fighting");
  const mx = parseFloat(o.mk[0]), my = parseFloat(o.mk[1]); assert.ok(Math.hypot(mx - o.mk[2], my - o.mk[3]) > 20, "ship parks short of the target");
  assert.ok(o.gl[0] && o.gl[1] === 0, "3D layer ok, no WebGL error");
  assert.ok(o.lit > 500, "3D ship actually drawn (was clipped away at big map coords)");
  assert.deepStrictEqual(errs, []);
  console.log("g250 OK"); await b.close();
})();
