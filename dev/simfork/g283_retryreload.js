/* v1137: boss-retry mode (endless horde + skull) survives closing and reopening the app - saved the moment you lose, and a save from mid boss fight also comes back as retry. Run: node dev/simfork/g283_retryreload.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "g283@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Retry"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const S = () => P.evaluate(() => { const I = game.state.idle, btn = document.getElementById("idleBossRetryBtn"); return { retry: !!I.bossRetry, boss: !!I.bossPhase, label: I.chapter + "-" + I.levelNum, btn: !!btn && getComputedStyle(btn).display !== "none" }; });
  const saved = () => { for (const k in store) { const v = store[k]; if (k.endsWith("/save/main") && v && v.idle) return { retry: !!v.idle.bossRetry, boss: !!v.idle.bossPhase, label: v.idle.chapter + "-" + v.idle.levelNum }; } return null; };
  const reopen = async () => { await P.reload(); await P.waitForTimeout(8000); await P.evaluate(() => setScreen("conquest")); await P.waitForTimeout(2500); return S(); };
  const out = {};
  // A) mid boss fight saved, app closed before anything else got saved -> back with the skull
  await P.evaluate(() => { setScreen("conquest"); const I = game.state.idle; I.chapter = 2; I.levelNum = 4; I.enemiesKilledInLevel = 0; I.bossPhase = true; I.enemies = []; I.spawnTimer = null; cloudSyncNow(true); });
  await P.waitForTimeout(1500); out.savedMidBoss = saved();
  out.A = await reopen();
  // B) lose to the boss, close the app without tapping anything -> the defeat itself saved retry mode
  await P.evaluate(() => { const b = document.getElementById("idleBossRetryBtn"); if (b) b.click(); }); await P.waitForTimeout(3000);
  out.bossAgain = await S();
  await P.evaluate(() => { game.state.idle.playerHp = 0; }); await P.waitForTimeout(4000);
  out.savedAfterDefeat = saved();
  out.B = await reopen();
  console.log(JSON.stringify(out), JSON.stringify(errs));
  await b.close();
  if (!process.env.NOASSERT) {
    assert.deepStrictEqual(errs, []);
    assert(out.savedMidBoss.boss && !out.savedMidBoss.retry, "save from the boss fight");
    assert(out.A.retry && out.A.btn && !out.A.boss && out.A.label === "2-4", "reopened mid-boss save -> skull");
    assert(out.bossAgain.boss && !out.bossAgain.retry, "skull starts the boss");
    assert(out.savedAfterDefeat.retry, "defeat saved straight away");
    assert(out.B.retry && out.B.btn && !out.B.boss && out.B.label === "2-4", "reopened after the defeat -> skull");
    console.log("g283 ok");
  }
})().catch((e) => { console.error(e); process.exit(1); });
