/* v1245 (Harley: "search extremely intermittent and flaky"): searching while the map is looking somewhere else must still move to the monster
   and open its card, every time. Run: node dev/simfork/g339_monster_search_far.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call0 = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store), DELAY = 1500;
 /* the FIRST move is slow to reach the server (cold start / bad signal), later ones are quick - so a second move can land first, like on a phone */
const call = call0;
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
  await P.fill("#ksE", "g339@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Seeker"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  await P.evaluate(() => { try { setScreen("world"); } catch (e) {} centerMapOnHome(); }); await P.waitForTimeout(1500);
  const out = [];
  /* search 6 times; before each, look far away from the monster (scroll the map away), like Harley did */
  for (let i = 0; i < 6; i++) {
    await P.evaluate((i) => { closeMonsterCard(); const vp = document.getElementById("mapviewport"); vp.scrollTo({ left: vp.scrollLeft + (i % 2 ? -1 : 1) * 1500, top: vp.scrollTop + (i % 3 ? 900 : -900) }); renderVisibleTiles(); }, i);
    await P.waitForTimeout(500);
    await P.evaluate(() => document.getElementById("mapSearchBtn").click()); await P.waitForTimeout(300);
    await P.evaluate((t) => { document.querySelector('#monSearchSheet [data-type="' + t + '"]').click(); document.getElementById("msGo").click(); }, ["knight", "rhino", "tank"][i % 3]); await P.waitForTimeout(1300);
    out.push(await P.evaluate(() => { const ov = document.getElementById("monCardOverlay"); return { open: !!(ov && ov.style.display === "block" && monCardId), id: monCardId }; }));
  }
  console.log(JSON.stringify({ out, errs }));
  await b.close();
  assert.deepStrictEqual(errs, []);
  assert(out.every((o) => o.open), "every search opens the card: " + JSON.stringify(out));
  console.log("g339 ok");
})().catch((e) => { console.error(e); process.exit(1); });
