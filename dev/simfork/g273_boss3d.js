/* v1112: the 3D boss. A chapter boss fight with Gareth: checks the boss uses the 3D sheet, raises his arm, aims low when Gareth is under him, stomps,
   every boss shot still shows (orb from the hand or a stomp), no page errors. Screenshots out_g273_*.png.  Run: node dev/simfork/g273_boss3d.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "g273@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Boss"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => { setScreen("conquest"); const I = game.state.idle; game.state.conquestRoster = ["gareth"]; I.skillAuto = false; I.playerHp = 1e9; I.levelNum = 20; I.chapter = 1; I.enemies = []; });
  const r = await P.evaluate(async () => {
    const seen = { modes: {}, low: 0, stomps: 0, impacts: 0, orbs: 0, orbFromHand: 0, shots: 0 }, t0 = performance.now();
    const oShot = boss3dShot; boss3dShot = function () { seen.shots++; return oShot.apply(this, arguments); };
    const oImp = boss3dStompImpact; boss3dStompImpact = function () { seen.impacts++; return oImp.apply(this, arguments); };
    const oSp = spawnEnemyProjectile; spawnEnemyProjectile = function (fx, fy, w, h, arc, dmg, orb) { if (orb) { seen.orbs++; const bs = Object.values(idleAnim.enemyById).find((v) => v.type === "boss"); if (bs && fx < bs.x && fx > bs.x - 80) seen.orbFromHand++; } return oSp.apply(this, arguments); };
    let lastStomp = null, gameHp = () => (game.state.idle.playerHp = 1e9, (game.state.idle.heroHp && game.state.idle.heroHp.gareth) ? (game.state.idle.heroHp.gareth.hp = 1e12) : 0);
    while (performance.now() - t0 < 70000) {
      await new Promise((res) => setTimeout(res, 50)); gameHp();
      const bsx = Object.values(idleAnim.enemyById).find((v) => v.type === "boss"); if (bsx && bsx.hp) {}
      seen.modes[boss3d.mode] = (seen.modes[boss3d.mode] || 0) + 1; if (boss3d.low && boss3d.mode === "up") seen.low++;
      if (boss3d.stomp && boss3d.stomp !== lastStomp) { seen.stomps++; lastStomp = boss3d.stomp; }
      Object.values(idleAnim.enemyById).forEach((v) => { if (v.type === "boss" && v.hp != null) {} });
      game.state.idle.enemies.forEach((e) => { if (e.type === "boss") e.hp = Math.max(e.hp, e.maxHp * 0.5); }); /* keep the boss alive for the whole test */
    }
    return seen;
  });
  for (const n of ["a", "b", "c"]) { await P.waitForTimeout(700); await P.screenshot({ path: path.join(__dirname, "out_g273_" + n + ".png") }); }
  console.log(JSON.stringify({ r, errs })); await b.close();
  if (!process.env.NOASSERT) {
    assert.deepStrictEqual(errs, []); assert(r.shots > 3, "boss shots"); assert(r.modes.up > 0 && r.modes.raising > 0, "arm raises and holds");
    assert(r.low > 0, "aims low at Gareth"); assert(r.stomps > 0 && r.impacts > 0, "stomps land"); assert(r.orbs + r.impacts >= r.shots - 2, "every shot shows (orb or stomp)");
    console.log("g273 ok");
  }
})().catch((e) => { console.error(e); process.exit(1); });
