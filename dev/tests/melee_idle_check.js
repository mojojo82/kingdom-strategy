/* v1734: melee idle check (no enemies on screen: does he get pushed / jog at the nose, or run off). env RERUN=0 for the old behaviour. Based on:
   v1730: slash check (counts slash-sheet frames drawn + every melee landing with its slot and damage) - based on:
   v1726: Baelgor in Conquest + the Heroes list + his hero page (headless, fake Firebase, 430x932 @2x). node dev/tests/baelgor_conquest_shots.js OUT_DIR */
const fs = require("fs"), path = require("path"), ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
let G = fs.readFileSync(path.join(ROOT, "test/index.html"), "utf8");
G = G.replace("function drawHeroSkillFrame(ctx, key, x, feetY, f, hs, flip) {", "function drawHeroSkillFrame(ctx, key, x, feetY, f, hs, flip) { if (key && key.indexOf('baelgor_atk2') === 0 && window.__bl) window.__bl[key] = (window.__bl[key] || 0) + 1;");
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
  await P.evaluate(() => { window.__bl = {}; ["gareth", "lyra", "kessa", "sera", "baelgor"].forEach((k) => { const h = game.state.heroes[k]; h.owned = true; h.level = 40; h.stars = 10; h.skillLevels = { conquest: [3, 3, 3], expedition: [1, 1, 1] }; });
    game.state.conquestRoster = ["baelgor", "lyra", "kessa"]; ["baelgor", "lyra", "kessa"].forEach((k) => { game.state.heroes[k].level = 60; }); document.querySelectorAll(".ks-update, #ksUpdate").forEach((e) => e.remove()); setScreen("conquest"); });
  await P.evaluate((rr) => { MELEE_IDLE_RERUN = rr; window.__mv = []; setInterval(() => { const v = idleAnim.heroVis && idleAnim.heroVis.baelgor; if (!v) return; const W = document.getElementById('idleCanvas').clientWidth; let on = false; for (const id in idleAnim.enemyById) if (idleAnim.enemyById[id].x <= W) on = true; window.__mv.push([Math.round(performance.now()), on ? 1 : 0, Math.round(v.x), Math.round(getFortressNoseX(W)), v.bossRunX == null ? -1 : Math.round(v.bossRunX), v.lingering ? 1 : 0]); }, 100); }, process.env.RERUN !== "0");
  await P.waitForTimeout(+(process.env.SEC || 60) * 1000);
  fs.writeFileSync(path.join(OUT, "mv.json"), JSON.stringify(await P.evaluate(() => window.__mv)));
  const drawn = await P.evaluate(() => window.__bl);
  await P.evaluate(() => setScreen("heroes")); await P.waitForTimeout(2000); await P.screenshot({ path: path.join(OUT, "heroes_list.png"), fullPage: false });
  await P.evaluate(() => openHeroDetail("baelgor")); await P.waitForTimeout(2500); await P.screenshot({ path: path.join(OUT, "hero_page.png") });
  console.log("drawn", JSON.stringify(drawn)); console.log("errors", errs.length ? errs.slice(0, 6) : "none"); await b.close();
})();
