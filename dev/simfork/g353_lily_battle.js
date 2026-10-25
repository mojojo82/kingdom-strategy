/* v1419: Iron Lily in a Conquest fight - she loads, runs/holds like Gareth, picks moves by what the fight needs (close / fight / idle), faces her target. Run: node dev/simfork/g353_lily_battle.js  (FRAMES=dir to dump canvas frames) */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 } });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await ctx.route(/mojojo82\.github\.io\/kingdom-strategy\/art\//, (r) => { const u = new URL(r.request().url()); const f = path.join(ROOT, decodeURIComponent(u.pathname.replace(/^\/kingdom-strategy\//, ""))); if (fs.existsSync(f)) r.fulfill({ status: 200, body: fs.readFileSync(f), contentType: f.endsWith(".json") ? "application/json" : "image/webp" }); else r.fulfill({ status: 404, body: "" }); });
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "g353@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Emp"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => { const s = game.state; ["ironlily", "gareth", "lyra"].forEach((k) => { const h = s.heroes[k]; h.owned = true; h.level = 30; h.stars = 5; });
    s.conquestRoster = ["ironlily", "gareth", "lyra"]; s.idle.chapter = 1; s.idle.levelNum = 3; setScreen("conquest"); });
  const log = [], shots = []; const DIR = process.env.FRAMES; if (DIR) fs.mkdirSync(DIR, { recursive: true });
  for (let k = 0; k < (DIR ? 300 : 120); k++) {
    const o = await P.evaluate((dump) => { const L = idleAnim.lilyP && idleAnim.lilyP.ironlily, v = idleAnim.heroVis.ironlily;
      return { ready: lilyReady(), mode: L ? L.p.mode : null, i: L ? L.p.i : null, x: v ? Math.round(v.x) : null, chasing: v ? !!v.chasing : null, en: Object.keys(idleAnim.enemyById).length,
        png: dump ? document.getElementById("idleCanvas").toDataURL("image/jpeg", 0.85) : null }; }, !!DIR);
    if (DIR) fs.writeFileSync(path.join(DIR, String(k).padStart(4, "0") + ".jpg"), Buffer.from(o.png.split(",")[1], "base64")); delete o.png;
    log.push(o); await P.waitForTimeout(DIR ? 40 : 100);
  }
  await P.screenshot({ path: process.env.SHOT || "/tmp/g353.png" });
  const modes = {}; log.forEach((o) => { if (o.mode) modes[o.mode] = (modes[o.mode] || 0) + 1; });
  const xs = log.filter((o) => o.x != null).map((o) => o.x), frames = new Set(log.map((o) => o.i));
  console.log(JSON.stringify({ modes, xMin: Math.min(...xs), xMax: Math.max(...xs), frames: frames.size, last: log[log.length - 1] }));
  const A = assert;
  A.ok(log.some((o) => o.ready), "her frames load in a fight"); A.ok(frames.size > 30, "she animates");
  A.ok(modes.close > 0 && modes.fight > 0, "she both closes in and fights on the spot"); A.ok(Math.max(...xs) - Math.min(...xs) > 20, "she moves on the field");
  console.log("errs", errs); A.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
