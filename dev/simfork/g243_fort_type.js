/* v1033: fortress type per World PvP formation (march + City Guard defender), one for the Arena, one for Conquest. Run: node dev/simfork/g243_fort_type.js */
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
  await P.fill("#ksE", "g243@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Emp"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const o = {};
  /* spy on the fortress map each fight side gets */
  await P.evaluate(() => { window.__forts = []; const orig = arenaSideStats; window.arenaSideStats = function () { window.__forts.push(arguments[6] === null ? "none" : fortressTypeOf(arguments[6] || {})); return orig.apply(this, arguments); }; });
  /* Formations: pick III on formation 2, I on formation 1 */
  await P.evaluate(() => { setScreen("city", "troops"); renderTroops(); renderFormations(); }); await P.waitForTimeout(500);
  o.formRows = await P.evaluate(() => document.querySelectorAll(".formation-fort .fort-pick").length);
  await P.evaluate(() => { document.querySelector('.fort-pick[data-fp="f1"] button[data-ft="3"]').click(); });
  o.formSet = await P.evaluate(() => ({ f0: formationFortType(game.state.formations[0], game.state.fortressTech), f1: game.state.formations[1].fort, on: document.querySelector('.fort-pick[data-fp="f1"] .on').textContent }));
  await P.evaluate(() => document.querySelectorAll(".formation-card")[1] && document.querySelectorAll(".formation-card")[1].scrollIntoView()); await P.waitForTimeout(200);
  await P.screenshot({ path: (process.env.OUT || "/tmp/") + "fort_formation.png" });
  /* World PvP fight: attacker march.fort 3, defender guard fort 1 */
  o.pvp = await P.evaluate(() => {
    const st = game.state; st.troops.infantry = 500; st.formations[1].troops = { infantry: 100, archer: 0, cavalry: 0 }; st.formations[3].troops = { infantry: 50, archer: 0, cavalry: 0 }; st.formations[3].fort = 1; st.guardOn = true; st.fortressTech._type = undefined;
    const saved = JSON.parse(JSON.stringify(st)); const def = defenderFromSave(saved, { cityGuard: true });
    window.__forts = []; worldPvpBattle({ id: 1, tileId: "x", army: { infantry: 100 }, heroKeys: [], fort: 3 }, def, "x", { seed: "s" });
    const r1 = window.__forts.slice();
    st.formations[3].fort = 3; const def2 = defenderFromSave(JSON.parse(JSON.stringify(st)), { cityGuard: true });
    window.__forts = []; worldPvpBattle({ id: 2, tileId: "x", army: { infantry: 100 }, heroKeys: [] }, def2, "x", { seed: "s" });
    return { defFort: def.fort, r1, r2: window.__forts.slice() };
  });
  /* sendMarch keeps the formation's type */
  o.march = await P.evaluate(() => { const st = game.state; const t = Object.keys(st.map.tiles || {}).length ? null : null; const r = game.sendMarch({ infantry: 10 }, Object.values(st.map.tiles || st.map).find ? (st.map.tiles || st.map).find((x) => x.type === "resource").id : null, "gather", [], 3); return r.ok ? r.march.fort : r.reason; });
  /* Arena: one pick */
  await P.evaluate(() => setScreen("more", "arena")); await P.waitForTimeout(2500);
  o.arenaPick = await P.evaluate(() => !!document.querySelector('.lb2-fort .fort-pick[data-fp="arena"]'));
  await P.evaluate(() => document.querySelector('.fort-pick[data-fp="arena"] button[data-ft="3"]').click()); await P.waitForTimeout(400);
  o.arena = await P.evaluate(() => ({ st: game.state.arenaFort, map: fortressTypeOf(myArenaFortMap()), conquest: fortressTypeOf(game.state.fortressTech), on: document.querySelector('.fort-pick[data-fp="arena"] .on').textContent }));
  await P.screenshot({ path: (process.env.OUT || "/tmp/") + "fort_arena.png" });
  /* Conquest: one pick (map._type) */
  await P.evaluate(() => setScreen("conquest")); await P.waitForTimeout(800);
  o.conqPick = await P.evaluate(() => { const p = document.querySelector('.idle-fort .fort-pick'); const r = p && p.getBoundingClientRect(); return !!r && r.width > 0; });
  await P.evaluate(() => document.querySelector('.fort-pick[data-fp="conquest"] button[data-ft="3"]').click()); await P.waitForTimeout(300);
  o.conq = await P.evaluate(() => ({ type: fortressTypeOf(game.state.fortressTech), arena: game.state.arenaFort }));
  await P.screenshot({ path: (process.env.OUT || "/tmp/") + "fort_conquest.png" });
  /* saved + loaded */
  o.load = await P.evaluate(() => { const g2 = createGame({ mapSize: 3, seed: 1 }); g2.loadState(JSON.parse(JSON.stringify(game.state))); return { arena: g2.state.arenaFort, f1: g2.state.formations[1].fort, conq: fortressTypeOf(g2.state.fortressTech) }; });
  console.log(JSON.stringify(o), errs);
  assert.strictEqual(o.formRows, 4, "a fortress pick on every formation incl. City Guard");
  assert.deepStrictEqual(o.formSet, { f0: 1, f1: 3, on: "🛡️ III" });
  assert.deepStrictEqual(o.pvp, { defFort: 1, r1: [3, 1], r2: [1, 3] }, "attacker uses the march's type, defender the City Guard's");
  assert.strictEqual(o.march, 3, "march remembers the formation's type");
  assert.ok(o.arenaPick && o.arena.st === 3 && o.arena.map === 3 && o.arena.conquest === 1, "Arena has its own pick");
  assert.ok(o.conqPick && o.conq.type === 3 && o.conq.arena === 3, "Conquest has its own pick");
  assert.deepStrictEqual(o.load, { arena: 3, f1: 3, conq: 3 }, "all saved");
  assert.deepStrictEqual(errs, []);
  await b.close(); console.log("g243 OK");
})().catch((e) => { console.error(e); process.exit(1); });
