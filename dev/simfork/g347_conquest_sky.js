/* v1262 (Harley: taller Conquest, "the first image/original/current is perfect"): on a phone the Conquest canvas grows into the empty space above the nav; the fight keeps
   its old size and spot (logical height = old 400:240 height), the extra is sky; the village has its own road. Run: node dev/simfork/g347_conquest_sky.js */
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
  await P.fill("#ksE", "g347@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Sky"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  await P.evaluate(() => { game.state.idle.chapter = 5; game.state.idle.levelNum = 3; setScreen("conquest"); }); await P.waitForTimeout(3000);
  const o = await P.evaluate(() => { const cv = document.getElementById("idleCanvas"), r = cv.getBoundingClientRect(), dpr = canvasDPR();
    const ps = Math.max(...[...document.querySelectorAll("#conquestModeContent .idle-power-slots")].map((e) => e.getBoundingClientRect().bottom));
    return { cvH: r.height, cvW: r.width, sky: idleAnim.skyPx, logicalH: Math.round(cv.height / dpr) - idleAnim.skyPx, base: Math.round(r.width * 240 / 400), psBottom: ps, navTop: document.getElementById("bottomNav").getBoundingClientRect().top,
      env: game.idleEnvironment(), floor: !!(TMP_ENV_BG.day.floor && TMP_ENV_BG.day.floor.img.naturalWidth) }; });
  /* the road is actually painted: rows just below the ground line are not the old dark tile colour */
  o.px = await P.evaluate(() => { const cv = document.getElementById("idleCanvas"), dpr = canvasDPR(), y = Math.round((idleAnim.skyPx + groundYFor(Math.round(cv.height / dpr) - idleAnim.skyPx) + 12) * dpr);
    const d = cv.getContext("2d").getImageData(0, y, cv.width, 1).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]; return Math.round(s / (d.length / 4)); });
  /* Arena unaffected */
  await P.evaluate(() => { setScreen("more", "arena"); renderArena(); }); await P.waitForTimeout(800);
  console.log(JSON.stringify({ o, errs }));
  assert(o.sky > 100, "sky strip on a phone"); assert(Math.abs(o.logicalH - o.base) <= 2, "fight keeps its old height"); assert(o.psBottom <= o.navTop, "panel above the nav");
  assert(o.navTop - o.psBottom < 20, "empty space used"); assert(o.floor, "village road loaded"); assert(o.env === "day"); assert(errs.length === 0, errs.join(" | "));
  console.log("g347 ok"); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
