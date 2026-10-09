/* v1003: the Idle Chest - fills online and offline up to a cap (8h, Field Logistics research -> 16h), holds Energon/Valor/resources and item drops every 20 min; Claim pays it all out. Run: node dev/simfork/g225_idle_chest.js */
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
  await P.fill("#ksE", "g225@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Emp"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  /* engine checks on a separate sim game (own clock) */
  const r = await P.evaluate(() => {
    const o = {}; let T = 1000; const g = createGame({ now: () => T, mapSize: 5, seed: 1 }); const s = g.state;
    ["gareth", "lyra"].forEach((k) => { s.heroes[k].owned = true; }); s.buildings.farm && (s.buildings.farm.level = 5);
    const step = (sec, by) => { for (let x = 0; x < sec; x += by) { T += by * 1000; g.tick(); } };
    g.tick(); step(3600, 5); /* 1 hour of live play, 5 s ticks (never "away") */
    let i = g.bucketInfo(); o.live1h = { fill: Math.round(i.fillSec), en: i.energon, items: i.items.reduce((a, x) => a + (x.id === "shards" || x.id === "books" ? 1 : x.n), 0), food: i.res.food };
    T += 20 * 3600e3; g.tick(); i = g.bucketInfo(); o.cap = { fill: i.fillSec, capH: i.capH, full: i.full, en: i.energon, capEn: i.capEn, drops: s.bucket.rolls, next: i.nextDropSec };
    T += 3600e3; g.tick(); o.capStill = s.bucket.rolls; /* full: nothing more */
    const before = { t: s.weaponTickets || 0, rp: s.researchPoints, food: s.resources.food, en: s.energon, su: (s.speedups.construction_1h || 0) + (s.speedups.general_1h || 0), books: s.idle.conquestBooks || 0, fr: s.heroes.gareth.fragments + s.heroes.lyra.fragments };
    const itemsIn = JSON.parse(JSON.stringify(s.bucket.items)); const c = g.collectBucket();
    o.claim = { ok: c.ok, items: itemsIn, got: c.items, dT: (s.weaponTickets || 0) - before.t, dRp: Math.round(s.researchPoints - before.rp), dEn: Math.round(s.energon - before.en), dSu: (s.speedups.construction_1h || 0) + (s.speedups.general_1h || 0) - before.su, dBooks: (s.idle.conquestBooks || 0) - before.books, dFr: s.heroes.gareth.fragments + s.heroes.lyra.fragments - before.fr };
    i = g.bucketInfo(); o.afterClaim = { fill: i.fillSec, hasAny: i.hasAny, items: i.items.length, full: i.full };
    o.again = g.collectBucket().ok;
    s.tech.fieldLogistics = 10; i = g.bucketInfo(); o.tech = { capH: i.capH, drop: Math.round(i.dropSec) };
    T += 30 * 3600e3; g.tick(); o.tech.fill = g.bucketInfo().fillSec / 3600; o.tech.rolls = s.bucket.rolls;
    /* hanzo (VIP) never gets shards */
    s.heroes.hanzo.owned = true; s.bucket.items = { shards: 300 }; const hz0 = s.heroes.hanzo.fragments || 0; g.collectBucket(); o.hanzoShards = (s.heroes.hanzo.fragments || 0) - hz0;
    o.techText = techBonusText(TECH_DEFS.fieldLogistics, 10);
    return o;
  });
  console.log(JSON.stringify(r));
  assert.ok(Math.abs(r.live1h.fill - 3600) < 10 && r.live1h.en >= 38 && r.live1h.en <= 41 && r.live1h.items >= 2 && r.live1h.items <= 3, "fills while playing: 1h = 40 Energon, 3 drops");
  assert.ok(r.cap.fill === 8 * 3600 && r.cap.capH === 8 && r.cap.full && r.cap.drops === 24 && r.cap.next === null, "stops at 8h with 24 drops");
  assert.strictEqual(r.capStill, 24, "a full chest stops filling");
  assert.ok(r.claim.ok && r.claim.dEn >= 300 && r.claim.dT + r.claim.dSu + r.claim.dBooks + r.claim.dFr > 0 && r.claim.dRp > 0, "claim pays out Energon, items and RP");
  assert.ok(!r.claim.items.gems && !r.claim.items.fragments && !r.claim.items.cards, "no gems / weapon fragments / cards");
  assert.ok(r.afterClaim.fill === 0 && !r.afterClaim.hasAny && !r.afterClaim.full && r.again === false, "claim empties it and restarts the timer");
  assert.ok(r.tech.capH === 16 && r.tech.drop === 960 && Math.abs(r.tech.fill - 16) < 0.01, "Field Logistics 10: 16h cap, a drop every 16 min");
  assert.strictEqual(r.hanzoShards, 0, "VIP heroes never get chest shards");
  assert.ok(/\+8h Idle Chest max time/.test(r.techText), "research text");
  /* the popup */
  await P.evaluate(() => setScreen("world")); await P.waitForTimeout(800);
  const setAway = (h) => P.evaluate(async (h) => { const st = game.state, B = st.bucket; B.en = 0; B.val = 0; B.fillSec = 0; B.dropSec = 0; B.res = {}; B.items = {}; delete B.away; window.ksWelcomeBackCooldownReset();
    B.at = Date.now() - h * 3600e3; for (let i = 0; i < 12; i++) { await new Promise((r) => setTimeout(r, 500)); const p = document.getElementById("wbPop"); if (p.style.display === "flex") return p.innerText; } return null; }, h);
  const o = {};
  o.part = await setAway(3);
  await P.click("#mapIdleBtn"); await P.waitForTimeout(400); o.open = await P.evaluate(() => document.getElementById("wbPop").innerText);
  o.t1 = await P.evaluate(() => document.getElementById("icTime").textContent); await P.waitForTimeout(2100); o.t2 = await P.evaluate(() => document.getElementById("icTime").textContent);
  await P.screenshot({ path: (process.env.OUT || "/tmp/") + "idle_chest_3h.png" });
  const tk0 = await P.evaluate(() => game.state.weaponTickets || 0);
  await P.click("#wbBtn"); await P.waitForTimeout(500);
  o.closed = await P.evaluate(() => document.getElementById("wbPop").style.display); o.empty = await P.evaluate(() => !game.bucketInfo().hasAny && game.bucketInfo().fillSec < 5);
  o.full = await setAway(10);
  await P.screenshot({ path: (process.env.OUT || "/tmp/") + "idle_chest_full.png" });
  o.boxW = await P.evaluate(() => { const r = document.querySelector("#wbPop .ic-box").getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right), document.documentElement.scrollWidth]; });
  await P.click("#icX"); await P.waitForTimeout(300); o.xClosed = await P.evaluate(() => document.getElementById("wbPop").style.display === "none" && game.bucketInfo().full);
  console.log(JSON.stringify(o));
  assert.strictEqual(o.part, null, "3h (not full): no popup");
  assert.ok(/Idle Chest/.test(o.open) && /Max 8h/.test(o.open) && /03:0\d:\d\d/.test(o.open) && /Next item in/.test(o.open) && /Claim/.test(o.open), "chest popup: timer, cap, next item, claim");
  assert.notStrictEqual(o.t1, o.t2, "timer ticks while open");
  assert.ok(o.closed === "none" && o.empty, "Claim empties the chest");
  assert.ok(o.full && /Welcome back!/.test(o.full) && /08:00:00/.test(o.full) && /Chest is full/.test(o.full), "full chest pops up by itself");
  assert.ok(o.boxW[0] >= 0 && o.boxW[1] <= 430 && o.boxW[2] <= 430, "fits a phone");
  assert.ok(o.xClosed, "✕ closes without claiming");
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
