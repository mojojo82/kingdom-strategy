/* v916: (1) the chapter-1 boss always shows its orb (no sword-swing swap); (2) music/sfx stop while the page is hidden and resume on return.
   Run: node dev/simfork/g172_bosshidden.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(path.join(ROOT, "test/index.html"), "utf8");
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
  await P.fill("#ksE", "g172@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Hider"); await P.click("#ksGo"); await P.waitForTimeout(5000);

  /* 1. boss orbs */
  const r = await P.evaluate(async () => {
    setScreen("conquest"); const st = game.state.idle; st.chapter = 1; st.levelNum = 1; st.enemies = []; st.bossPhase = true; st.enemiesKilledInLevel = 0; st.spawnTimer = null;
    const log = { orbs: 0, swings: 0, hpDrops: 0 }, orig = window.spawnEnemyProjectile;
    window.spawnEnemyProjectile = function (fx, fy, w, h, arc, dmg, orb) { if (orb) log.orbs++; return orig.apply(this, arguments); };
    let lf = 0, lh = st.playerHp; const iv = setInterval(() => { const f = idleAnim.bossMeleeFlash || 0; if (f > lf + 0.5) log.swings++; lf = f; if (st.playerHp < lh) log.hpDrops++; lh = st.playerHp; }, 30);
    await new Promise((r) => setTimeout(r, 25000)); clearInterval(iv); return log;
  });
  console.log("1. boss over 25s ->", JSON.stringify(r)); assert.ok(r.hpDrops >= 3, "boss hit us"); assert.strictEqual(r.swings, 0, "no sword-swing swap"); assert.ok(r.orbs >= r.hpDrops, "an orb for every hit");

  /* 2. hidden page stops the audio, visible page resumes it */
  await P.mouse.click(200, 400); await P.waitForTimeout(1500);
  const hide = (h) => P.evaluate((h) => { Object.defineProperty(document, "hidden", { configurable: true, get: () => h }); document.dispatchEvent(new Event("visibilitychange")); return new Promise((r) => setTimeout(() => r(sfxCtx ? sfxCtx.state : "none"), 500)); }, h);
  const before = await P.evaluate(() => sfxCtx ? sfxCtx.state : "none"); console.log("2. audio before:", before); assert.strictEqual(before, "running");
  const hid = await hide(true); console.log("   hidden ->", hid); assert.strictEqual(hid, "suspended");
  const back = await hide(false); console.log("   visible ->", back); assert.strictEqual(back, "running");
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
