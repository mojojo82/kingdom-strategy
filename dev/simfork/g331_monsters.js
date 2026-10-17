/* v1215 (Harley): monsters on the world map. New account: monsters show near home; Search (Dark Knight Lv1) jumps to one (or calls one up) and
   opens its card; attack with a formation -> 10 energy, march, win, report, rewards, Lv1 beaten, monster gone; no energy = can't attack.
   SHOTS=dir saves map / search / card / report pictures. Run: node dev/simfork/g331_monsters.js */
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
  await P.fill("#ksE", "g331@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Hunter"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  const SH = process.env.SHOTS;
  await P.evaluate(() => { try { setScreen("world"); } catch (e) {} centerMapOnHome(); });
  await P.waitForTimeout(1500);
  const r0 = await P.evaluate(() => { renderVisibleTiles(); return { els: document.querySelectorAll("#mapworld .mon-map").length, vis: Object.keys(monVisible).length, energy: game.monsterEnergy(), maxBeat: game.state.monsters.maxBeat }; });
  if (SH) await P.screenshot({ path: SH + "/map.png" });
  /* Search: Dark Knight Lv1 -> jumps + opens the card */
  await P.click("#mapSearchBtn"); await P.waitForTimeout(300);
  if (SH) await P.screenshot({ path: SH + "/search.png" });
  await P.click('#monSearchSheet [data-type="knight"]'); await P.click("#msGo"); await P.waitForTimeout(1500);
  const r1 = await P.evaluate(() => { const ov = document.getElementById("monCardOverlay"); const m = monCardId && monById(monCardId); return { card: !!(ov && ov.style.display === "flex"), m, btns: ov ? [...ov.querySelectorAll(".mon-fm button")].map((b) => b.textContent + (b.disabled ? " [off]" : "")) : [] }; });
  if (SH) await P.screenshot({ path: SH + "/card_empty.png" });
  /* give Formation 1 some troops + Gareth, reopen */
  const r2 = await P.evaluate(() => { game.state.troops.infantry = 2000; const f = game.state.formations[0]; f.troops = { infantry: 2000, archer: 0, cavalry: 0 }; f.heroKeys = ["gareth"]; game.formSync(); renderMonsterCard(); const ov = document.getElementById("monCardOverlay"); return [...ov.querySelectorAll(".mon-fm button")].map((b) => b.textContent + (b.disabled ? " [off]" : "")); });
  if (SH) await P.screenshot({ path: SH + "/card.png" });
  const target = r1.m;
  const before = await P.evaluate(() => ({ food: game.state.resources.food, wood: game.state.resources.wood, valor: game.state.idle.valor, inf: game.state.troops.infantry }));
  await P.click('#monCardOverlay .mon-fm button[data-f="0"]'); await P.waitForTimeout(300);
  const r3 = await P.evaluate(() => { const m = game.state.marches[0]; return { marches: game.state.marches.length, monster: m && m.monster, energy: game.monsterEnergy(), card: document.getElementById("monCardOverlay").style.display }; });
  /* skip the walk: arrive now, then the 5 s action, then home */
  await P.evaluate(() => { const m = game.state.marches[0]; m.arriveAt = Date.now() - 10; });
  await P.waitForTimeout(3000);
  await P.evaluate(() => { const m = game.state.marches[0]; if (m && m.actionEnd) m.actionEnd = Date.now() - 10; });
  await P.waitForTimeout(2000);
  await P.evaluate(() => { const m = game.state.marches[0]; if (m && m.returnAt) m.returnAt = Date.now() - 10; });
  await P.waitForTimeout(2000);
  const r4 = await P.evaluate((tid) => { renderVisibleTiles(); const rp = game.state.battleReports[0]; return { marches: game.state.marches.length, rep: rp && { type: rp.tileType, lvl: rp.tileLevel, win: rp.win, loot: rp.loot, valor: rp.valor, atk: rp.atkPower, def: rp.defPower, wounded: rp.woundedSent }, maxBeat: game.state.monsters.maxBeat, killed: Object.keys(game.state.monsters.kills).length, stillShown: Object.keys(monVisible).some((k) => monVisible[k].tileId === tid), food: game.state.resources.food, wood: game.state.resources.wood, valor: game.state.idle.valor, inf: game.state.troops.infantry, wounded: game.state.wounded, energy: game.monsterEnergy() }; }, target.tileId);
  if (SH) { await P.evaluate(() => { try { setScreen("reports"); } catch (e) {} }); await P.waitForTimeout(500); await P.screenshot({ path: SH + "/report.png" }); }
  /* no energy -> can't send */
  const lbl = await P.evaluate(() => reportTargetLabel(game.state.battleReports[0]));
  await P.evaluate(() => { try { setScreen("world"); } catch (e) {} }); await P.click("#mapSearchBtn"); await P.click('#monSearchSheet [data-tab="res"]'); await P.click('#monSearchSheet [data-res="wood"]'); await P.click("#msGo"); await P.waitForTimeout(1200);
  const rs = await P.evaluate(() => { const t = selectedTile && mapTileById(game.state.map, selectedTile); return t ? t.type + "/" + t.resourceType : null; });
  const r5 = await P.evaluate(() => { game.state.monsters.energy = 5; game.state.monsters.energyT = Date.now(); const m = Object.values(monVisible)[0] || { id: "x", type: "rhino", level: 1, tileId: game.state.homeTileId.split(",").map((v, i) => +v + (i ? 5 : 5)).join(","), ep: 0 }; return game.sendMarch({ infantry: 10 }, m.tileId, "attack", [], 1, { id: "zz", type: "rhino", level: 1 }); });
  console.log(JSON.stringify({ r0, r1: { card: r1.card, m: r1.m, btns: r1.btns }, r2, before, r3, r4, r5, errs }, null, 1));
  await b.close();
  assert.deepStrictEqual(errs, []);
  assert(r1.card && target && target.type === "knight" && target.level === 1, "Search found / called up a Lv1 Dark Knight and opened its card");
  assert(r3.marches === 1 && r3.monster && r3.energy === 90 && r3.card === "none", "attack sent, 10 energy spent, card closed");
  assert(r4.rep && r4.rep.type === "monster" && r4.rep.win, "won the fight, report written");
  assert(r4.maxBeat === 1 && r4.killed === 1 && !r4.stillShown, "level 1 beaten, monster gone from the map");
  assert(r4.food > before.food && r4.valor > before.valor, "rewards paid");
  assert.strictEqual(r4.marches, 0, "march came home");
  assert.strictEqual(r5.ok, false); assert.strictEqual(r5.reason, "no_energy");
  assert.strictEqual(lbl, "👹 Level 1 Dark Knight", "report title");
  assert.strictEqual(rs, "resource/wood", "Resources search selects the nearest wood node");
  console.log("g331 ok");
})().catch((e) => { console.error(e); process.exit(1); });
