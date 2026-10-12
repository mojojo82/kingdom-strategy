/* v1116: Boss 2, the Steam Tank. Chapter boss fight: the tank draws (no page errors), boss shots start at the tank's muzzle as shells,
   the muzzle sits left of and above the tracks, and Dev Tools "Classic" brings back the hand orb. Screenshots out_g276_*.png.  Run: node dev/simfork/g276_tankboss.js */
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
  await P.fill("#ksE", "g276@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Tank"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => { setScreen("conquest"); const I = game.state.idle; game.state.conquestRoster = ["gareth"]; I.skillAuto = false; I.levelNum = 20; I.chapter = 1; I.enemies = []; });
  const look = await P.evaluate(() => bossLook);
  const run = (ms) => P.evaluate(async (ms) => {
    const seen = { shots: [], drawn: 0 }, t0 = performance.now(); let boss = false;
    const oSp = spawnEnemyProjectile; spawnEnemyProjectile = function (fx, fy, w, h, arc, dmg, orb) { const r = oSp.apply(this, arguments); if (orb) { const p = idleAnim.enemyProjectiles[idleAnim.enemyProjectiles.length - 1]; seen.shots.push({ x: fx, y: fy, shell: !!p.shell, gy: groundYFor(h) }); } return r; };
    const oD = drawTankBoss; drawTankBoss = function () { seen.drawn++; return oD.apply(this, arguments); };
    while (performance.now() - t0 < ms) {
      await new Promise((res) => setTimeout(res, 100));
      game.state.idle.playerHp = Math.max(game.state.idle.playerHp, 1e6); if (game.state.idle.heroHp && game.state.idle.heroHp.gareth) game.state.idle.heroHp.gareth.hp = 1e12;
      game.state.idle.enemies.forEach((e) => { if (e.type === "boss") { boss = true; e.hp = Math.max(e.hp, e.maxHp * 0.5); } else e.hp = 0; });
    }
    spawnEnemyProjectile = oSp; drawTankBoss = oD; seen.boss = boss; seen.w = document.getElementById("idleCanvas").clientWidth; return seen;
  }, ms);
  const r1 = await run(45000);
  await P.screenshot({ path: path.join(__dirname, "out_g276_tank.png") });
  const sk = await P.evaluate(async () => { /* v1117: the cannon aims at the equipped skin's hull */
    const h = document.getElementById("idleCanvas").clientHeight, w = document.getElementById("idleCanvas").clientWidth, out = {};
    for (const id of [FORTRESS_SKINS[0].id, "void"]) { game.state.fortressSkin = id; await new Promise((r) => setTimeout(r, 1500)); const b = fortHullBox(w, h, "conquest", true, true), t = TANKB.target(h);
      out[id] = { t, box: b && { x: b.x, y: b.y, sw: b.sw, sh: b.sh } }; }
    return out; });
  await P.screenshot({ path: path.join(__dirname, "out_g276_void.png") });
  await P.evaluate(() => { game.state.fortressSkin = FORTRESS_SKINS[0].id; setBossLook("classic"); });
  const r2 = await run(12000);
  await P.screenshot({ path: path.join(__dirname, "out_g276_classic.png") });
  await P.evaluate(() => setBossLook("tank"));
  console.log(JSON.stringify({ sk, look, tank: { drawn: r1.drawn, shots: r1.shots.slice(0, 4), n: r1.shots.length, boss: r1.boss, w: r1.w }, classic: { drawn: r2.drawn, shots: r2.shots.slice(0, 2), n: r2.shots.length }, errs }));
  await b.close();
  if (!process.env.NOASSERT) {
    assert.deepStrictEqual(errs, []); assert.strictEqual(look, "tank", "Boss 2 is the default look"); assert(r1.boss, "boss reached"); assert(r1.drawn > 50, "tank drawn");
    assert(r1.shots.length > 2, "boss shots"); r1.shots.forEach((s) => { assert(s.shell, "tank shot is a shell"); assert(s.x < r1.w && s.x > r1.w * 0.4 && s.y < s.gy, "shot starts at the muzzle (on screen, above the ground)"); });
    assert.strictEqual(r2.drawn, 0, "classic look draws no tank"); r2.shots.forEach((s) => assert(!s.shell, "classic shot is the orb"));
    Object.values(sk).forEach((o) => { assert(o.box, "skin box"); assert(o.t.x > o.box.x && o.t.x < o.box.x + o.box.sw && o.t.y > o.box.y && o.t.y < o.box.y + o.box.sh, "aim point inside the skin picture"); });
    assert(Math.abs(sk.void.t.y - sk[Object.keys(sk)[0]].t.y) > 0.5 || Object.keys(sk)[0] === "void", "aim follows the skin");
    console.log("g276 ok");
  }
})().catch((e) => { console.error(e); process.exit(1); });
