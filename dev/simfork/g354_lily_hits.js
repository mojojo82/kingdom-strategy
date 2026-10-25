/* v1420 (v1424: contact sweeps): Iron Lily hits land on her hit frames (blade tip / foot at full reach) on the enemy at it; her hit-frame rate while fighting (LILY_IMPACT_RATE). Run: node dev/simfork/g354_lily_hits.js */
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
  await P.fill("#ksE", "g354@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Emp"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => lilyLoad()); await P.waitForFunction(() => lilyReady(), null, { timeout: 20000 });
  const rate = await P.evaluate(() => { const out = {}; ["fight", "close"].forEach((md) => { let hits = 0, fr = 0; [3, 4, 5, 6, 7].forEach((sd) => { const p = lilyPlayer(sd); p.mode = md; p.gap = md === "close" ? 300 : 0; let last = null; for (let t = 0; t < 24 * 120; t++) { lilyNext(p); fr++; if (p.swQ) { p.swQ.forEach((w) => { if (w.id !== last) { hits++; last = w.id; } }); p.swQ.length = 0; } } }); out[md] = +(hits / (fr / 24)).toFixed(2); }); out.coded = LILY_IMPACT_RATE; return out; }); /* v1424: sweeps per second */
  await P.evaluate(() => { const s = game.state; ["ironlily", "gareth"].forEach((k) => { const h = s.heroes[k]; h.owned = true; h.level = 30; h.stars = 5; });
    s.conquestRoster = ["ironlily"]; s.idle.chapter = 1; s.idle.levelNum = 3; s.idle.lilyHits = 0; setScreen("conquest"); });
  await P.waitForTimeout(25000);
  const cq = await P.evaluate(() => ({ hits: game.state.idle.lilyHits || 0, owedLily: game.idleMeleeOwedCount("ironlily"), level: game.state.idle.levelNum, defeated: game.state.idle.killsThisLevel != null ? game.state.idle.killsThisLevel : null, hitDmg: Math.round(game.idleAttackerHitDamage("ironlily")), sec: heroAttackSec("ironlily") }));
  console.log(JSON.stringify({ rate, cq }));
  const A = assert;
  A.ok(Math.abs(rate.fight - LILY_RATE_EXPECT(rate)) < 0.25, "coded hit rate matches her fighting moves");
  A.ok(cq.hits >= 3, "her strikes land damage in a real fight (v1424: few - she can only reach what walks to her; ranged enemies stand off)"); A.strictEqual(cq.owedLily, 0, "her timer hits don't pile up while she is drawn");
  console.log("errs", errs); A.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
  function LILY_RATE_EXPECT(r) { return r.coded; }
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
