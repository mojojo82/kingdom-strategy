/* v1004: the game runs on the server's clock (the page's Date header), so a phone clock moved forward can't fast-forward the Idle Chest, production or timers.
   The game doesn't tick until the clock is checked (on load and when the app comes back to the front). Run: node dev/simfork/g226_server_clock.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
const SRV = { off: -8 * 3600e3, delay: 0 }; /* the server's clock = real time + off: -8h = the phone is 8 h ahead */
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 } });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, async (r) => { if (SRV.delay) await new Promise((res) => setTimeout(res, SRV.delay));
    r.fulfill({ status: 200, contentType: "text/html", headers: { date: new Date(Date.now() + SRV.off).toUTCString() }, body: r.request().method() === "HEAD" ? "" : GAME }); });
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "g226@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Emp"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const o = {};
  o.load = await P.evaluate(() => ({ ready: ksClockReady, skewH: +(ksClockSkew / 3600e3).toFixed(3), gameVsPhoneH: +((vnow() - Date.now()) / 3600e3).toFixed(3), atVsPhoneH: +((game.state.bucket.at - Date.now()) / 3600e3).toFixed(3) }));
  /* the cheat: the phone is put 8 h ahead while the app is in the background; the server says only 10 s passed */
  await P.evaluate(() => { const B = game.state.bucket; B.fillSec = 0; B.en = 0; B.items = {}; B.dropSec = 0; });
  SRV.off = -8 * 3600e3 + 10000; SRV.delay = 2500;
  await P.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, get: () => false }); document.dispatchEvent(new Event("visibilitychange")); });
  await P.waitForTimeout(400);
  o.during = await P.evaluate(() => { const a = game.state.bucket.at; return new Promise((res) => setTimeout(() => res({ ready: ksClockReady, ticked: game.state.bucket.at !== a }), 1500)); });
  await P.waitForTimeout(2500);
  o.after = await P.evaluate(() => ({ ready: ksClockReady, fillMin: +(game.bucketInfo().fillSec / 60).toFixed(2), items: game.bucketInfo().items.length }));
  /* a phone clock that is right (under a minute off) is left alone */
  SRV.off = 20000; SRV.delay = 0; await P.evaluate(() => ksClockCheck()); await P.waitForTimeout(800);
  o.small = await P.evaluate(() => ksClockSkew);
  /* no answer from the server: the game still runs (phone clock) after 5 s */
  await P.route(/mojojo82\.github\.io/, (r) => r.abort()); await P.evaluate(() => { ksClockReady = false; ksClockCheck(); }); await P.waitForTimeout(1200);
  o.failReady = await P.evaluate(() => ksClockReady);
  console.log(JSON.stringify(o));
  assert.ok(o.load.ready && Math.abs(o.load.skewH + 8) < 0.01 && Math.abs(o.load.gameVsPhoneH + 8) < 0.01, "on load the game clock follows the server (phone 8 h ahead -> game 8 h behind the phone)");
  assert.ok(Math.abs(o.load.atVsPhoneH + 8) < 0.01, "the Idle Chest runs on the game (server) clock");
  assert.ok(!o.during.ready && !o.during.ticked, "while the clock is being checked the game waits");
  assert.ok(o.after.ready && o.after.fillMin < 1 && o.after.items === 0, "moving the phone 8 h ahead gives no chest time (only the real ~10 s)");
  assert.strictEqual(o.small, 0, "a clock under a minute off is left alone");
  assert.ok(o.failReady, "server not answering: the game carries on");
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
