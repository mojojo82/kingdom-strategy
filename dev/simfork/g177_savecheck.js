/* v920: anti-cheat stage 2 must never flag normal play. Plays the real game (Conquest with Gareth + Lyra, building upgrades, troop training) for
   SECS seconds, captures every save the game writes, and runs the server's checkSave on each consecutive pair with the real time between them.
   Then a console-style cheat on the same account must be flagged. Run: node dev/simfork/g177_savecheck.js (SECS=120) */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(path.join(ROOT, "test/index.html"), "utf8");
const C = require(path.join(ROOT, "functions/core.js"));
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store), SECS = +process.env.SECS || 120, saves = [];
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 } });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") { store[k] = JSON.parse(v); if (/\/save\/main$/.test(k)) saves.push({ t: Date.now(), d: JSON.parse(v) }); } else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "g177@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Honest"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => { setScreen("conquest"); });
  const t0 = Date.now();
  while (Date.now() - t0 < SECS * 1000) {
    await P.mouse.click(215, 300); /* player taps -> saves within ~1.5 s, like real play */
    await P.evaluate(() => { try { const st = game.state; if (st.idle.playerHp != null && st.idle.playerHp < 50) st.idle.playerHp = 1e4; Object.keys(st.buildings).slice(0, 4).forEach((k) => { try { game.upgradeBuilding && game.upgradeBuilding(k); } catch (e) {} }); } catch (e) {} });
    await P.waitForTimeout(3000);
  }
  await P.evaluate(() => cloudSyncNow(true)); await P.waitForTimeout(1500);
  const legit = []; let pairs = 0;
  for (let i = 1; i < saves.length; i++) { pairs++; const r = C.checkSave(saves[i - 1].d, saves[i].d, (saves[i].t - saves[i - 1].t) / 1000, {}); if (r.reasons.length) legit.push(r.reasons); }
  const first = C.checkSave(null, saves[0].d, null, {});
  const last = saves[saves.length - 1].d, g = C.globalLevel(last.idle.chapter, last.idle.levelNum);
  console.log("saves written:", saves.length, "| pairs checked:", pairs, "| normal-play pairs flagged:", legit.length, legit.slice(0, 3), "| first save flagged:", first.reasons);
  console.log("progress in", SECS, "s: Conquest level", g, "| gold", Math.round(last.resources.gold), "| building levels", Object.keys(last.buildings).reduce((s, k) => s + (last.buildings[k].level || 0), 0));
  /* now cheat from the console and let it save */
  await P.evaluate(() => { game.state.resources.gold = 99999999; game.state.idle.chapter += 5; cloudSyncNow(true); }); await P.waitForTimeout(1500);
  const cheat = C.checkSave(saves[saves.length - 2].d, saves[saves.length - 1].d, (saves[saves.length - 1].t - saves[saves.length - 2].t) / 1000, {});
  console.log("console cheat flagged:", cheat.reasons);
  console.log("errs", errs.slice(0, 3));
  assert.ok(pairs >= 20, "enough saves"); assert.strictEqual(legit.length, 0, "normal play never flagged"); assert.deepStrictEqual(first.reasons, []);
  assert.ok(cheat.reasons.length >= 2, "cheat flagged"); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
