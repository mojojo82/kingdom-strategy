/* v934: a hero skill that fired while you were on another screen must NOT play when you come back to Conquest (Gareth's charge used to
   fire on return). A skill that fires while you watch must still play. Run: node dev/simfork/g187_skillaway.js */
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
  await P.fill("#ksE", "g187@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Away"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => { setScreen("conquest"); });
  await P.waitForTimeout(6000); /* let a horde arrive */
  const watch = () => P.evaluate(() => new Promise((res) => { /* sample 1.5 s of frames: did Gareth's skill visual start? */
    let flash = 0, t0 = performance.now(); (function f() { if (idleAnim.skillFlash && idleAnim.skillFlash.gareth > 0.5) flash++; if (performance.now() - t0 < 1500) requestAnimationFrame(f); else res(flash); })();
  }));
  /* 1: skill fires while on the World map */
  await P.evaluate(() => { game.state.heroCooldowns.gareth = 30; setScreen("world"); });
  await P.waitForTimeout(800);
  const fired0 = await P.evaluate(() => game.state.idle.skillFireCounts.gareth || 0);
  await P.evaluate(() => { game.state.heroCooldowns.gareth = 0.5; if (!game.state.idle.enemies.length) {} });
  await P.waitForTimeout(4000);
  const awayInfo = await P.evaluate((f0) => ({ firedAway: (game.state.idle.skillFireCounts.gareth || 0) - f0, cd: game.state.heroCooldowns.gareth }), fired0);
  await P.evaluate(() => { game.state.heroCooldowns.gareth = 30; setScreen("conquest"); });
  const flashOnReturn = await watch();
  console.log("skill fired while away:", JSON.stringify(awayInfo), "| skill visual frames on return:", flashOnReturn);
  /* 2: skill fires while watching -> must still show */
  await P.evaluate(() => { game.state.heroCooldowns.gareth = 0.3; });
  const flashWatching = await watch();
  console.log("skill visual frames when it fires on screen:", flashWatching);
  assert.ok(awayInfo.firedAway >= 1, "setup: the skill really fired while away");
  assert.strictEqual(flashOnReturn, 0, "no replay of a skill fired while away");
  assert.ok(flashWatching > 0, "a skill fired on screen still plays");
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
