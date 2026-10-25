/* v1414: Iron Lily frame player - sheets load from art/heroes/ironlily, the move graph plays (joins happen, never mid-air), the dev preview draws her. Run: node dev/simfork/g352_lily_player.js */
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
  await P.fill("#ksE", "g352@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Emp"); await P.click("#ksGo"); await P.waitForTimeout(4000);
  const pre = await P.evaluate(() => ({ loadedBefore: !!LILY.man, base: LILY_BASE }));
  await P.evaluate(() => lilyPreviewOpen());
  await P.waitForFunction(() => lilyReady(), null, { timeout: 20000 });
  await P.waitForTimeout(6000);
  await P.screenshot({ path: process.env.SHOT || "/tmp/lily_prev.png" });
  const r = await P.evaluate(() => {
    const m = LILY.man, p = lilyPlayer(11), seen = new Set(), airJoins = [], segs = new Set(), segT = m.segs.map(() => 0), lastAt = {}; let maxRun = 0, intro = 0, loops = 0;
    for (let t = 0; t < 24 * 120; t++) { const before = p.joins, from = p.i; lilyNext(p); if (p.joins > before) { if (m.nojSet[p.lastJoin[0]] || m.nojSet[p.lastJoin[1]]) airJoins.push([p.lastJoin[0], p.lastJoin[1], m.segOf[p.lastJoin[0]], from === m.segs[m.segOf[from]][2]]); } seen.add(p.i); segs.add(m.segOf[p.i]); segT[m.segOf[p.i]]++; if (lastAt[p.i] != null && t - lastAt[p.i] < 72) loops++; lastAt[p.i] = t; }
    const p2 = lilyPlayer(11), p3 = lilyPlayer(11), same = []; for (let t = 0; t < 2000; t++) { lilyNext(p2); lilyNext(p3); if (p2.i !== p3.i) { same.push(t); break; } }
    const outside = m.f.filter((f) => f[2] + f[4] > LILY.imgs[f[0]].naturalHeight || f[1] + f[3] > LILY.imgs[f[0]].naturalWidth).length;
    let swoosh = 0, entries = 0; /* v1427: going from fighting into the run never blends a sword swoosh over her first running steps */
    for (let tr = 0; tr < 120; tr++) { const q = lilyPlayer(100 + tr); q.mode = "fight"; for (let t = 0; t < 24 + (tr * 7) % 90; t++) lilyNext(q); q.mode = "run";
      for (let t = 0; t < 60 && !lilyInRun(q.i); t++) { const from = q.i; lilyNext(q); if (lilyInRun(q.i)) { entries++; if (m.sw[from]) swoosh++; } } }
    return { swoosh, entries, outside, loops, share: segT.map((x) => Math.round(100 * x / (24 * 120))), sheets: m.sheets.length, frames: m.f.length, joins: p.joins, airJoins: airJoins.length, airList: airJoins.slice(0, 5), distinctFrames: seen.size, segs: [...segs].length, deterministic: same.length === 0, info: document.getElementById("lpInfo").textContent };
  });
  console.log(JSON.stringify({ pre, r }));
  const A = assert;
  A.strictEqual(pre.loadedBefore, false, "her art isn't loaded until asked"); A.strictEqual(pre.base, "../art/heroes/ironlily/");
  A.ok(r.joins > 40, "2 minutes of flurry joins moves many times"); A.strictEqual(r.airJoins, 0, "never joins mid-air or into a standing start");
  A.ok(r.segs >= 3 && r.distinctFrames > 200, "several fighting clips get used in free play (run / idle only on purpose since v1430)"); A.ok(r.deterministic, "same seed, same flurry"); A.strictEqual(r.swoosh, 0, "no swoosh blended into the run start"); A.ok(r.entries > 100, "she gets into the run"); A.strictEqual(r.outside, 0, "every frame is inside its sheet (v1417: 10 frames were cropped off and drew as nothing)"); A.strictEqual(r.loops, 0, "never replays a frame within 3 s (v1416: she got stuck replaying a 2 s cartwheel)"); A.ok([0, 1, 7].every((k) => r.share[k] >= 1) && [4, 5, 6, 9].every((k) => r.share[k] === 0), "fighting clips play; run / idle never at random (v1430)");
  A.ok(/clip .* joins/.test(r.info), "preview is running");
  console.log("errs", errs); A.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
