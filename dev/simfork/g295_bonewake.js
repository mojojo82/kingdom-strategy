/* v1168/v1170: Bonewake fortress skin - layered (sails/flags/chain animated behind the heroes, hull in front), 130 pt, hovering 12 pt (v1171). Conquest + Arena screenshots. Run: node dev/simfork/g295_bonewake.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const OUT = process.env.OUT || "/tmp/";
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
async function run() {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "g295@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Bone"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => { game.state.fortressSkin = "serpent"; ["kessa", "roran"].forEach((k) => { if (game.state.heroes[k]) game.state.heroes[k].owned = true; }); game.state.conquestRoster = ["gareth", "kessa", "roran"].filter((k) => HERO_DEFS[k]); setScreen("conquest"); }); await P.waitForTimeout(7000);
  const box = async (id) => P.evaluate((id) => { const r = document.getElementById(id).getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; }, id);
  const info = await P.evaluate(async () => { const sk = fortressSkin(), im = sk.cq; const t0 = Math.floor(performance.now() / 1000 * sk.anim.fps) % sk.anim.n; await new Promise((r) => setTimeout(r, 400)); const t1 = Math.floor(performance.now() / 1000 * sk.anim.fps) % sk.anim.n; return { id: sk.id, loaded: im.complete && im.naturalWidth, layered: skinAnimReady(sk), sheet: sk.anim.sheet.naturalWidth, frameMoves: t0 !== t1, hPt: Math.round(im.naturalHeight * fortressCqScale()), wPt: Math.round(im.naturalWidth * fortressCqScale()), lift: fortLift(sk), roster: game.state.conquestRoster }; });
  await P.screenshot({ path: path.join(__dirname, "out_g295_cq.png"), clip: await box("idleCanvas") });
  await P.evaluate(() => setScreen("more", "arena")); await P.waitForTimeout(1500);
  await P.evaluate(() => { document.getElementById("arenaQuickMatchBtn").click(); }); await P.waitForTimeout(800);
  await P.evaluate(() => { arenaAnim.aiFortressSkin = FORTRESS_SKINS.find((s) => s.id === "serpent"); document.getElementById("arenaAttackBtn").click(); }); await P.waitForTimeout(4000);
  await P.evaluate(() => { arenaAnim.aiFortressSkin = FORTRESS_SKINS.find((s) => s.id === "serpent"); }); await P.waitForTimeout(500);
  await P.screenshot({ path: path.join(__dirname, "out_g295_arena.png"), clip: await box("arenaCanvas") });
  await b.close(); return { info, errs };
}
(async () => { const r = await run(); console.log(JSON.stringify(r));
  if (!process.env.NOASSERT) { assert.deepStrictEqual(r.errs, []); assert(r.info.id === "serpent" && r.info.loaded && Math.abs(r.info.hPt - 130) <= 2 && r.info.layered && r.info.sheet > 0 && r.info.frameMoves && r.info.lift === 12, "Bonewake: layered, animated, 130 pt, hovering"); console.log("g295 ok"); }
})().catch((e) => { console.error(e); process.exit(1); });
