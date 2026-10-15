/* v1186 (Harley: weapons work the same in Conquest and Arena): Duplicate copying a Laser, missile weapon or the Hex Shield now works in Conquest too
   (Duplicate's % of the damage, half a cooldown later), like Arena. Unequipping Duplicate stops it, and stale copy timers are cleared.
   Run: node dev/simfork/g306_dup_conquest.js */
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
  await P.fill("#ksE", "g306@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Dupe"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => { game.state.conquestRoster = ["gareth"]; game.state.idle.levelNum = 3; setScreen("conquest"); });
  const run = (eq, tgt, ms) => P.evaluate(async ([eq, tgt, ms]) => { const st = game.state, I = st.idle; st.equippedWeapons = eq; st.duplicateTarget = tgt; I.weaponCooldowns = {}; I.laserBeams = [];
    const seen = {}, beams = [], shots = [], t0 = performance.now();
    while (performance.now() - t0 < ms) {
      I.playerHp = Math.max(I.playerHp || 0, 1e6); (I.enemies || []).forEach((e) => { e.hp = Math.max(e.hp, e.maxHp * 0.6); });
      (I.laserBeams || []).forEach((b) => { if (!seen["b" + b.id]) { seen["b" + b.id] = 1; beams.push(Math.round(b.dps * b.dur)); } });
      (I.weaponFlightQueue || []).forEach((q) => { if (!seen["q" + q.id]) { seen["q" + q.id] = 1; shots.push(Math.round(q.dmg)); } });
      await new Promise((r) => setTimeout(r, 40)); }
    return { beams, shots, cds: Object.keys(I.weaponCooldowns || {}) }; }, [eq, tgt, ms]);
  const o = {};
  o.laser = await run(["laser_beam"], "laser_beam", 25000);
  o.laserDup = await run(["laser_beam", "duplicate"], "laser_beam", 25000);
  o.after = await run(["laser_beam"], "laser_beam", 25000);
  o.misDup = await run(["missile_barrage", "duplicate"], "missile_barrage", 20000);
  o.hex = await P.evaluate(async () => { const st = game.state; st.equippedWeapons = ["hex_shield"]; st.idle.shieldOn = false; await new Promise((r) => setTimeout(r, 1500)); const a = st.idle.shieldMax;
    st.equippedWeapons = ["hex_shield", "duplicate"]; st.duplicateTarget = "hex_shield"; await new Promise((r) => setTimeout(r, 1500)); return { solo: a, dup: st.idle.shieldMax }; });
  o.stale = await P.evaluate(async () => { const st = game.state; st.equippedWeapons = ["railgun", "duplicate"]; st.duplicateTarget = "railgun"; await new Promise((r) => setTimeout(r, 2500)); const had = Object.keys(st.idle.fxT || {});
    st.equippedWeapons = ["railgun"]; await new Promise((r) => setTimeout(r, 2500)); return { had, now: Object.keys(st.idle.fxT || {}) }; });
  console.log(JSON.stringify({ o, errs }));
  await b.close();
  if (!process.env.NOASSERT) {
    assert.deepStrictEqual(errs, []);
    const big = (a) => Math.max.apply(null, a);
    assert(o.laserDup.beams.filter((d) => d === big(o.laserDup.beams)).length >= 2 && o.laserDup.beams.length >= 4, "Duplicate adds a second laser in Conquest");
    assert(o.laserDup.beams.some((d) => Math.abs(d - big(o.laserDup.beams) * 0.5) <= 2), "the copy hits for 50%");
    assert(o.laserDup.cds.includes("laser_beam_dup"));
    assert(o.after.beams.length >= 1 && o.after.beams.every((d) => d === big(o.after.beams)) && !o.after.cds.includes("laser_beam_dup") || o.after.beams.every((d) => d === big(o.after.beams)), "unequipped: no half-strength copy beams");
    assert(o.misDup.shots.some((d) => Math.abs(d - big(o.misDup.shots) * 0.5) <= 2), "missiles copied at 50% too");
    assert(o.hex.dup >= o.hex.solo * 1.35 && o.hex.dup <= o.hex.solo * 1.6, "Hex Shield copied: +50% pool");
    assert(o.stale.had.includes("railgun_dup") && !o.stale.now.includes("railgun_dup"), "copy timer cleared on unequip");
    console.log("g306 ok");
  }
})().catch((e) => { console.error(e); process.exit(1); });
