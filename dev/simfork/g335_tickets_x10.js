/* v1227 (Harley: ticket count should match fragments ~1:1, same balance): tickets x10, a draw = 10 tickets = the old 1 ticket. Run: node dev/simfork/g335_tickets_x10.js */
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
  await P.fill("#ksE", "g335@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Promo"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  const SH = process.env.SHOTS;
  /* Barracks 15 (T5), 780 Infantry T3, lots of food/wood. Open City > Troops, Infantry, tier III, Promote mode. */
  const r = await P.evaluate(() => {
    const out = {};
    /* 1. an old save (before v1227) is converted: tickets x10 in the wallet, the idle chest and recon rewards */
    const old = JSON.parse(JSON.stringify(stateForOwnSave())); delete old.ticketsX10; old.weaponTickets = 67; old.bucket = Object.assign({}, old.bucket, { items: { tickets: 2 } });
    try { game.reconSync(); } catch (e) {} old.recon = JSON.parse(JSON.stringify(game.state.recon)); let bm = (old.recon.missions || []).find((m) => m.reward && m.reward.tickets); if (!bm && old.recon.missions && old.recon.missions[0]) { bm = old.recon.missions[0]; bm.reward = bm.reward || {}; } if (bm) bm.reward.tickets = 1; out.hadRecon = !!bm;
    const g2 = createGame({ mapSize: 3, seed: 1 }); g2.loadState(JSON.parse(JSON.stringify(old)));
    out.migr = { tickets: g2.state.weaponTickets, chest: g2.state.bucket.items.tickets, recon: ((g2.state.recon.missions || []).find((m) => m.reward && m.reward.tickets) || { reward: {} }).reward.tickets, flag: g2.state.ticketsX10 };
    /* loading it again (already converted) must not x10 a second time */
    const g3 = createGame({ mapSize: 3, seed: 1 }); g3.loadState(JSON.parse(JSON.stringify(g2.state))); out.again = g3.state.weaponTickets;
    /* 2. a draw costs 10 tickets and does what one old ticket did (5 pulls) */
    const g = createGame({ mapSize: 3, seed: 1 }); g.state.weaponTickets = 25; const before = Object.values(g.state.weaponFrags).reduce((a, b) => a + b, 0);
    const d1 = g.weaponDraw(15); out.draw15 = { ok: d1.ok, spent: 25 - g.state.weaponTickets, draws: g.state.weaponDraws, frags: Object.values(g.state.weaponFrags).reduce((a, b) => a + b, 0) - before };
    out.draw5 = g.weaponDraw(5).ok;
    /* 3. fragments per 10 tickets over many draws, pool level 1 (old: ~13.5 per old ticket) */
    const g4 = createGame({ mapSize: 3, seed: 1 }); g4.state.weaponTickets = 40; let f = 0; for (let i = 0; i < 4; i++) { const x = g4.weaponDraw(10); x.got.forEach((q) => { f += q.n; }); } out.per10atLv1 = f / 4;
    /* 4. mail with 5 weapon tickets (server counts old tickets) -> 50 */
    const t0 = game.state.weaponTickets; ksMailApply("t1", [{ kind: "save", path: "weaponTickets", qty: 5 }]); out.mail = game.state.weaponTickets - t0;
    out.itemQty = ksItemQty("weapon_tickets", 3);
    return out;
  });
  console.log(JSON.stringify({ r, errs }));
  await b.close();
  assert.deepStrictEqual(errs, []);
  assert.deepStrictEqual([r.migr.tickets, r.migr.chest, r.migr.flag], [670, 20, true], "old save converted x10"); if (r.hadRecon) assert.strictEqual(r.migr.recon, 10, "recon reward x10");
  assert.strictEqual(r.again, 670, "not converted twice");
  assert(r.draw15.ok && r.draw15.spent === 10 && r.draw15.draws === 1 && r.draw15.frags >= 5, "15 tickets -> one draw of 10 (5 pulls)");
  assert.strictEqual(r.draw5, false, "under 10 tickets can't draw");
  assert(r.per10atLv1 >= 10 && r.per10atLv1 <= 20, "10 tickets ~ 10-15 fragments at pool Lv 1");
  assert.strictEqual(r.mail, 50); assert.strictEqual(r.itemQty, 30);
  console.log("g335 ok");
})().catch((e) => { console.error(e); process.exit(1); });
