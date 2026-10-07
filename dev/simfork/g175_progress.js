/* v918: with kills waiting for the killing shot to be seen, levels must still progress normally (hordes, boss, clear, Victory) and match the old pace.
   Gareth + Lyra + cannon + missiles + laser + drone + railgun, watched; then 15 s with the page hidden. Run: node dev/simfork/g175_progress.js (GAMEFILE=..., SECS=) */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store), SECS = +process.env.SECS || 90;
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
  await P.fill("#ksE", "g175@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Pace"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const r = await P.evaluate(async (SECS) => {
    setScreen("conquest"); const st = game.state.idle;
    game.state.conquestRoster = ["gareth", "lyra"]; game.state.equippedWeapons = ["missile_barrage", "laser_beam", "droid_call", "railgun"]; st.fortressCannonEnabled = true;
    st.chapter = 1; st.levelNum = 1; st.enemies = []; st.bossPhase = false; st.enemiesKilledInLevel = 0; st.spawnTimer = null;
    const clears = [], t0 = Date.now(); let last = st.lastLevelClearLabel, maxStuck = 0, lastChange = Date.now(), lastDef = st.defeated, overQuota = 0;
    const iv = setInterval(() => {
      if (st.playerHp != null && st.playerHp < 60) st.playerHp = 1e6; /* keep the fortress up: this measures pace, not survival */
      if (st.pending && st.pending.type === "victory") { try { document.querySelector("#idleResultConfirm, .ir-confirm, [data-act=confirm]") ? null : null; } catch (e) {} }
      if (st.lastLevelClearLabel !== last) { last = st.lastLevelClearLabel; clears.push([last, Math.round((Date.now() - t0) / 100) / 10]); }
      if (st.defeated !== lastDef) { lastDef = st.defeated; lastChange = Date.now(); }
      maxStuck = Math.max(maxStuck, (Date.now() - lastChange) / 1000);
      if (!st.bossPhase && st.enemiesKilledInLevel + st.enemies.length + (game.idleDyingCount ? game.idleDyingCount() : 0) > game.idleEnemiesPerLevel() + 0) overQuota++;
    }, 50);
    await new Promise((res) => setTimeout(res, SECS * 1000));
    const watched = { clears: clears.slice(), defeated: st.defeated };
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    const d0 = st.defeated, c0 = clears.length; await new Promise((res) => setTimeout(res, 15000));
    clearInterval(iv);
    return { watched, hiddenKills: st.defeated - d0, hiddenClears: clears.length - c0, maxStuck: Math.round(maxStuck * 10) / 10, overQuota, dying: game.idleDyingCount ? game.idleDyingCount() : 0 };
  }, SECS);
  console.log("levels cleared while watching:", r.watched.clears.length, JSON.stringify(r.watched.clears));
  console.log("longest gap between kills:", r.maxStuck, "s | over-spawn frames:", r.overQuota, "| page hidden 15s -> kills", r.hiddenKills, "clears", r.hiddenClears, "| kills still waiting at end:", r.dying);
  console.log("errs", errs.slice(0, 3));
  if (!process.env.NOASSERT) { assert.ok(r.watched.clears.length >= 2, "levels clear"); assert.ok(r.hiddenKills >= 2, "hidden page still fights"); assert.strictEqual(r.overQuota, 0, "no extra enemies"); assert.deepStrictEqual(errs, []); console.log("ALL OK"); }
  await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
