/* v1136: shots still in the air when the Defeat lands must not drop the boss bar. Run: node dev/simfork/g282_defeatshots.js */
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
  await P.fill("#ksE", "g282@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Retry"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => { setScreen("conquest"); const I = game.state.idle; I.chapter = 2; I.levelNum = 4; I.enemiesKilledInLevel = 0; I.bossPhase = true; I.enemies = []; I.spawnTimer = null; I.skillAuto = false; });
  await P.waitForTimeout(6000);
  const r = await P.evaluate(async () => {
    const I = game.state.idle, boss = I.enemies.find((e) => e.type === "boss"); if (!boss) return { noBoss: true };
    boss.hp = boss.maxHp = 1e9; const d0 = idleAnim.displayedHp[boss.id]; if (d0) { d0.hp = d0.maxHp = 1e9; }
    // fire a volley of slow shots, then lose while they're in the air
    const before = idleAnim.projectiles.length;
    for (let i = 0; i < 6; i++) idleAnim.pendingBasicShots.push({ aid: "gareth", id: boss.id, dmg: 1000 });
    for (let k = 0; k < 20 && idleAnim.projectiles.filter((p) => !p.resolved && p.targetId === boss.id).length < 2; k++) await new Promise((res) => setTimeout(res, 50));
    const inAir = idleAnim.projectiles.filter((p) => !p.resolved && p.targetId === boss.id).length;
    boss.hp -= 6000; /* the engine already counted them when fired */
    I.playerHp = 0; await new Promise((res) => setTimeout(res, 300));
    const pend = I.pending && I.pending.type, barAtDefeat = idleAnim.displayedHp[boss.id] && idleAnim.displayedHp[boss.id].hp;
    await new Promise((res) => setTimeout(res, 3000));
    const barLater = idleAnim.displayedHp[boss.id] && idleAnim.displayedHp[boss.id].hp, landed = idleAnim.projectiles.filter((p) => p.resolved && p.targetId === boss.id).length;
    return { inAir, pend, barAtDefeat, barLater, landed };
  });
  console.log(JSON.stringify(r), JSON.stringify(errs));
  await b.close();
  if (!process.env.NOASSERT) { assert.deepStrictEqual(errs, []); assert(r.inAir > 0 && r.pend === "defeat", "shots were in the air at the defeat"); assert.strictEqual(r.barLater, r.barAtDefeat, "boss bar frozen after the defeat"); console.log("g282 ok"); }
})().catch((e) => { console.error(e); process.exit(1); });
