/* v1179/v1180 (Harley): Formations and Infirmary get their own City tabs. City tabs = Buildings / Troops / Formations / Infirmary / Research;
   each shows only its own part (Troops = training). Screenshots out_g301_*.png.  Run: node dev/simfork/g301_formations_tab.js */
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
  await P.fill("#ksE", "g301@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "FormTab"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const vis = (id) => P.evaluate((id) => { const e = document.getElementById(id); return !!e && e.offsetParent !== null && e.offsetHeight > 0; }, id);
  const o = {};
  await P.evaluate(() => setScreen("city", "troops")); await P.waitForTimeout(1200);
  o.tabs = await P.evaluate(() => [...document.querySelectorAll("#screenBar .techtab")].map((t) => t.textContent));
  o.troops = { form: await vis("formationsList"), train: await vis("troopsList"), inf: await vis("infirmaryPanel") };
  await P.screenshot({ path: path.join(__dirname, "out_g301_troops.png") });
  await P.evaluate(() => [...document.querySelectorAll("#screenBar .techtab")].find((t) => /Formations/.test(t.textContent)).click()); await P.waitForTimeout(1000);
  o.active = await P.evaluate(() => document.querySelector("#screenBar .techtab.active").textContent);
  o.forms = { form: await vis("formationsList"), train: await vis("troopsList"), inf: await vis("infirmaryPanel"), n: await P.evaluate(() => document.querySelectorAll("#formationsList > *").length) };
  await P.screenshot({ path: path.join(__dirname, "out_g301_formations.png") });
  await P.evaluate(() => [...document.querySelectorAll("#screenBar .techtab")].find((t) => /Infirmary/.test(t.textContent)).click()); await P.waitForTimeout(1000);
  o.infs = { form: await vis("formationsList"), train: await vis("troopsList"), inf: await vis("infirmaryPanel") };
  o.tabFit = await P.evaluate(() => [...document.querySelectorAll("#screenBar .techtab")].every((t) => t.scrollWidth <= t.clientWidth + 1 && t.offsetHeight < 50));
  await P.screenshot({ path: path.join(__dirname, "out_g301_infirmary.png") });
  await P.evaluate(() => setScreen("city", "buildings")); await P.waitForTimeout(600); o.bld = await vis("buildingsModeContent");
  console.log(JSON.stringify({ o, errs }));
  await b.close();
  if (!process.env.NOASSERT) {
    assert.deepStrictEqual(errs, []);
    assert.deepStrictEqual(o.tabs.map((t) => t.replace(/^[^A-Za-z]+/, "")), ["Buildings", "Troops", "Formations", "Infirmary", "Research"]);
    assert(!o.troops.form && o.troops.train && !o.troops.inf, "Troops tab: training only");
    assert(o.infs.inf && !o.infs.form && !o.infs.train, "Infirmary tab: infirmary only"); assert(o.tabFit, "5 tabs fit, text not cut");
    assert(/Formations/.test(o.active) && o.forms.form && o.forms.n > 0 && !o.forms.train && !o.forms.inf, "Formations tab: only formations");
    assert(o.bld, "Buildings still opens");
    console.log("g301 ok");
  }
})().catch((e) => { console.error(e); process.exit(1); });
