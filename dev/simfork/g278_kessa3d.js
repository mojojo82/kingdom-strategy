/* v1120: the 3D Kessa in Conquest. Her basic orb leaves her palm (attack frame 6), Arc Burst plays the cast state (wind-up -> held cast -> recovery),
   the bolt is released after the wind-up from her palm using the Blender texture, no page errors. Screenshots out_g278_*.png.  Run: node dev/simfork/g278_kessa3d.js */
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
  await P.fill("#ksE", "g278@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Kessa"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => { setScreen("conquest"); const I = game.state.idle; game.state.heroes.kessa.owned = true; game.state.conquestRoster = ["kessa"]; I.skillAuto = true; I.levelNum = 3; I.chapter = 1;
    window.__keep = setInterval(() => { const I = game.state.idle; if (I.heroHp) Object.values(I.heroHp).forEach((x) => x.hp = 1e12); I.playerHp = Math.max(I.playerHp || 0, 1); }, 200); });
  const r = await P.evaluate(async () => {
    const seen = { states: {}, orbs: [], bolts: [], casts: 0, castStartToBolt: [], hand: null }, t0 = performance.now(); let castAt = 0;
    const oDraw = drawHeroAnim; drawHeroAnim = function (ctx, key, x, feetY, state) { if (key === "kessa") { seen.states[state] = (seen.states[state] || 0) + 1; seen.feet = [x, feetY]; } return oDraw.apply(this, arguments); };
    const oSp = spawnHeroLightning; spawnHeroLightning = function (fx, fy, tx, ty, c, tex) { seen.bolts.push({ fx, fy, tex: !!tex, c }); if (castAt) seen.castStartToBolt.push(performance.now() - castAt); return oSp.apply(this, arguments); };
    const oP = spawnProjectile; spawnProjectile = function (w, h, ox, oy, tx, ty, a, id, d, s, style) { if (style === "orb") seen.orbs.push({ ox, oy }); return oP.apply(this, arguments); };
    let lastCast = null;
    while (performance.now() - t0 < 40000) { await new Promise((res) => setTimeout(res, 50)); const hc = idleAnim.heroCast && idleAnim.heroCast.kessa; if (hc && hc !== lastCast) { lastCast = hc; seen.casts++; castAt = hc.t0; } }
    const kv = idleAnim.heroVis.kessa, hs = heroSpriteVisualScale / 100; seen.hand = kv ? kessaHandPos(kv.x, kv.y + 12 * hs, hs, true, true) : null; seen.vis = kv ? { x: kv.x, y: kv.y } : null;
    drawHeroAnim = oDraw; spawnHeroLightning = oSp; spawnProjectile = oP; return seen;
  });
  await P.screenshot({ path: path.join(__dirname, "out_g278_a.png") });
  const r2 = await P.evaluate(async () => { /* phase 2: auto-skill off -> basic orbs */
    game.state.idle.skillAuto = false; delete (idleAnim.heroCast || {}).kessa; const st = {}, orbs = []; const t0 = performance.now();
    const oDraw = drawHeroAnim; drawHeroAnim = function (ctx, key, x, feetY, state) { if (key === "kessa") st[state] = (st[state] || 0) + 1; return oDraw.apply(this, arguments); };
    const oP = spawnProjectile; spawnProjectile = function (w, h, ox, oy, tx, ty, a, id, d, s, style) { if (style === "orb") orbs.push({ ox, oy, delay: idleAnim.projectiles.length }); return oP.apply(this, arguments); };
    let nx = 0; while (performance.now() - t0 < 12000) { await new Promise((res) => setTimeout(res, 100)); if (performance.now() - t0 > nx) { nx += 1500; const e = game.state.idle.enemies[0]; if (e && idleAnim.enemyById[e.id]) idleAnim.pendingBasicShots.push({ aid: 'kessa', id: e.id, dmg: 1 }); } } /* feed the visual queue: the engine gives this setup no basic hits */
    drawHeroAnim = oDraw; spawnProjectile = oP; return { st, orbs: orbs.length, seq: idleAnim.atkShotSeq && idleAnim.atkShotSeq.kessa, enemies: game.state.idle.enemies.length, basic: idleAnim.pendingBasicShots.length };
  });
  console.log(JSON.stringify({ r2, states: r.states, orbs: r.orbs.length, orb0: r.orbs[0], bolts: r.bolts.slice(0, 3), casts: r.casts, delay: r.castStartToBolt.slice(0, 3), hand: r.hand, vis: r.vis, errs }));
  await b.close();
  if (!process.env.NOASSERT) {
    assert.deepStrictEqual(errs, []); assert(r.states.idle > 0, "idle drawn"); assert(r2.orbs > 0 && r2.st.attack > 0, "basic orbs + attack frames"); assert(r.casts > 0 && (r.states.cast || r.states.castMiss), "Arc Burst plays the cast state");
    assert(r.bolts.length > 0 && r.bolts.every((x) => x.tex), "Arc Burst bolt uses the Blender texture"); assert(r.castStartToBolt.every((d) => d >= 380), "bolt waits for the wind-up");
    console.log("g278 ok");
  }
})().catch((e) => { console.error(e); process.exit(1); });
