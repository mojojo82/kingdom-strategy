/* v1733: hero list + Baelgor / Tom hero pages (card art + card video) - based on:
   v1726: Baelgor in Conquest + the Heroes list + his hero page (headless, fake Firebase, 430x932 @2x). node dev/tests/baelgor_conquest_shots.js OUT_DIR */
const fs = require("fs"), path = require("path"), ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
let G = fs.readFileSync(path.join(ROOT, "test/index.html"), "utf8");
G = G.replace("function drawHeroAnim(ctx, key, x, feetY, state, scale, flip, phase, spd, tint) {", "function drawHeroAnim(ctx, key, x, feetY, state, scale, flip, phase, spd, tint) { if (key && key.indexOf('baelgor') === 0 && window.__bl) window.__bl[key + ':' + state] = (window.__bl[key + ':' + state] || 0) + 1;");
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome", args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, require(path.join(ROOT, "dev/tests/siteroute.js"))(G));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/", { timeout: 180000 }); await P.waitForSelector("#ksAuth .box", { timeout: 120000 });
  await P.fill("#ksE", "bcq" + process.pid + "@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 120000 }); await P.fill("#ksN", "Rec"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  await P.evaluate(() => { try { setUiSkin("blue"); } catch (e) {} }); /* Harley 22 Nov 2026: always screenshot with the Blue UI (Classic is being retired) */
  await P.evaluate(() => { window.__bl = {}; ["gareth", "lyra", "kessa", "sera", "baelgor"].forEach((k) => { const h = game.state.heroes[k]; h.owned = true; h.level = 40; h.stars = 10; h.skillLevels = { conquest: [3, 3, 3], expedition: [1, 1, 1] }; });
    game.state.conquestRoster = ["gareth", "lyra", "kessa", "sera", "baelgor"]; document.querySelectorAll(".ks-update, #ksUpdate").forEach((e) => e.remove()); setScreen("conquest"); });
  await P.evaluate(() => { game.state.heroes.tom.owned = true; game.state.heroes.tom.level = 40; });
  const drawn = await P.evaluate(() => window.__bl);
  await P.evaluate(() => setScreen("heroes")); await P.waitForTimeout(2000); await P.screenshot({ path: path.join(OUT, "heroes_list.png"), fullPage: false });
  for (const k of ["baelgor", "tom"]) { await P.evaluate((k) => openHeroDetail(k), k); await P.waitForTimeout(3000); await P.screenshot({ path: path.join(OUT, "hero_page_" + k + ".png") }); console.log(k, JSON.stringify(await P.evaluate(() => { const v = [...document.querySelectorAll("video")].find((x) => x.getBoundingClientRect().width > 0); return v ? { src: v.currentSrc.split("/").pop(), t: Math.round(v.currentTime * 10) / 10, paused: v.paused, w: v.videoWidth } : null; }))); await P.waitForTimeout(9000); console.log(k, "after 9s", JSON.stringify(await P.evaluate(() => { const v = [...document.querySelectorAll("video")].find((x) => x.getBoundingClientRect().width > 0); return v ? { t: Math.round(v.currentTime * 10) / 10, paused: v.paused } : null; }))); await P.screenshot({ path: path.join(OUT, "hero_page_" + k + "_9s.png") }); await P.evaluate(() => { try { closeHeroDetail(); } catch (e) {} }); }
  console.log("drawn", JSON.stringify(drawn)); console.log("errors", errs.length ? errs.slice(0, 6) : "none"); await b.close();
})();
