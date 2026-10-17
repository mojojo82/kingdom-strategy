/* v1240 (Harley): march size = 500 + Command Center (Kingshot table, new building at TH10) + heroes by level x0.6. Marches over the size are trimmed
   (same mix). Run: node dev/simfork/g337_march_capacity.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call0 = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store), DELAY = 1500;
 /* the FIRST move is slow to reach the server (cold start / bad signal), later ones are quick - so a second move can land first, like on a phone */
const call = call0;
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
  await P.fill("#ksE", "g337@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Marcher"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  const SH = process.env.SHOTS;
  const r = await P.evaluate(() => {
    const g = game, s = g.state, out = {};
    out.hero = [1, 17, 30, 45, 60, 80].map((lv) => heroTroopCap(lv)); out.heroRaw80 = heroTroopCapRaw(80);
    out.capNoHeroes = g.marchCapacity([]);
    out.ccLocked = !g.meetsRequirements("commandcenter");
    s.buildings.townhall.level = 10; out.ccOpen = g.meetsRequirements("commandcenter");
    out.ccCost1 = JSON.stringify(costFor("commandcenter", 1)); out.ccCost30 = JSON.stringify(costFor("commandcenter", 30)); out.ccTime30 = timeFor("commandcenter", 30);
    const p0 = g.powerBreakdown().buildings; s.buildings.commandcenter.level = 10; out.ccPower10 = Math.round(g.powerBreakdown().buildings - p0);
    const hk = Object.keys(s.heroes).filter((k) => s.heroes[k].owned && HERO_DEFS[k].class !== "governor").slice(0, 2);
    hk.forEach((k) => { s.heroes[k].level = 60; s.heroes[k].busy = false; });
    out.heroes = hk.length; out.cap = g.marchCapacity(hk);
    /* send 30,000 troops: trimmed to the cap, only that many leave home */
    const tk = Object.keys(s.troops).filter((k) => /infantry/.test(k))[0], tk2 = Object.keys(s.troops).filter((k) => /archer/.test(k))[0];
    s.troops[tk] = 20000; s.troops[tk2] = 10000;
    const res = s.map.filter((t) => t.type === "resource")[0], army = {}; army[tk] = 20000; army[tk2] = 10000;
    const m = g.sendMarch(army, res.id, "gather", hk);
    out.sent = m.ok ? Object.values(m.march.army).reduce((a, b) => a + b, 0) : m.reason; out.mix = m.ok ? [m.march.army[tk], m.march.army[tk2]] : null; out.capped = m.ok && m.march.capped;
    out.leftHome = s.troops[tk] + s.troops[tk2];
    return out;
  });
  await P.evaluate(() => { setScreen("city", "buildings"); }); await P.waitForTimeout(500);
  const ui1 = await P.evaluate(() => { const rows = [...document.querySelectorAll("#buildingsList .bld")].map((e) => e.textContent); return rows.find((t) => /Command Center/.test(t)) || null; });
  if (SH) await P.screenshot({ path: SH + "/cc_buildings.png" });
  await P.evaluate(() => { const s = game.state; const k = Object.keys(s.troops).filter((x) => /infantry/.test(x))[0]; s.troops[k] = 50000; const f = s.formations.find((x) => !x.guard); f.troops[k] = 40000; game.formSync(); setScreen("city", "formations"); }); await P.waitForTimeout(600);
  const ui2 = await P.evaluate(() => { const e = document.querySelector(".fm-capline"); return e && e.textContent; });
  if (SH) await P.screenshot({ path: SH + "/cc_formation.png" });
  console.log(JSON.stringify({ r, ui1, ui2, errs }));
  await b.close();
  assert.deepStrictEqual(errs, []);
  assert.deepStrictEqual(r.hero, [72, 1224, 2943, 5547, 7422, 8082], "hero capacity x0.6"); assert.strictEqual(r.heroRaw80, 13470);
  assert.strictEqual(r.capNoHeroes, 500, "no Command Center, no heroes = 500");
  assert(r.ccLocked && r.ccOpen, "Command Center unlocks at Town Hall 10");
  assert.strictEqual(r.ccCost1, '{"wood":80}'); assert.strictEqual(r.ccCost30, '{"wood":90000000,"food":90000000,"stone":18000000,"gold":4500000}'); assert.strictEqual(r.ccTime30, 416640);
  assert.strictEqual(r.ccPower10, 10598, "Command Center Lv10 power = Kingshot 10,598");
  assert.strictEqual(r.cap, 500 + 8000 + r.heroes * 7422, "500 + CC10 8,000 + heroes at Lv60");
  assert.strictEqual(r.sent, r.cap, "30,000 sent -> trimmed to the march size"); assert(r.capped);
  assert.strictEqual(r.leftHome, 30000 - r.cap, "only the trimmed army leaves home");
  assert(Math.abs(r.mix[0] / r.mix[1] - 2) < 0.01, "same 2:1 mix after trimming");
  assert(ui1 && /March size \+8,000/.test(ui1), "building card shows march size"); assert(ui2 && /40,000 \/ /.test(ui2) && /saves as/.test(ui2), "formation shows march size + over-cap warning");
  console.log("g337 ok");
})().catch((e) => { console.error(e); process.exit(1); });
