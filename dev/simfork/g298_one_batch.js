/* v1176 (Harley bug): a training building could run 2+ batches of its troop at once (e.g. 2 lanes of infantry). Now one batch per building:
   a second Train is refused until the first finishes, and the Train button says it's busy. Run: node dev/simfork/g298_one_batch.js */
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
  await P.fill("#ksE", "g298@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "OneLane"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const r = await P.evaluate(() => { const st = game.state; st.resources.food = st.resources.wood = st.resources.stone = st.resources.gold = 1e9;
    const key = Object.keys(BUILDING_DEFS).find((k) => BUILDING_DEFS[k].trains === "infantry"); st.buildings[key].level = Math.max(1, st.buildings[key].level);
    const a = game.queueTraining(key, 10, 1), food0 = st.resources.food, b2 = game.queueTraining(key, 10, 1);
    return { key, a: a.ok, b: b2.ok, reason: b2.reason, lanes: st.buildings[key].queue.length, charged: food0 - st.resources.food }; });
  await P.evaluate(() => renderTroops()); await P.waitForTimeout(300);
  const btn = await P.evaluate(() => [...document.querySelectorAll("#troopsList button")].filter((x) => /^(Train|Training)/.test(x.textContent)).map((x) => x.textContent + ":" + x.disabled));
  console.log(JSON.stringify({ r, btn, errs }));
  await b.close();
  if (!process.env.NOASSERT) {
    assert.deepStrictEqual(errs, []);
    assert(r.a && !r.b && r.lanes === 1 && r.charged === 0, "second batch refused (and not charged), one lane only");
    assert(btn.some((t) => /Training/.test(t) && /true$/.test(t)), "Train button shows busy");
    console.log("g298 ok");
  }
})().catch((e) => { console.error(e); process.exit(1); });
