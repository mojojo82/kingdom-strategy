/* v1134: beaten by a boss -> the level restarts as an endless horde (kills don't count, no boss) and the skull button starts a boss attempt whenever. Run: node dev/simfork/g281_bossretry.js */
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
  await P.fill("#ksE", "g281@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Retry"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => { setScreen("conquest"); const I = game.state.idle; I.chapter = 2; I.levelNum = 4; });
  await P.waitForTimeout(1500);
  const S = () => P.evaluate(() => { const I = game.state.idle, btn = document.getElementById("idleBossRetryBtn");
    return { retry: !!I.bossRetry, boss: !!I.bossPhase, pending: I.pending && I.pending.type, kills: I.enemiesKilledInLevel, enemies: I.enemies.length, bossUp: I.enemies.some((e) => e.type === "boss"), btn: btn && getComputedStyle(btn).display !== "none", label: I.chapter + "-" + I.levelNum }; });
  const out = {};
  // 1) get to the boss, then lose to it
  await P.evaluate(() => { const I = game.state.idle; I.enemiesKilledInLevel = 0; I.bossPhase = true; I.enemies = []; I.spawnTimer = null; });
  await P.waitForTimeout(2500); out.atBoss = await S();
  await P.evaluate(() => { game.state.idle.playerHp = 0; }); await P.waitForTimeout(1500); out.defeat = await S();
  await P.evaluate(() => { const b = document.querySelector("#idleResult .ir-ok"); if (b) b.click(); else game.idleResolveResult(); }); await P.waitForTimeout(2000);
  out.afterConfirm = await S();
  // 2) farm: heroes very strong so hordes die fast; kills must never advance, boss never comes
  await P.evaluate(() => { window.__keep = setInterval(() => { const I = game.state.idle; I.playerHp = Math.max(I.playerHp, 1); }, 200); });
  let maxKills = 0, sawBoss = false, spawned = 0; const seenIds = new Set();
  for (let i = 0; i < 25; i++) { await P.waitForTimeout(1000); const r = await P.evaluate(() => { const I = game.state.idle; I.enemies.forEach((e) => { if (e.type !== "boss") e.hp = Math.min(e.hp, 1); }); return { k: I.enemiesKilledInLevel, b: !!I.bossPhase || I.enemies.some((e) => e.type === "boss"), ids: I.enemies.map((e) => e.id), retry: !!I.bossRetry }; });
    maxKills = Math.max(maxKills, r.k); sawBoss = sawBoss || r.b; r.ids.forEach((x) => seenIds.add(x)); }
  out.farm = { maxKills, sawBoss, distinctEnemies: seenIds.size, state: await S() };
  // 3) die to the horde while farming -> still in retry mode
  await P.evaluate(() => { clearInterval(window.__keep); game.state.idle.playerHp = 0; }); await P.waitForTimeout(1500);
  out.hordeDefeat = await S();
  for (let i = 0; i < 10 && (await S()).pending; i++) { if (process.env.DBG) console.log(await P.evaluate(() => JSON.stringify({ at: game.state.idle.pending.at, hp: game.state.idle.playerHp, btn: !!document.querySelector("#idleResult .ir-ok"), ov: document.getElementById("idleResult").style.display }))); await P.evaluate(() => { const b = document.querySelector("#idleResult .ir-ok"); if (b) b.click(); else game.idleResolveResult(); }); await P.waitForTimeout(1000); }
  out.hordeDeath = await S();
  if (process.env.DBG) console.log(JSON.stringify(out));
  // 4) press the skull
  await P.click("#idleBossRetryBtn"); await P.waitForTimeout(3000); out.pressed = await S();
  await P.screenshot({ path: path.join(__dirname, "out_g281.png") });
  console.log(JSON.stringify(out, null, 1), JSON.stringify(errs));
  await b.close();
  assert.deepStrictEqual(errs, []);
  assert(out.atBoss.boss && !out.atBoss.retry, "boss fight first time");
  assert(out.defeat.pending === "defeat" && !out.defeat.btn && !out.hordeDefeat.btn, "defeat screen, no skull yet");
  assert(out.afterConfirm.retry && !out.afterConfirm.boss && out.afterConfirm.btn, "retry mode + skull after the defeat");
  assert(out.farm.maxKills === 0 && !out.farm.sawBoss && out.farm.distinctEnemies >= 5 && out.farm.state.retry, "endless horde, kills don't count");
  assert(out.hordeDeath.retry && out.hordeDeath.btn, "dying to the horde keeps retry mode");
  assert(out.pressed.boss && out.pressed.bossUp && !out.pressed.retry && !out.pressed.btn && out.pressed.label === "2-4", "skull starts the boss on the same level");
  console.log("g281 ok");
})().catch((e) => { console.error(e); process.exit(1); });
