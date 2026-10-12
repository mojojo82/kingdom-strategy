/* v1114: after an audio interruption (iPhone alarm/call can leave the AudioContext running-but-silent) the next tap builds a fresh AudioContext and
   the music restarts on it; sound effects keep working; a long hide also flags it. Headless can't make a real interruption, so it is simulated
   (state "interrupted" event / long hide).  Run: node dev/simfork/g274_audio_rebuild.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 } });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "g274@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Audio"); await P.click("#ksGo"); await P.waitForTimeout(4000);
  await P.mouse.click(215, 500); await P.waitForTimeout(3500);
  const a = await P.evaluate(() => ({ ctx1: !!sfxCtx, state: sfxCtx && sfxCtx.state, music: !!(music.cur || music.el) }));
  // 1) simulated interruption -> flagged -> next tap = new context, music back
  const b1 = await P.evaluate(() => { window.__old = sfxCtx; sfxCtx.onstatechange.call(sfxCtx); Object.defineProperty(sfxCtx, "state", { configurable: true, get: () => "interrupted" }); sfxCtx.onstatechange(); return sfxNeedsRebuild; });
  await P.mouse.click(215, 500); await P.waitForTimeout(3500);
  const c = await P.evaluate(() => ({ newCtx: sfxCtx !== window.__old, state: sfxCtx && sfxCtx.state, count: window.sfxRebuildCount || 0, music: !!(music.cur || music.el), musicOnNew: !!(music.gain && music.gain.context === sfxCtx) }));
  // 2) long hide flags it too
  const d = await P.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, get: () => true }); document.dispatchEvent(new Event("visibilitychange")); sfxHiddenAt = Date.now() - 60000;
    Object.defineProperty(document, "hidden", { configurable: true, get: () => false }); document.dispatchEvent(new Event("visibilitychange")); return sfxNeedsRebuild; });
  await P.mouse.click(215, 500); await P.waitForTimeout(1500);
  const e2 = await P.evaluate(() => { try { sfxTone(440, 0.05, "square", 0.01); return { ok: true, count: window.sfxRebuildCount }; } catch (e) { return { ok: false, err: e.message }; } });
  console.log(JSON.stringify({ a, flagged: b1, c, longHideFlag: d, e2, errs })); await b.close();
  assert.deepStrictEqual(errs, []); assert(a.ctx1 && a.music, "audio + music start on a tap"); assert(b1, "interruption flags a rebuild");
  assert(c.newCtx && c.count === 1 && c.music && c.musicOnNew, "next tap: fresh context, music back on it"); assert(d, "long hide flags a rebuild"); assert(e2.ok && e2.count === 2, "sound effects work after");
  console.log("g274 ok");
})().catch((e) => { console.error(e); process.exit(1); });
