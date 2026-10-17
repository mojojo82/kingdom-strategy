/* v1259 (Harley: "2 back buttons"): Arena fight screen has one Back (top bar) -> leaderboard; from the leaderboard Back -> More. Run: node dev/simfork/g346_arena_back.js */
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
  await P.fill("#ksE", "g346@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Back"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  await P.evaluate(() => { setScreen("more", "arena"); renderArena(); }); await P.waitForTimeout(800);
  await P.click("#arenaQuickMatchBtn"); await P.waitForTimeout(1000);
  const o = { fight: await P.evaluate(() => ({ view: arenaView, backs: [...document.querySelectorAll("button")].filter((b) => b.offsetParent && /Back|Leaderboard/.test(b.textContent) && !/arenaNewLadderBtn/.test(b.id)).map((b) => b.textContent.trim()) })) };
  await P.click("#screenBar .sb-back"); await P.waitForTimeout(600);
  o.afterBack1 = await P.evaluate(() => ({ screen: appScreen + "/" + appSub, view: arenaView, lb: !!document.getElementById("arenaQuickMatchBtn") }));
  await P.click("#screenBar .sb-back"); await P.waitForTimeout(600);
  o.afterBack2 = await P.evaluate(() => appScreen + "/" + appSub);
  if (process.env.SHOTS) { await P.evaluate(() => { setScreen("more", "arena"); }); await P.click("#arenaQuickMatchBtn"); await P.waitForTimeout(1000); await P.screenshot({ path: process.env.SHOTS + "/g346_arena.png" }); }
  console.log(JSON.stringify({ o, errs }));
  await b.close();
  assert.deepStrictEqual(errs, []);
  assert.strictEqual(o.fight.view, "battle"); assert.deepStrictEqual(o.fight.backs, ["◀ Back"], "one back button on the fight screen");
  assert(o.afterBack1.screen === "more/arena" && o.afterBack1.view === "leaderboard" && o.afterBack1.lb, "Back -> leaderboard");
  assert.strictEqual(o.afterBack2, "more/menu", "Back again -> More");
  console.log("g346 ok");
})().catch((e) => { console.error(e); process.exit(1); });
