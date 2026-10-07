/* v921: Forge pacing. Checks the game's own forgeOdds / forgeCost against the tuned table, idle Energon = 40/h fixed (+ Energon Siphon research),
   the research list shows the new tech, and screenshots the Forge panel. Run: node dev/simfork/g180_forgepacing.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const OUT = process.env.OUT || "/tmp/";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(path.join(ROOT, "test/index.html"), "utf8");
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
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "g180@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Smith"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const r = await P.evaluate(() => {
    const out = { odds: {}, cost: {} }, F = game.state.forge, L0 = F.level;
    [1, 2, 3, 6, 10, 15, 20, 30].forEach((L) => { F.level = L; const fi = game.forgeInfo(); out.odds[L] = fi.odds.map((x) => Math.round(x * 100) / 100); out.cost[L] = fi.cost; });
    F.level = L0;
    let toL3 = 0; for (let L = 1; L < 3; L++) { F.level = L; toL3 += game.forgeInfo().cost * game.forgeInfo().need; } F.level = L0; out.toL3 = toL3;
    out.rate0 = game.bucketInfo().enHr;
    game.state.tech.energonSiphon = 10; out.rateMax = game.bucketInfo().enHr; out.capMax = game.bucketInfo().capEn; game.state.tech.energonSiphon = 0;
    /* 2 hours away at the base rate */
    const B = game.state.bucket; B.en = 0; B.at = Date.now() - 2 * 3600 * 1000; game.tick(); out.after2h = Math.floor(B.en);
    out.techListed = !!TECH_DEFS.energonSiphon && TECH_DEFS.energonSiphon.category === "growth";
    return out;
  });
  console.log("odds by Forge level:", JSON.stringify(r.odds)); console.log("pull cost:", JSON.stringify(r.cost), "| Energon to reach Forge 3:", r.toL3);
  console.log("idle Energon/h:", r.rate0, "-> with Energon Siphon maxed:", r.rateMax, "(8 h cap", r.capMax + ") | 2 h away ->", r.after2h);
  assert.deepStrictEqual(r.odds[3], [69, 26, 5, 0, 0, 0]); assert.deepStrictEqual(r.odds[15], [40, 30, 16, 9.6, 4, 0.4]); assert.deepStrictEqual(r.odds[30], [28, 31, 22, 12, 5.5, 1.5]);
  assert.strictEqual(r.toL3, 60 * 10 + 250 * 12); assert.strictEqual(r.rate0, 40); assert.strictEqual(r.rateMax, 240); assert.ok(r.after2h >= 79 && r.after2h <= 81, "2 h x 40/h"); assert.ok(r.techListed);
  /* the research list (Growth) shows the new tech */
  await P.evaluate(() => { try { activeTechCategory = "growth"; mapMode = "research"; setScreen("city"); } catch (e) {} try { renderTechs(); } catch (e) {} });
  await P.waitForTimeout(500);
  const techText = await P.evaluate(() => (document.getElementById("techList") || {}).textContent || "");
  console.log("research list mentions Energon Siphon:", /Energon Siphon/.test(techText));
  /* Forge panel */
  await P.evaluate(() => { try { openForge(); } catch (e) {} }); await P.waitForTimeout(600); await P.screenshot({ path: OUT + "forge_panel.png" });
  console.log("errs", errs); assert.deepStrictEqual(errs, []); assert.ok(/Energon Siphon/.test(techText), "tech shown"); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
