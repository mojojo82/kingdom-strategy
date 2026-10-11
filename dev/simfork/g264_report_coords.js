/* v1088: tapping X/Y in a battle report (goToWorldTile) takes you there, even when you left the World map looking somewhere else (the v923 "back to where you left it"
   restore used to win and put you back there). Run: node dev/simfork/g264_report_coords.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  async function page(query) {
    const ctx = await b.newContext({ viewport: { width: 430, height: 932 } });
    await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
    await ctx.exposeFunction("__fbcall", call);
    await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
    await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
    await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
    await P.goto("https://mojojo82.github.io/kingdom-strategy/test/" + (query || "")); await P.waitForSelector("#ksAuth .box");
    return P;
  }
  async function signUp(P, email, name) {
    await P.fill("#ksE", email); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
    await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", name); await P.click("#ksGo"); await P.waitForTimeout(6000);
  }
  const A = await page(""); await signUp(A, "rc@test.dev", "Rc");
  const centre = () => A.evaluate(() => { const vp = document.getElementById("mapviewport"), w = document.getElementById("mapworld"), g = isoGeom(), cx = vp.scrollLeft - (parseFloat(w.style.marginLeft) || 0) + vp.clientWidth / 2, cy = vp.scrollTop - (parseFloat(w.style.marginTop) || 0) + vp.clientHeight / 2, a = (cx - g.offX) / g.r2, c = (cy - g.offY) / (g.r2 * ISO_K); return [Math.round((a + c) / 2), Math.round((c - a) / 2)]; });
  const out = {};
  for (const [label, look] of [["was home", null], ["was far", [900, 900]]]) {
    await A.evaluate((look) => { setScreen("world"); setMapZoom(1); if (look) { const vp = document.getElementById("mapviewport"), c = tileCenterPx({ x: look[0], y: look[1] }); vp.scrollLeft = c.x - vp.clientWidth / 2; vp.scrollTop = c.y - vp.clientHeight / 2; } else centerMapOnHome(); renderVisibleTiles(); }, look);
    await A.waitForTimeout(500);
    await A.evaluate(() => setScreen("more", "reports")); await A.waitForTimeout(400); /* reading a report */
    await A.evaluate(() => goToWorldTile("398,227")); await A.waitForTimeout(2500); /* tap the enemy's X/Y */
    out[label] = await centre();
  }
  console.log(JSON.stringify(out));
  for (const k of Object.keys(out)) assert.ok(Math.abs(out[k][0] - 398) <= 2 && Math.abs(out[k][1] - 227) <= 2, k + ": landed at " + out[k]);
  assert.deepStrictEqual(errs, []); console.log("g264 OK"); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
