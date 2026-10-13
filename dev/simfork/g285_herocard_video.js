/* v1139: small hero cards are still images; the full card plays the AI video (Gareth) or the Blender sheet (Kessa). Run: node dev/simfork/g285_herocard_video.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
/* headless Chromium has no H.264 (phones do): for the test only, the game's mp4 is swapped for a VP9 webm of the same video */
const WEBM = "data:video/webm;base64," + fs.readFileSync(process.env.WEBM || path.join(__dirname, "media/gareth_card_test.webm")).toString("base64");
const GAME2 = GAME.replace(/data:video\/mp4;base64,[A-Za-z0-9+\/=]+/g, () => WEBM);
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME2 }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "g285@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Card"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => { game.state.heroes.kessa.owned = true; setScreen("heroes"); }); await P.waitForTimeout(2500);
  const grid = await P.evaluate(() => ({ canv: document.querySelectorAll("canvas.hcard-art").length, kessaImg: !!document.querySelector('.hcard img.hcard-art[alt="Kessa"]'), imgs: document.querySelectorAll("img.hcard-art").length }));
  await P.screenshot({ path: path.join(__dirname, "out_g285_grid.png") });
  await P.evaluate(() => openHeroDetail("gareth")); await P.waitForTimeout(2500);
  const vid = async () => P.evaluate(() => { const v = document.getElementById("hdPortraitVid"), box = document.getElementById("hdPortrait"); return { shown: !!v && getComputedStyle(v).display !== "none", t: v ? v.currentTime : -1, paused: v ? v.paused : null, w: v ? v.videoWidth : 0, bg: getComputedStyle(box).backgroundImage.slice(0, 40), anim: getComputedStyle(document.getElementById("hdPortraitAnim")).display, img: getComputedStyle(document.getElementById("hdPortraitImg")).display }; });
  const g1 = await vid(); await P.waitForTimeout(1500); const g2 = await vid();
  await P.screenshot({ path: path.join(__dirname, "out_g285_gareth.png") });
  await P.evaluate(() => openHeroDetail("kessa")); await P.waitForTimeout(1500); const k = await vid();
  await P.evaluate(() => closeHeroDetail()); await P.waitForTimeout(300); const closed = await P.evaluate(() => document.getElementById("hdPortraitVid").paused);
  console.log(JSON.stringify({ grid, g1, g2, k, closed, errs })); await b.close();
  if (!process.env.NOASSERT) {
    assert.deepStrictEqual(errs, []); assert(grid.canv === 0 && grid.kessaImg, "small cards are still images");
    assert(g1.shown && g1.w === 768 && g2.t > g1.t && /9b59d6|155, 89, 214/.test(g2.bg) && g1.anim === "none" && g1.img === "none", "Gareth's full card plays the video on purple");
    assert(k.shown && /171, 179, 186/.test(k.bg), "v1144: Kessa plays her own video on grey"); assert(closed, "video paused when closed"); console.log("g285 ok");
  }
})().catch((e) => { console.error(e); process.exit(1); });
