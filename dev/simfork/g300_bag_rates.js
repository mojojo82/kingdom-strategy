/* v1178 (Harley): the production rates leave the Buildings tab and sit next to each resource in the red bag (Resources popup), plus a Research Points row
   (owned + earn rate). Screenshot out_g300_bag.png.  Run: node dev/simfork/g300_bag_rates.js */
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
  await P.fill("#ksE", "g300@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "RedBag"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => { const st = game.state; st.buildings.farm.level = Math.max(3, st.buildings.farm.level); st.researchPoints = 1234; setScreen("city", "buildings"); });
  await P.waitForTimeout(1200);
  const o = {};
  o.prodShown = await P.evaluate(() => { const e = document.getElementById("buildingsProdStats"); return !!e && e.offsetHeight > 0 && e.textContent.length > 0; });
  await P.evaluate(() => document.getElementById("resBtn").click()); await P.waitForTimeout(1500);
  o.rows = await P.evaluate(() => [...document.querySelectorAll("#resOverlayList .res-row")].map((r) => r.innerText.replace(/\s+/g, " ")));
  o.expect = await P.evaluate(() => ({ food: Math.round(productionRate("food") * 10) / 10, rp: Math.round(researchRate() * 10) / 10 }));
  await P.screenshot({ path: path.join(__dirname, "out_g300_bag.png") });
  console.log(JSON.stringify({ o, errs }));
  await b.close();
  if (!process.env.NOASSERT) {
    assert.deepStrictEqual(errs, []);
    assert(!o.prodShown, "no production rows in the Buildings tab");
    assert(o.rows[0].startsWith("Food +" + o.expect.food.toLocaleString() + " /s"), "food rate next to food");
    const rp = o.rows.find((r) => /^Research Points/.test(r)); assert(rp && /\+[\d.,]+ \/s/.test(rp) && /1,234|1\.2K/.test(rp), "RP row: owned + rate");
    console.log("g300 ok");
  }
})().catch((e) => { console.error(e); process.exit(1); });
