/* v1191 (Harley, audit item 15): in Arena a Duplicate copy of IO Repair keeps its own heal, so both heals stack (like Conquest).
   Run: node dev/simfork/g311_io_dup_stack.js */
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
  await P.fill("#ksE", "g311@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Repair"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const v = await P.evaluate(() => {
    const FIVE = ["gareth", "lyra", "roran", "kessa", "sera"], hs = {}; FIVE.forEach((k) => { hs[k] = { owned: true, level: 40, stars: 10, skillLevels: { conquest: [3, 3, 3], expedition: [3, 3, 3] } }; });
    const side = (ft) => arenaSideStats(FIVE, hs, 20, 0, false, null, fortressMaxMap(ft), undefined, ZERO_BONUS);
    const foe = botWeaponsToSim({ missile_barrage: 40, laser_beam: 40, railgun: 40 });
    const run = (map, seed) => { const me = botWeaponsToSim(map); const sim = arenaMakeSim(side(3), side(3), { rng: worldPvpSeededRng(seed), critSeed: seed, weapons: me.specs, aiWeapons: foe.specs, shieldPct: me.shieldPct, aiShieldPct: foe.shieldPct, salvoP: me.salvo, salvoA: foe.salvo }); sim.runToEnd(); const S = sim.fxState.P; return { heal: S.heal, io: S.casts.io || 0 }; };
    const out = { one: { heal: 0, io: 0 }, dup: { heal: 0, io: 0 } };
    for (let i = 0; i < 6; i++) { const a = run({ io_repair: 40, orbit_shield: 40 }, "g311a" + i), b = run({ io_repair: 40, duplicate: 40, orbit_shield: 40 }, "g311a" + i); out.one.heal += a.heal; out.one.io += a.io; out.dup.heal += b.heal; out.dup.io += b.io; }
    out.ratio = out.dup.heal / out.one.heal; return out;
  });
  console.log(JSON.stringify({ v, errs }));
  await b.close();
  if (!process.env.NOASSERT) {
    assert.deepStrictEqual(errs, []); assert(v.one.heal > 0, "IO Repair healed");
    assert(v.ratio > 1.3, "Duplicate's IO copy adds its own heal on top (stacks)");
    console.log("g311 ok");
  }
})().catch((e) => { console.error(e); process.exit(1); });
