/* v1107: Death Strike (Gareth's limit) must fire with every Shield Slam once his bar is full. Before the fix it sometimes stayed loaded: it only counted
   enemies that had "arrived" and were still alive AFTER the slam, so a slam on a walking-in enemy or a slam that killed the last one left it unfired.
   Keeps his bar full, lets Shield Slam auto-cast for a while and counts slams that left a full bar unfired.  Run: node dev/simfork/g270_deathstrike.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store), SECS = +process.env.SECS || 60;
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 } });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "g270@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Death"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const r = await P.evaluate(async (SECS) => {
    const S = game.state, I = S.idle, L = game.idleLimitSkill("gareth").sk;
    S.conquestRoster = ["gareth"]; I.skillAuto = true; I.chapter = 2; I.levelNum = 3; I.playerHp = 1e6;
    setScreen("conquest");
    const out = { slams: 0, fired: 0, missed: 0, why: { noArrived: 0, killedLast: 0, other: 0 } };
    let lastLand = (I.skillLandCounts && I.skillLandCounts.gareth) || 0, lastFires = I.limitFires || 0, pre = null;
    const fill = () => { (I.limit || (I.limit = {})).gareth = L.hitsToFill; };
    const t0 = performance.now();
    while (performance.now() - t0 < SECS * 1000) {
      fill(); /* keep it loaded so every slam should carry a Death Strike */
      pre = { arrived: I.enemies.filter((e) => e.hp > 0 && e.arrived).length, alive: I.enemies.filter((e) => e.hp > 0).length };
      await new Promise((res) => setTimeout(res, 20));
      const land = (I.skillLandCounts && I.skillLandCounts.gareth) || 0, fires = I.limitFires || 0;
      if (land > lastLand) {
        out.slams += land - lastLand;
        if (fires > lastFires) out.fired += fires - lastFires;
        else { out.missed++; if (pre.arrived === 0) out.why.noArrived++; else if (pre.arrived === 1) out.why.killedLast++; else out.why.other++; }
      }
      lastLand = land; lastFires = fires;
      if (I.playerHp < 1e5) I.playerHp = 1e6;
    }
    return out;
  }, SECS);
  console.log(JSON.stringify(r), JSON.stringify({ errs })); await b.close();
  if (!process.env.NOASSERT) { assert.deepStrictEqual(errs, []); assert(r.slams >= 5, "enough slams"); assert.strictEqual(r.missed, 0, "a full Death Strike stayed unfired after a Shield Slam"); console.log("g270 ok"); }
})().catch((e) => { console.error(e); process.exit(1); });
