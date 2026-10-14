/* v1167: the Railgun countdown is visible - timer chip at the top of the battle (Conquest top-left; Arena under each side's bars), the barrel's 3 lights
   charge up, sparks get drawn into the muzzle (more near the end) and a flash when it fires. Screenshots out_g294_*.png. Run: node dev/simfork/g294_railcharge.js */
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
  await P.fill("#ksE", "g294@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Rail"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => { game.state.equippedWeapons = ["railgun", "missile_barrage"]; setScreen("conquest"); }); await P.waitForTimeout(6000);
  const cvBox = async (id) => P.evaluate((id) => { const r = document.getElementById(id).getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; }, id);
  const out = { cq: [] };
  for (const left of [8, 4, 1.6, 0.9]) { /* hold the countdown at a point and look */
    await P.evaluate((left) => { const T = game.state.idle.fxT && game.state.idle.fxT.railgun; if (T) { T.t = left; T.tot = 10; } }, left); await P.waitForTimeout(350);
    out.cq.push(await P.evaluate(() => { const i = railChargeInfo("cq", true), st = barrelState.cprailgun; return { left: i && +i.left.toFixed(2), parts: st && st.parts ? st.parts.length : 0 }; }));
    { const bx = await cvBox("idleCanvas"); await P.screenshot({ path: path.join(__dirname, "out_g294_cq_" + left + ".png"), clip: { x: bx.x, y: bx.y, width: bx.width * 0.55, height: bx.height * 0.8 } }); }
  }
  out.cqNoRail = await P.evaluate(() => { game.state.equippedWeapons = ["missile_barrage"]; return railChargeInfo("cq", true); });
  await P.evaluate(() => setScreen("more", "arena")); await P.waitForTimeout(1500);
  await P.evaluate(() => { game.state.equippedWeapons = ["railgun"]; document.getElementById("arenaQuickMatchBtn").click(); }); await P.waitForTimeout(800);
  await P.evaluate(() => { arenaOpponent.weapons = { railgun: 20 }; document.getElementById("arenaAttackBtn").click(); });
  out.arena = [];
  for (let i = 0; i < 12; i++) { await P.waitForTimeout(1000); out.arena.push(await P.evaluate(() => { const a = railChargeInfo("arena", true), b = railChargeInfo("arena", false); return [a && +a.left.toFixed(1), b && +b.left.toFixed(1)]; }));
    if (i === 7) { await P.screenshot({ path: path.join(__dirname, "out_g294_arena.png"), clip: await cvBox("arenaCanvas") }); } }
  await b.close(); return { out, errs };
}
(async () => {
  const r = await run(); console.log(JSON.stringify(r));
  if (!process.env.NOASSERT) { const o = r.out; assert.deepStrictEqual(r.errs, []); assert(o.cq[0].left > 7 && o.cq[3].left < 1, "Conquest timer follows the countdown"); assert(o.cq[3].parts > o.cq[0].parts, "more particles near the end");
    assert(o.cqNoRail === null, "no timer without a Railgun"); assert(o.arena[0][0] != null && o.arena[0][1] != null && o.arena[5][0] < o.arena[0][0], "Arena timers on both sides, counting down"); console.log("g294 ok"); }
})().catch((e) => { console.error(e); process.exit(1); });
