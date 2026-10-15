/* v1195 (Harley, audit item 9): Projection Wall Lv50 Mirror reflects 50% of the projectile damage it blocks at the enemy fortress (Arena).
   Run: node dev/simfork/g315_mirror_wall.js */
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
  await P.fill("#ksE", "g315@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Mirror"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const v = await P.evaluate(() => {
    const ALL = ["hanzo", "gareth", "lyra", "kessa", "sera"], hs = {}; ALL.forEach((k) => { hs[k] = { owned: true, level: 40, stars: 10, skillLevels: { conquest: [3, 3, 3], expedition: [3, 3, 3] } }; });
    const side = (r) => arenaSideStats(r, hs, 20, 0, false, null, fortressMaxMap(3), undefined, ZERO_BONUS);
    const run = (wallLv, seed) => { const foe = botWeaponsToSim({ projection_wall: wallLv });
      const sim = arenaMakeSim(side(["hanzo", "gareth"]), side(["lyra", "kessa", "sera"]), { rng: worldPvpSeededRng(seed), critSeed: seed, weapons: [], aiWeapons: foe.specs });
      const hp0 = sim.playerHp; for (let i = 0; i < 120; i++) { const r = sim.step(); if (r.done) break; } return hp0 - sim.playerHp; };
    let a = 0, b = 0; for (let i = 0; i < 4; i++) { a += run(30, "g315" + i); b += run(50, "g315" + i); }
    return { lv30: a, lv50: b, extra: b - a };
  });
  console.log(JSON.stringify({ v, errs }));
  await b.close();
  if (!process.env.NOASSERT) {
    assert.deepStrictEqual(errs, []); assert(v.lv30 > 0, "fight ran");
    assert(v.extra > 0, "Mirror Wall (Lv50) reflects blocked damage at the attacker's fortress");
    console.log("g315 ok");
  }
})().catch((e) => { console.error(e); process.exit(1); });
