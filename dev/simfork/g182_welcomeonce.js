/* v922: the Welcome back popup must appear ONCE after being away (it appeared twice: the phone's own copy of the save loads first and shows it, then
   the cloud copy loads with the old "last seen" time and the same gap is noticed again). Also: rewards are paid once.
   Run: node dev/simfork/g182_welcomeonce.js (GAMEFILE=..., NOASSERT=1) */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
let slowCloud = false;
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 } });
  await ctx.exposeFunction("__fbstore", async (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; else if (slowCloud) await new Promise((r) => setTimeout(r, 2500)); return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "g182@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Away"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  /* save everywhere, then pretend the last visit was 3 hours ago (both the phone's copy and the cloud copy) */
  const lsKeys = await P.evaluate(() => { persist(); cloudSyncNow(true); return Object.keys(localStorage); });
  await P.waitForTimeout(1500);
  const AGO = Date.now() - 9 * 3600 * 1000; /* v1002: the popup now needs a FULL bucket (8 h cap) */
  const sk = Object.keys(store).find((k) => /players\/[^/]+\/save\/main$/.test(k)); store[sk].bucket.at = AGO; store[sk].bucket.en = 0; delete store[sk].bucket.away;
  const e0 = store[sk].energon || 0;
  await P.evaluate((AGO) => { Object.keys(localStorage).forEach((k) => { try { const v = JSON.parse(localStorage.getItem(k)); if (v && v.bucket && typeof v.bucket === "object") { v.bucket.at = AGO; v.bucket.en = 0; delete v.bucket.away; localStorage.setItem(k, JSON.stringify(v)); } } catch (e) {} }); }, AGO);
  slowCloud = true; /* the cloud copy arrives a little after the phone's own copy, like on a phone */
  await P.reload();
  let shows = 0, collected = 0;
  for (let i = 0; i < 40; i++) {
    await P.waitForTimeout(500);
    const vis = await P.evaluate(() => { const p = document.getElementById("wbPop"); return !!p && p.style.display === "flex"; });
    if (vis) { shows++; await P.click("#wbBtn"); collected++; await P.waitForTimeout(300); }
  }
  slowCloud = false;
  const e1 = await P.evaluate(() => Math.floor(game.state.energon));
  /* 2) the phone way: the page stays open in the background (timers frozen), then you switch back to it */
  const r2 = await P.evaluate(async () => {
    const st = game.state, e0 = Math.floor(st.energon); window.ksWelcomeBackCooldownReset && window.ksWelcomeBackCooldownReset();
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true }); document.dispatchEvent(new Event("visibilitychange"));
    st.bucket.at = Date.now() - 9 * 3600 * 1000; st.bucket.en = 0; st.bucket.val = 0; /* the phone froze the page for 9 h (v1002: full bucket needed) */
    Object.defineProperty(document, "hidden", { configurable: true, get: () => false }); document.dispatchEvent(new Event("visibilitychange")); window.dispatchEvent(new Event("pageshow")); window.dispatchEvent(new Event("focus"));
    let shows = 0;
    for (let i = 0; i < 30; i++) { await new Promise((r) => setTimeout(r, 500)); const p = document.getElementById("wbPop"); if (p && p.style.display === "flex") { shows++; document.getElementById("wbBtn").click(); } }
    return { shows, gained: Math.floor(st.energon) - e0 };
  });
  /* 3) dev-tools speed-up (admins): game time runs faster, but you were never away */
  const r3 = await P.evaluate(async () => {
    setDevSpeed(30); let shows = 0;
    for (let i = 0; i < 30; i++) { await new Promise((r) => setTimeout(r, 500)); const p = document.getElementById("wbPop"); if (p && p.style.display === "flex") { shows++; document.getElementById("wbBtn").click(); } }
    setDevSpeed(1); return { shows };
  });
  console.log("15 s of play at dev speed x30 (never away) -> popups:", r3.shows);
  if (!process.env.NOASSERT) assert.strictEqual(r3.shows, 0, "no popup without being away");
  /* 4) whatever makes the game think you were away AGAIN right after collecting: no second popup; the Energon waits in the Forge's idle bucket */
  const r4 = await P.evaluate(async () => {
    const st = game.state, b0 = Math.floor(st.bucket.en); st.bucket.at = vnow() - 30 * 60 * 1000; let shows = 0; /* game clock (dev speed above moved it ahead) */
    for (let i = 0; i < 8; i++) { await new Promise((r) => setTimeout(r, 500)); const p = document.getElementById("wbPop"); if (p && p.style.display === "flex") { shows++; document.getElementById("wbBtn").click(); } }
    return { shows, bucketGain: Math.floor(st.bucket.en) - b0 };
  });
  console.log("a second 'away' right after collecting -> popups:", r4.shows, "| went into the idle bucket:", r4.bucketGain);
  if (!process.env.NOASSERT) { assert.strictEqual(r4.shows, 0, "no second popup"); assert.ok(r4.bucketGain >= 19 && r4.bucketGain <= 21, "kept in the bucket"); }
  console.log("switching back after 9 h in the background (8 h cap) -> popups:", r2.shows, "| energon gained", r2.gained, "(320 expected = 8 h cap)");
  if (!process.env.NOASSERT) { assert.strictEqual(r2.shows, 1, "popup once on resume"); assert.ok(r2.gained >= 316 && r2.gained <= 324, "paid once on resume"); }
  console.log("Welcome back popups after one 9 h absence:", shows, "| energon before", e0, "after", e1, "(8 h cap x 40/h = 320 expected)");
  console.log("errs", errs.slice(0, 3));
  if (!process.env.NOASSERT) { assert.strictEqual(shows, 1, "popup once"); assert.ok(e1 - e0 >= 315 && e1 - e0 <= 325, "paid once"); assert.deepStrictEqual(errs, []); console.log("ALL OK"); }
  await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
