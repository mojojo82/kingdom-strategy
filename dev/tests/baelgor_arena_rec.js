/* v1726: Baelgor in a real Arena fight (headless, fake Firebase), both on the ENEMY side (movement check: run frames while moving, attack frames only
   at his target, the Fear sheet on one spot) and on the player side. Records the canvas every 60 ms to OUT/frames + logs his screen position and
   drawn animation per frame.  node dev/tests/baelgor_arena_rec.js OUT_DIR [side=ai|player]   (not a phone - headless Chromium) */
const fs = require("fs"), path = require("path"), ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const OUT = process.argv[2], SIDE = process.argv[3] || "ai"; fs.mkdirSync(path.join(OUT, "frames"), { recursive: true });
let G = fs.readFileSync(path.join(ROOT, "test/index.html"), "utf8");
/* log what drawHeroAnim draws for baelgor (state + frame) */
G = G.replace("function drawHeroAnim(ctx, key, x, feetY, state, scale, flip, phase, spd, tint) {", "function drawHeroAnim(ctx, key, x, feetY, state, scale, flip, phase, spd, tint) { if (key && key.indexOf('baelgor') === 0 && window.__bl) window.__bl.push([key, state, Math.round(x), Math.round(feetY), !!flip]);");
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
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message)); P.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); });
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/", { timeout: 180000 }); await P.waitForSelector("#ksAuth .box", { timeout: 120000 });
  await P.fill("#ksE", "bar" + process.pid + "@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 120000 }); await P.fill("#ksN", "Rec"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  await P.evaluate((side) => {
    const mine = side === "player" ? ["gareth", "lyra", "kessa", "sera", "baelgor"] : ["gareth", "lyra", "kessa", "sera", "aurek"];
    mine.forEach((k) => { const h = game.state.heroes[k]; h.owned = true; h.level = 80; h.stars = 25; h.skillLevels = { conquest: [5, 5, 5], expedition: [1, 1, 1] }; });
    game.state.conquestRoster = mine.slice(); game.state.equippedWeapons = []; document.querySelectorAll(".ks-update, #ksUpdate").forEach((e) => e.remove()); setScreen("more", "arena"); }, SIDE);
  await P.waitForTimeout(1500);
  await P.evaluate((side) => { arenaView = "battle"; renderArena(); renderArenaSkillbar();
    const ro = side === "player" ? ["gareth", "lyra", "kessa", "sera", "hanzo"] : ["gareth", "lyra", "kessa", "sera", "baelgor"], hs = {};
    ro.forEach((k) => { hs[k] = { owned: true, level: 80, stars: 25, skillLevels: { conquest: [5, 5, 5], expedition: [1, 1, 1] } }; });
    arenaOpponent.roster = ro; arenaOpponent.heroes = hs; arenaOpponent.weapons = {}; arenaOpponent.esper = null; renderArena(); }, SIDE);
  await P.waitForTimeout(1500); await P.evaluate(() => { window.__bl = []; const bt = document.getElementById("arenaAttackBtn"); if (bt) bt.click(); });
  const box = await P.evaluate(() => { const c = document.getElementById("arenaCanvas"); const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
  const log = []; let n = 0;
  for (let t = 0; t < 230; t++) {
    await P.screenshot({ path: path.join(OUT, "frames", String(n++).padStart(4, "0") + ".png"), clip: box });
    const st = await P.evaluate(() => { const l = window.__bl.slice(-3); window.__bl = []; return { l, run: typeof arenaBattleRunning !== "undefined" && arenaBattleRunning }; });
    log.push(st.l); if (!st.run && t > 20) break;
  }
  fs.writeFileSync(path.join(OUT, "log.json"), JSON.stringify(log)); console.log("frames", n, "errors", errs.length ? errs.slice(0, 6) : "none");
  await b.close();
})();
