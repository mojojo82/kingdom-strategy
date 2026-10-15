/* v1196 (Harley, audit item 8): Projection Wall works in Conquest like Arena - blocks enemy projectiles on ranged heroes while up; Lv50 Mirror reflects 50%.
   Run: node dev/simfork/g316_wall_conquest.js */
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
  await P.fill("#ksE", "g316@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Wall"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const v = await P.evaluate(() => {
    const mk = (wallLv) => { let t = Date.UTC(2026, 0, 5); const g = createGame({ now: () => t, mapSize: 5, seed: 1, combatSeed: 777 }), s = g.state; setEquipBonus({});
      ["gareth", "lyra"].forEach((k) => { const h = s.heroes[k]; h.owned = true; h.level = 1; }); s.conquestRoster = ["gareth", "lyra"];
      s.idle.chapter = 8; s.weaponLevels = { projection_wall: wallLv }; s.equippedWeapons = ["projection_wall"];
      for (let i = 0; i < 12; i++) { t += 1000; g.tick(); if (s.idle.enemies.some((e) => e.arrived && e.hp > 0)) break; }
      return { g, s, tick: () => { t += 1000; g.tick(); } }; };
    const o = {};
    { const { g, s } = mk(50); const T = s.idle.fxT && s.idle.fxT.projection_wall; o.upAt50 = T ? T.up : null;
      const en = s.idle.enemies.find((e) => e.arrived && e.hp > 0) || s.idle.enemies[0]; const hp0 = en ? en.hp : null;
      o.blockRanged = g.idleWallBlocks({ key: "lyra", dmg: 100, src: en && en.id, type: "archer" });
      o.blockInfantry = g.idleWallBlocks({ key: "gareth", dmg: 100, src: en && en.id, type: "archer" });
      o.mirrored = s.idle.wallMirrored || 0; o.enemyLost = en ? hp0 - en.hp : null; }
    { const { g, s, tick } = mk(30); o.mirror30 = (g.idleWallBlocks({ key: "lyra", dmg: 100, type: "archer" }), s.idle.wallMirrored || 0);
      for (let i = 0; i < 6; i++) tick(); o.downAfter = g.idleWallBlocks({ key: "lyra", dmg: 100, type: "archer" }); o.upLeft = s.idle.fxT.projection_wall.up; }
    return o;
  });
  console.log(JSON.stringify({ v, errs }));
  await b.close();
  if (!process.env.NOASSERT) {
    assert.deepStrictEqual(errs, []); assert(v.upAt50 > 0, "the Wall goes up in Conquest");
    assert.strictEqual(v.blockRanged, true, "blocks a shot on a ranged hero"); assert.strictEqual(v.blockInfantry, false, "infantry not covered");
    assert(Math.abs(v.mirrored - 50) < 1e-6, "Mirror Wall reflects 50% at Lv50"); assert.strictEqual(v.mirror30, 0, "no Mirror below Lv50");
    assert.strictEqual(v.downAfter, false, "nothing blocked once the Wall is down");
    console.log("g316 ok");
  }
})().catch((e) => { console.error(e); process.exit(1); });
