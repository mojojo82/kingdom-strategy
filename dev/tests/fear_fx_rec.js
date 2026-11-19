/* v1735: Baelgor's Fear visuals in a real game (headless Chromium, fake Firebase - not a phone). Waits for the first Fear, then records the battle
   canvas every ~60 ms for 7.5 s and logs the effect's state (target, portal spot, hand scale) + the Conquest scroll speed.
   node dev/tests/fear_fx_rec.js OUT_DIR conquest|arena */
const fs = require("fs"), path = require("path"), ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const OUT = process.argv[2], MODE = process.argv[3] || "conquest"; fs.mkdirSync(path.join(OUT, "frames"), { recursive: true });
const G = fs.readFileSync(path.join(ROOT, "test/index.html"), "utf8");
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome", args: ["--no-sandbox"] }), errs = [];
  const VID = process.env.VID === "1"; /* VID=1: also a real-time video (Playwright screen recording) -> OUT/video.webm + OUT/times.json */
  const ctx = await b.newContext(Object.assign({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 }, VID ? { recordVideo: { dir: OUT, size: { width: 860, height: 1864 } } } : {}));
  const tV0 = Date.now();
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, require(path.join(ROOT, "dev/tests/siteroute.js"))(G));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message)); P.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); });
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/", { timeout: 180000 }); await P.waitForSelector("#ksAuth .box", { timeout: 120000 });
  await P.fill("#ksE", "fear" + process.pid + "@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 120000 }); await P.fill("#ksN", "Rec"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  const mine = ["gareth", "lyra", "kessa", "sera", "baelgor"], LV = +(process.env.LV || (MODE === "arena" ? 60 : 4));
  await P.evaluate(([mine, LV]) => { mine.forEach((k) => { const h = game.state.heroes[k]; h.owned = true; h.level = LV; h.stars = 15; h.skillLevels = { conquest: [3, 3, 3], expedition: [1, 1, 1] }; });
    game.state.conquestRoster = mine.slice(); game.state.equippedWeapons = []; document.querySelectorAll(".ks-update, #ksUpdate").forEach((e) => e.remove()); }, [mine, LV]);
  let store_ = "idleAnim", canvasId = "idleCanvas";
  if (MODE === "arena") {
    store_ = "arenaAnim"; canvasId = "arenaCanvas";
    await P.evaluate((o) => { window.__opp = o; setScreen("more", "arena"); }, process.env.OPP || ""); await P.waitForTimeout(1500);
    await P.evaluate(() => { arenaView = "battle"; renderArena(); renderArenaSkillbar(); const ro = (window.__opp || "gareth,lyra,kessa,sera,hanzo").split(","), hs = {};
      ro.forEach((k) => { hs[k] = { owned: true, level: 60, stars: 15, skillLevels: { conquest: [3, 3, 3], expedition: [1, 1, 1] } }; });
      arenaOpponent.roster = ro; arenaOpponent.heroes = hs; arenaOpponent.weapons = {}; arenaOpponent.esper = null; renderArena(); });
    await P.waitForTimeout(1500); await P.evaluate(() => { const bt = document.getElementById("arenaAttackBtn"); if (bt) bt.click(); });
  } else { await P.evaluate(() => setScreen("conquest")); }
  const t0 = Date.now(); let found = false;
  while (Date.now() - t0 < +(process.env.WAIT || 90000)) { found = await P.evaluate((s) => !!(window[s] && window[s].fearFx && window[s].fearFx.length), store_).catch(() => false); if (found) break; await P.waitForTimeout(40); }
  if (!found) { console.log("no Fear seen", errs.slice(0, 5)); await b.close(); return; }
  const box = await P.evaluate((id) => { const c = document.getElementById(id); const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }, canvasId);
  const log = []; let n = 0; const tS = Date.now(); fs.writeFileSync(path.join(OUT, "times.json"), JSON.stringify({ fearAt: (tS - tV0) / 1000, box }));
  while (Date.now() - tS < 7500) { if (VID) { await P.waitForTimeout(200); continue; }
    await P.screenshot({ path: path.join(OUT, "frames", String(n++).padStart(4, "0") + ".jpg"), clip: box, type: "jpeg", quality: 85 });
    log.push(await P.evaluate((s) => { const A = window[s], F = A.fearFx && A.fearFx[0]; return { ms: F ? Math.round(performance.now() - F.t0) : null, tgt: F && F.tgt, x: F && Math.round(F.x), feet: F && Math.round(F.feet), cy: F && Math.round(F.cy), f: F && F.f && +F.f.toFixed(3), emb: F ? F.emb.length : 0, scrollK: s === "idleAnim" ? +(A.scrollK || 0).toFixed(2) : null }; }, store_));
  }
  fs.writeFileSync(path.join(OUT, "log.json"), JSON.stringify(log)); console.log("frames", n, "errors", errs.length ? errs.slice(0, 6) : "none"); console.log(JSON.stringify(log.filter((r, i) => i % 10 === 0)));
  const vp = VID ? await P.video().path() : null; await ctx.close(); await b.close(); if (vp) { fs.renameSync(vp, path.join(OUT, "video.webm")); console.log("video", path.join(OUT, "video.webm")); }
})();
