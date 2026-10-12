/* v1100: the 3D-knight Gareth sheet (v1101: + Colossal slash shots out_g267_slash0-5). Screenshots (dev/simfork/out_g267_*.png) of him fighting, charging (Shield Slam), back-hopping and reeling from
   a big hit, and checks: no page errors, his sheet + lunge image decode, the hit row plays on a big hit and not on a small one.
   Run: node dev/simfork/g267_knight.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store), OUT = (n) => path.join(__dirname, "out_g267_" + n + ".png");
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
  await P.fill("#ksE", "g267@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Knight"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => { setScreen("conquest"); const st = game.state.idle; game.state.conquestRoster = ["gareth"]; st.skillAuto = false; st.chapter = 1; st.levelNum = 1; st.playerHp = 1e6; });
  const shotArea = async (n) => { const c = await P.$("#idleCanvas") || await P.$("canvas"); await (c ? c.screenshot({ path: OUT(n) }) : P.screenshot({ path: OUT(n) })); };
  await P.waitForTimeout(9000); await shotArea("fight");
  for (let q = 0; q < 6; q++) { await P.waitForTimeout(83); await shotArea("slash" + q); } /* v1101: Colossal slash mid-swing */
  const dec = await P.evaluate(() => ({ sheet: !!heroAnimImg("gareth"), lunge: !!heroChargeImg("gareth"), hop: !!heroHopImg("gareth"), w: heroAnimImg("gareth") && heroAnimImg("gareth").naturalWidth }));
  // big vs small hit
  const hit = await P.evaluate(async () => {
    const mx = game.idleHeroMaxHp("gareth"), v = idleAnim.heroVis.gareth; v.hurt = null;
    heroBigHitCheck("gareth", mx * 0.05); const small = !!v.hurt;
    heroBigHitCheck("gareth", mx * 0.2); const big = !!v.hurt;
    return { small, big };
  });
  await P.waitForTimeout(140); await shotArea("bighit");
  // back-hop
  await P.evaluate(() => { const v = idleAnim.heroVis.gareth; v.hop = { t0: performance.now(), x0: v.x }; });
  await P.waitForTimeout(330); await shotArea("hop");
  await P.waitForTimeout(900);
  // charge: start one by hand (wind-up, then the dash)
  await P.evaluate(() => { window.__cw = [CHARGE_WINDUP, CHARGE_DASH]; CHARGE_WINDUP = 2400; CHARGE_DASH = 3000; const v = idleAnim.heroVis.gareth; heroChargeStart("c_gareth", v.x - 120, null); }); /* test only: slowed so each phase can be photographed */
  await P.waitForTimeout(500); await shotArea("charge_crouch");
  await P.waitForTimeout(1300); await shotArea("charge_pushoff");
  await P.waitForTimeout(1400); await shotArea("charge_dash");
  await P.evaluate(() => { CHARGE_WINDUP = window.__cw[0]; CHARGE_DASH = window.__cw[1]; });
  await P.waitForTimeout(1500);
  console.log(JSON.stringify({ dec, hit, errs }));
  await b.close();
  assert.deepStrictEqual(errs, [], "page errors"); assert(dec.sheet && dec.lunge && dec.hop, "images decode");
  assert(!hit.small && hit.big, "hit row only on a big hit");
  console.log("g267 ok");
})().catch((e) => { console.error(e); process.exit(1); });
