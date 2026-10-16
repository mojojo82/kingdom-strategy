/* v1203 (Harley, Kingshot video): building power = Kingshot's per-level curve x multiplier (Town Center x5, Academy x1.1, troop x1, resource x0.1).
   Run: node dev/simfork/g323_building_power.js */
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
  await P.fill("#ksE", "g323@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Builds"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const v = await P.evaluate(() => { const P = BUILDING_REAL_POWER, at = (k, lv) => P[k][lv - 1];
    return { th30: at("townhall", 30), th1: at("townhall", 1), farm7: at("farm", 7), farm30: at("farm", 30), range17: at("archery", 17), barracks30: at("barracks", 30), acad15: at("academy", 15), acad30: at("academy", 30), wall4: at("wall", 4), wall20: at("wall", 20), keys: Object.keys(BUILDING_DEFS).filter((k) => !P[k]) }; });
  console.log(JSON.stringify({ v, errs }));
  await b.close();
  if (!process.env.NOASSERT) {
    assert.deepStrictEqual(errs, []); assert.deepStrictEqual(v.keys, [], "every building has a power curve");
    assert.strictEqual(v.th30, 1523500); assert.strictEqual(v.th1, 2000); assert.strictEqual(v.farm7, 706); assert.strictEqual(v.farm30, 30470);
    assert.strictEqual(v.range17, 55320); assert.strictEqual(v.barracks30, 304700); assert.strictEqual(v.acad15, 43076); assert.strictEqual(v.acad30, 335170);
    assert.strictEqual(v.wall20, 304700, "Wall max = Guard Station max");
    console.log("g323 ok");
  }
})().catch((e) => { console.error(e); process.exit(1); });
