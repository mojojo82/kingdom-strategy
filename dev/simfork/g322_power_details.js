/* v1202 (Harley): tapping your power (top bar or Governor Profile) opens Power Details; the parts add up to the total.
   Run: node dev/simfork/g322_power_details.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "g322@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Details"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const v = await P.evaluate(() => {
    const s = game.state; s.weaponFrags = Object.assign({}, s.weaponFrags, { railgun: 1 }); s.training = Object.assign({}, s.training || {}, { atk: 5, hp: 5, def: 5 });
    s.equipment.slots[0] = { id: 777, icon: 0, r: 5, atk: 8, hp: 8, def: 4.8, sec: [] };
    const o = {}; const bd = game.powerBreakdown(); o.sum = Math.round(Object.keys(bd).filter((k) => k !== "fortType").reduce((a, k) => a + bd[k], 0)); o.total = game.governorPower();
    const badge = document.getElementById("powerBadge"); o.badgeVisible = !!(badge && badge.offsetParent);
    return o;
  });
  let r1 = null;
  if (v.badgeVisible) { await P.click("#powerBadge"); await P.waitForTimeout(300); r1 = await P.evaluate(() => { const ov = document.getElementById("powerDetailsOverlay"); return ov && getComputedStyle(ov).display === "flex" ? ov.querySelectorAll(".pd-row").length : 0; }); await P.screenshot({ path: process.env.SHOT || "/tmp/pd.png" }); await P.click("#pdClose"); }
  await P.evaluate(() => { openGovProfile(); }); await P.waitForTimeout(400);
  await P.click("#govProfileOverlay .gp-stat.power"); await P.waitForTimeout(300);
  const r2 = await P.evaluate(() => { const ov = document.getElementById("powerDetailsOverlay"); return { open: ov && getComputedStyle(ov).display === "flex", text: ov ? ov.querySelector(".pd-total").textContent.trim() : "" }; });
  console.log(JSON.stringify({ v, r1, r2, errs }));
  await b.close();
  if (!process.env.NOASSERT) {
    assert.deepStrictEqual(errs, []); assert.strictEqual(v.sum, v.total, "the parts add up to the power total");
    if (v.badgeVisible) assert.strictEqual(r1, 8, "top-bar power opens the popup with 8 lines");
    assert(r2.open, "Governor Profile power opens it too");
    console.log("g322 ok");
  }
})().catch((e) => { console.error(e); process.exit(1); });
