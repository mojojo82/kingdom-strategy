/* v1201 (Harley): worn equipment adds 36,000 power per stat % (average Legendary ~1.18M, full set ~11.8M).
   Run: node dev/simfork/g321_equipment_power.js */
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
  await P.fill("#ksE", "g321@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Gear"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const v = await P.evaluate(() => {
    let t = Date.UTC(2026, 0, 5); const g = createGame({ now: () => t, mapSize: 5, seed: 1, combatSeed: 777 }), s = g.state;
    const o = { fresh: g.powerFromEquipment() }; const p0 = g.governorPower();
    const leg = { id: 999, icon: 0, r: 5, atk: 8, hp: 8, def: 4.8, sec: [{ k: "skill", v: 6 }, { k: "boss", v: 6 }] };
    s.equipment.inv.push(Object.assign({}, leg, { id: 998 })); o.bagOnly = g.powerFromEquipment();
    s.equipment.slots[0] = leg; o.oneLeg = g.powerFromEquipment(); o.govDelta = g.governorPower() - p0;
    for (let i = 1; i < 10; i++) s.equipment.slots[i] = Object.assign({}, leg, { id: 1000 + i }); o.fullSet = g.powerFromEquipment();
    return o;
  });
  console.log(JSON.stringify({ v, errs }));
  await b.close();
  if (!process.env.NOASSERT) {
    assert.deepStrictEqual(errs, []); assert.strictEqual(v.fresh, 0); assert.strictEqual(v.bagOnly, 0, "gear in the bag adds nothing");
    assert.strictEqual(v.oneLeg, Math.round(32.8 * 36000), "average Legendary = ~1.18M"); assert.strictEqual(v.govDelta, v.oneLeg, "counted in governor power");
    assert.strictEqual(v.fullSet, 10 * v.oneLeg, "full worn set ~11.8M");
    console.log("g321 ok");
  }
})().catch((e) => { console.error(e); process.exit(1); });
