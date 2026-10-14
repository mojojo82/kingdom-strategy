/* v1165: weapon barrels on the fortress sides (Harley's turret sheet, barrel only). Conquest: Laser + Missile Barrage + Railgun equipped -> 3 barrels,
   old Laser turret off, screenshots out_g293_cq*.png. Arena: bot with Pulse Beam + Scatter + Flak -> barrels on both sides, out_g293_arena*.png.
   Run: node dev/simfork/g293_barrels.js */
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
  await P.fill("#ksE", "g293@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Barrels"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => { game.state.equippedWeapons = ["laser_beam", "missile_barrage", "railgun"]; setScreen("conquest"); }); await P.waitForTimeout(9000);
  const cvBox = async () => P.evaluate(() => { const r = document.getElementById("idleCanvas").getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
  const cq = { shots: [] };
  for (let i = 0; i < 4; i++) { await P.waitForTimeout(1500); const f = path.join(__dirname, "out_g293_cq" + i + ".png"); await P.screenshot({ path: f, clip: await cvBox() }); }
  cq.state = await P.evaluate(() => Object.keys(barrelState).map((k) => k + ":" + Math.round(barrelState[k].tipX) + "," + Math.round(barrelState[k].tipY) + " ang " + barrelState[k].ang.toFixed(2)));
  cq.turretOff = await P.evaluate(() => !beamTurret.on);
  cq.wobble = await P.evaluate(async () => { /* the barrel's pivot relative to the hull must not move while the hull hovers (v1166) */
    const k = Object.keys(barrelState).find((q) => q.indexOf("railgun") > 0), xs = []; for (let i = 0; i < 60; i++) { await new Promise((r) => requestAnimationFrame(r)); const F = fortLife, st = barrelState[k];
      /* undo the hull transform on the tip; with no kick and a steady aim it should stay put */ const rc = Math.cos(-F.rot), rs = Math.sin(-F.rot), x = st.tipX - F.cx - F.dx, y = st.tipY - F.cy - F.dy; xs.push([F.cx + x * rc - y * rs, F.cy + x * rs + y * rc, st.ang, F.dy]); }
    const r = (a) => Math.max(...a) - Math.min(...a); return { lifeOn: fortLife.active, hullDyRange: +r(xs.map((q) => q[3])).toFixed(2), tipRelYRange: +r(xs.map((q) => q[1])).toFixed(2), angRange: +r(xs.map((q) => q[2])).toFixed(3) }; });
  await P.evaluate(() => setScreen("more", "arena")); await P.waitForTimeout(1500);
  await P.evaluate(() => { document.getElementById("arenaQuickMatchBtn").click(); }); await P.waitForTimeout(1000);
  await P.evaluate(() => { arenaOpponent.weapons = { pulse_beam: 20, scatter_rounds: 20, flak_burst: 20 }; document.getElementById("arenaAttackBtn").click(); });
  await P.waitForTimeout(4000);
  const ab = await P.evaluate(() => { const c = document.getElementById("arenaCanvas") || [...document.querySelectorAll("canvas")].sort((a, b) => b.width * b.height - a.width * a.height)[0]; const r = c.getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
  for (let i = 0; i < 3; i++) { await P.waitForTimeout(1200); await P.screenshot({ path: path.join(__dirname, "out_g293_arena" + i + ".png"), clip: ab }); }
  const ar = await P.evaluate(() => Object.keys(barrelState).filter((k) => k[0] === "a").map((k) => k + ":" + Math.round(barrelState[k].tipX) + "," + Math.round(barrelState[k].tipY)));
  await b.close(); return { cq, ar, errs };
}
(async () => {
  const r = await run(); console.log(JSON.stringify(r, null, 1));
  if (!process.env.NOASSERT) { assert.deepStrictEqual(r.errs, []); assert(r.cq.turretOff, "old laser turret off"); assert(r.cq.state.length === 3, "3 barrels in Conquest"); assert(r.cq.wobble.tipRelYRange < 0.8, "barrels move with the hull, no bob of their own (v1166)");
    assert(r.ar.some((k) => k.startsWith("apb") === false && k.indexOf("abpulse_beam") === 0) && r.ar.some((k) => k.indexOf("aplaser_beam") === 0), "barrels on both Arena sides"); console.log("g293 ok"); }
})().catch((e) => { console.error(e); process.exit(1); });
