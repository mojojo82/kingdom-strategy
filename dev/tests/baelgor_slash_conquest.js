/* v1730: slash check (counts slash-sheet frames drawn + every melee landing with its slot and damage) - based on:
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
    game.state.conquestRoster = ["baelgor"]; game.state.heroes.baelgor.level = 5; document.querySelectorAll(".ks-update, #ksUpdate").forEach((e) => e.remove()); setScreen("conquest"); });
  await P.evaluate(() => { window.__land = []; window.__sw = []; let lastT0 = -1; setInterval(() => { const s = idleAnim.swingRun && idleAnim.swingRun.baelgor; if (s && s.t0 !== lastT0) { lastT0 = s.t0; window.__sw.push([Math.round(s.t0), s.atk2 ? "SLASH" : "chop", Math.round(s.until - s.t0)]); } const q = ((idleAnim.meleeQ || {}).baelgor || []).map((x) => (x.owed ? "o" : "i") + (x.slot || "?")).join(","); if (q !== window.__lq) { window.__lq = q; window.__sw.push([Math.round(performance.now()), "Q", q]); } }, 30); const o = game.idleMeleeLand; game.idleMeleeLand = function (aid, bl, sk) { const r = o.apply(this, arguments); if (aid === "baelgor") window.__land.push([Math.round(performance.now()), sk, JSON.stringify(r)]); return r; }; });
  for (let i = 0; i < 60; i++) { await P.waitForTimeout(400); const sw = await P.evaluate(() => { const s = idleAnim.swingRun && idleAnim.swingRun.baelgor; return s && s.atk2 && performance.now() < s.until ? Math.round(performance.now() - s.t0) : -1; }); if (sw >= 0) await P.screenshot({ path: path.join(OUT, "slash_" + String(i).padStart(2, "0") + "_" + sw + ".png") }); }
  console.log("lands", JSON.stringify(await P.evaluate(() => window.__land))); console.log("swings", JSON.stringify(await P.evaluate(() => window.__sw)));
  const drawn = await P.evaluate(() => window.__bl);
  await P.evaluate(() => setScreen("heroes")); await P.waitForTimeout(2000); await P.screenshot({ path: path.join(OUT, "heroes_list.png"), fullPage: false });
  await P.evaluate(() => openHeroDetail("baelgor")); await P.waitForTimeout(2500); await P.screenshot({ path: path.join(OUT, "hero_page.png") });
  console.log("drawn", JSON.stringify(drawn)); console.log("errors", errs.length ? errs.slice(0, 6) : "none"); await b.close();
})();
