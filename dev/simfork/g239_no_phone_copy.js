/* v1026: base alignment never depends on the phone - stale copies of the map look / skin alignment in the phone's storage are ignored, and the
   base-picture measurements are built in (a phone that couldn't measure used to fall back to a guess ~half a tile off). Run: node dev/simfork/g239_no_phone_copy.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 } });
  /* stale copies on the phone, and image measuring broken (as on a phone where it fails) */
  await ctx.addInitScript(() => { try { localStorage.setItem("kingdom_prototype_mapisocfg_v2", JSON.stringify({ tile: 30, base: 5, y: 40 })); localStorage.setItem("kingdom_prototype_skinalign_v1", JSON.stringify({ castle: { x: 1, y: 1, s: 2 } })); } catch (e) {}
    const gid = CanvasRenderingContext2D.prototype.getImageData; CanvasRenderingContext2D.prototype.getImageData = function () { throw new Error("measuring disabled for the test"); }; });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "g239@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Emp"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const o = await P.evaluate(() => ({ iso: JSON.stringify(isoCfg), align: JSON.stringify(SKIN_ALIGN), castle: cityArtGet(CITY_SKINS.castle.src), mecha: cityArtGet(CITY_SKINS.mecha.src) }));
  console.log(JSON.stringify(o));
  assert.strictEqual(o.iso, JSON.stringify({ tile: 30, base: 3.2, y: 0 }), "the phone's old map look copy is not used");
  assert.strictEqual(o.align, "{}", "the phone's old skin alignment copy is not used");
  assert.ok(Math.abs(o.castle.fy - 0.6981) < 1e-4 && Math.abs(o.mecha.aspect - 1.3125) < 1e-4, "built-in measurements even when the phone can't measure");
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
