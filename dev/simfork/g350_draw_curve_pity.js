/* v1409: weapon draw pool level curve x3.4 (Lv 15 = 8,910 tickets) + Legendary pity (5,000 pulls at a pool level with Legendary).
   Run: node dev/simfork/g350_draw_curve_pity.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
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
  await P.fill("#ksE", "dc@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Dc"); await P.click("#ksGo"); await P.waitForTimeout(2500);
  const r = await P.evaluate(() => {
    const s = game.state, out = {};
    const lvAt = (n) => { s.weaponDraws = n; return game.weaponDrawProgress().level; };
    out.levels = [[169, lvAt(169)], [170, lvAt(170)], [8909, lvAt(8909)], [8910, lvAt(8910)]];
    s.weaponDraws = 8910; s.weaponTickets = 0;
    /* pity: force a non-Legendary roll every time, see the 5,000th pull become Legendary */
    const R = Math.random; Math.random = () => 0.001; s.weaponPity = 4998; s.weaponTickets = 3;
    const legs = WEAPON_DEFS.filter((w) => w.rarity === "Legendary" && !w.visualOnly && !w.noDraw).map((w) => w.id), before = legs.reduce((a, id) => a + (s.weaponFrags[id] || 0), 0);
    const d = game.weaponDraw(3); Math.random = R;
    out.pity = { ok: d.ok, legGained: legs.reduce((a, id) => a + (s.weaponFrags[id] || 0), 0) - before, pityAfter: s.weaponPity };
    s.weaponPity = 10; s.weaponDraws = 100; s.weaponTickets = 5; game.weaponDraw(5); out.noPityBelow15 = s.weaponPity;
    return out;
  });
  await b.close();
  assert.deepStrictEqual(errs, []);
  console.log(JSON.stringify(r.levels)); assert.deepStrictEqual(r.levels, [[169, 1], [170, 2], [8909, 14], [8910, 15]], "curve: Lv2 at 170, Lv15 at 8,910");
  assert(r.pity.ok && r.pity.legGained === 1, "5,000th pull at Lv15 = Legendary fragment");
  assert.strictEqual(r.pity.pityAfter, 1, "counter reset then counts on");
  assert.strictEqual(r.noPityBelow15, 10, "no pity counting below Lv15 (no Legendary in pool)");
  console.log("g350 ok", JSON.stringify(r));
})().catch((e) => { console.error(e); process.exit(1); });
