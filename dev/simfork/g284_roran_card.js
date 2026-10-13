/* v1138: animated hero card (Roran, copy of g277). Hero grid card and hero profile show a canvas that draws the looping Blender sheet and changes over time;
   other heroes keep their still art; no page errors. Screenshots out_g284_*.png.  Run: node dev/simfork/g277_herocard_anim.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "g284@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Card"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => { game.state.heroes.roran.owned = true; setScreen("heroes"); }); await P.waitForTimeout(2500);
  const sample = (sel) => P.evaluate((sel) => { const c = document.querySelector(sel); if (!c) return null; const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let n = 0, h = 0; for (let i = 3; i < d.length; i += 4 * 37) { if (d[i] > 20) { n++; h = (h * 31 + d[i - 3] + d[i - 2] * 7) >>> 0; } } return { w: c.width, h: c.height, filled: n, hash: h }; }, sel);
  const g1 = await sample('canvas.hcard-art[data-hkey="roran"]'); await P.waitForTimeout(450); const g2 = await sample('canvas.hcard-art[data-hkey="roran"]');
  const stills = await P.evaluate(() => document.querySelectorAll("img.hcard-art").length);
  await P.screenshot({ path: path.join(__dirname, "out_g284_grid.png") });
  await P.evaluate(() => openHeroDetail("roran")); await P.waitForTimeout(1500);
  const d1 = await sample("#hdPortraitAnim"); await P.waitForTimeout(450); const d2 = await sample("#hdPortraitAnim");
  const imgHidden = await P.evaluate(() => getComputedStyle(document.getElementById("hdPortraitImg")).display === "none");
  await P.screenshot({ path: path.join(__dirname, "out_g284_profile.png") });
  const other = await P.evaluate(() => { const k = HERO_ORDER.find((h) => !HERO_CARD_ANIM[h]); openHeroDetail(k); return { k, anim: getComputedStyle(document.getElementById("hdPortraitAnim")).display }; });
  console.log(JSON.stringify({ g1, g2, stills, d1, d2, imgHidden, other, errs })); await b.close();
  if (!process.env.NOASSERT) {
    assert.deepStrictEqual(errs, []); assert(g1 && g1.filled > 50, "grid card drawn"); assert(g1.hash !== g2.hash, "grid card animates");
    assert(d1 && d1.filled > 50 && d1.w > 600, "profile drawn at phone resolution"); assert(d1.hash !== d2.hash, "profile animates"); assert(imgHidden, "still art hidden for Roran");
    assert.strictEqual(other.anim, "none", "other heroes keep their still art"); console.log("g284 ok");
  }
})().catch((e) => { console.error(e); process.exit(1); });
