/* v1429: Iron Lily training stage - she never plays the run on top of an enemy (was 22% of frames), and turns only when an enemy is clearly on her other side (was 125 turns in 32 s). Run: node dev/simfork/g356_lily_close_quarters.js */
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "../.."), GAMEF = process.env.GAMEFILE || path.join(ROOT, "test/index.html");
const { chromium } = require("/opt/npm-tools/node_modules/playwright");
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(GAMEF, "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 } });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await ctx.route(/mojojo82\.github\.io\/kingdom-strategy\/art\//, (r) => { const u = new URL(r.request().url()); const f = path.join(ROOT, decodeURIComponent(u.pathname.replace(/^\/kingdom-strategy\//, ""))); if (fs.existsSync(f)) r.fulfill({ status: 200, body: fs.readFileSync(f), contentType: f.endsWith(".json") ? "application/json" : "image/webp" }); else r.fulfill({ status: 404, body: "" }); });
  const P = await ctx.newPage();
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "fc@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Emp"); await P.click("#ksGo"); await P.waitForTimeout(4000);
  await P.evaluate(() => lilyTrainOpen()); await P.waitForFunction(() => lilyReady(), null, { timeout: 20000 });
  await P.evaluate(() => { const S = window.__lilyTrain; S.log = []; (function lg() { const st = S; const p = st.lily && window.__lilyTrainStore; requestAnimationFrame(lg); })(); S.flips = 0; S.lastF = null; S.maxJump = 0; S.lastX = null; const step0 = requestAnimationFrame; (function mon() { const P2 = S.player; if (P2 && LILY.man) { const live = S.en.filter((e) => !e.dying); let nd = 1e9; live.forEach((e) => { nd = Math.min(nd, Math.abs(e.x - S.lily.x)); }); const hpx = LILY_STAND_CSS * heroSpriteVisualScale / 100; S.log.push([lilyInRun(P2.i) ? (P2.i <= LILY.man.run.in[1] ? "in" : P2.i <= LILY.man.run.loop[1] ? "loop" : "out") : "-", S.mode, +(nd / hpx).toFixed(2), S.lily.face ? "L" : "R", P2.i]); } if (S.lastF != null && S.lastF !== S.lily.face) S.flips++; S.lastF = S.lily.face; if (S.lastX != null) S.maxJump = Math.max(S.maxJump, Math.abs(S.lily.x - S.lastX)); S.lastX = S.lily.x; requestAnimationFrame(mon); })(); });
  for (let k = 0; k < 6; k++) { await P.click(k % 2 ? "#ltR" : "#ltL"); await P.waitForTimeout(4000); }
  await P.click("#ltB"); await P.waitForTimeout(8000);
  const o = await P.evaluate(() => { const S = window.__lilyTrain; const near = S.log.filter((r) => r[0] !== "-" && r[2] < 1.5); const runModeNear = S.log.filter((r) => r[1] === "run" && r[2] < 1.5); return { flips: S.flips, hits: S.lily.hits, frames: S.log.length, runFramesNearEnemy: near.length, runModeNearEnemy: runModeNear.length, sample: near.slice(0, 12), parts: near.reduce((o, r) => (o[r[0]] = (o[r[0]] || 0) + 1, o), {}) }; });
  console.log(JSON.stringify(o)); await b.close();
  if (o.runFramesNearEnemy > 20 || o.flips > 40 || o.hits < 30) { console.error("FAIL", JSON.stringify(o)); process.exit(1); } console.log("ALL OK");
})();
