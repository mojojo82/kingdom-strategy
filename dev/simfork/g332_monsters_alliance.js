/* v1215: alliance members see the same monsters; one kills it -> gone for the other, whose march finds it already dead and gets the energy back.
   Outside an alliance you get your own. Run: node dev/simfork/g332_monsters_alliance.js */
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
  const mk = async (email, name) => { const c = await b.newContext({ viewport: { width: 430, height: 932 } });
    await c.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
    await c.exposeFunction("__fbcall", call);
    await c.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
    await c.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
    await c.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
    await c.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    const P = await c.newPage(); P.on("pageerror", (e) => errs.push(name + ": " + e.message));
    await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
    await P.fill("#ksE", email); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
    await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", name); await P.click("#ksGo"); await P.waitForTimeout(6000);
    await P.evaluate(() => { ALLY.my = { aid: "A1", rank: 5 }; try { setScreen("world"); } catch (e) {} });
    return P; };
  const A = await mk("g332a@test.dev", "Ann"), B = await mk("g332b@test.dev", "Bob");
  /* the same patch of map, worked out on each phone */
  const area = await A.evaluate(() => { const h = tileXY(game.state.homeTileId); return [h[0] - 40, h[0] + 40, h[1] - 40, h[1] + 40]; });
  const list = (P) => P.evaluate((ar) => monstersIn(ar[0], ar[1], ar[2], ar[3]).map((m) => m.id + "/" + m.type + "/" + m.level + "@" + m.tileId).sort(), area);
  const la = await list(A), lb = await list(B);
  /* Ann kills one (a level-1 so she's allowed); Bob already marching at it */
  const pick = await A.evaluate((ar) => { game.state.monsters.maxBeat = 30; return monstersIn(ar[0], ar[1], ar[2], ar[3])[0]; }, area);
  await B.evaluate(() => { game.state.monsters.maxBeat = 30; });
  const send = (P) => P.evaluate((m) => { game.state.troops.cavalry_t10 = 200000; const r = game.sendMarch({ cavalry_t10: 200000 }, m.tileId, "attack", [], 1, m); const mm = game.state.marches[game.state.marches.length - 1]; mm.arriveAt = Date.now() - 10; return { ok: r.ok, energy: game.monsterEnergy() }; }, pick);
  const sa = await send(A); await A.waitForTimeout(3000);
  const ka = await A.evaluate((id) => ({ killed: !!game.state.monsters.kills[id], rep: game.state.battleReports[0] && game.state.battleReports[0].win }), pick.id);
  const sb = await send(B); await B.waitForTimeout(3000);
  const kb = await B.evaluate(() => ({ rep: game.state.battleReports[0] && { note: game.state.battleReports[0].note, win: game.state.battleReports[0].win }, energy: game.monsterEnergy() }));
  const shownB = await B.evaluate((ar) => { monAllyKey = ""; monAllySync(); return new Promise((r) => setTimeout(() => r(monstersIn(ar[0], ar[1], ar[2], ar[3]).some((m) => m.id === ar[4])), 800)); }, area.concat([pick.id]));
  const shownA = await A.evaluate((ar) => monstersIn(ar[0], ar[1], ar[2], ar[3]).some((m) => m.id === ar[4]), area.concat([pick.id]));
  /* someone not in an alliance sees their own monsters */
  const lc = await B.evaluate((ar) => { ALLY.my = null; return monstersIn(ar[0], ar[1], ar[2], ar[3]).map((m) => m.id + "/" + m.type + "/" + m.level + "@" + m.tileId).sort(); }, area);
  console.log(JSON.stringify({ nA: la.length, same: JSON.stringify(la) === JSON.stringify(lb), pick, sa, ka, sb, kb, shownA, shownB, personalDiffers: JSON.stringify(lc) !== JSON.stringify(la), errs }, null, 1));
  await b.close();
  assert.deepStrictEqual(errs, []);
  assert(la.length > 5 && JSON.stringify(la) === JSON.stringify(lb), "alliance members see the same monsters");
  assert(sa.ok && ka.killed && ka.rep, "Ann wins"); assert(!shownA, "gone for Ann");
  assert(sb.ok && kb.rep && /already defeated/.test(kb.rep.note) && kb.energy === 100, "Bob's march finds it gone, energy back");
  assert(!shownB, "gone for Bob too");
  assert(JSON.stringify(lc) !== JSON.stringify(la), "outside the alliance: your own monsters");
  console.log("g332 ok");
})().catch((e) => { console.error(e); process.exit(1); });
