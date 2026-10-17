/* v1246 (Harley: "can't drag the slider, it moves 1 number then stops"): the monster level slider must drag smoothly. Run: node dev/simfork/g340_monster_level_slider.js */
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
  await P.fill("#ksE", "g340@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Slider"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  await P.evaluate(() => { game.state.monsters.maxBeat = 20; try { setScreen("world"); } catch (e) {} openMonsterSearch(); }); await P.waitForTimeout(500);
  const box = await (await P.$("#msLv")).boundingBox();
  const same0 = await P.evaluate(() => { window.__lv = document.getElementById("msLv"); return monSearch.level; });
  /* a real finger-style drag across the slider */
  await P.mouse.move(box.x + 6, box.y + box.height / 2); await P.mouse.down();
  for (let i = 1; i <= 20; i++) await P.mouse.move(box.x + 6 + (box.width - 12) * i / 20 * 0.6, box.y + box.height / 2);
  await P.mouse.up(); await P.waitForTimeout(200);
  const r = await P.evaluate(() => ({ level: monSearch.level, sameEl: window.__lv === document.getElementById("msLv"), txt: document.querySelector(".ms-lvt").textContent }));
  console.log(JSON.stringify({ same0, r, errs }));
  await b.close();
  assert.deepStrictEqual(errs, []);
  assert(r.level >= 15, "dragging moves many levels, not 1: " + r.level); assert(r.sameEl, "slider not rebuilt mid-drag"); assert(/Level /.test(r.txt) && r.txt.indexOf("Level " + r.level) === 0, "label follows");
  console.log("g340 ok");
})().catch((e) => { console.error(e); process.exit(1); });
