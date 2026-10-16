/* v1231 (Harley, like High Seas Hero): Daily Tasks. World map 📋 button (above Search) with a red number when rewards are waiting; each task
   pays points + 20 gems (server) + 100 Valor + 5 tickets; chests at 20/40/60/80/100, the last = 300 gems (server, only after 100 points of tasks it paid).
   Real hooks checked: login, weapon tickets, arena fight (a loss counts). SHOTS=dir saves pictures. Run: node dev/simfork/g336_daily_tasks.js */
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
  await P.fill("#ksE", "g336@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Daily"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  const SH = process.env.SHOTS;
  await P.evaluate(() => { try { setScreen("world"); } catch (e) {} }); await P.waitForTimeout(1500);
  const r0 = await P.evaluate(() => { const b = document.getElementById("mapTasksBtn"), s = document.getElementById("mapSearchBtn"), bb = b.getBoundingClientRect(), sb = s.getBoundingClientRect(); return { vis: getComputedStyle(b).display !== "none", above: bb.bottom <= sb.top, left: Math.round(bb.left), badge: document.getElementById("mapTasksBadge").textContent, gems: game.state.gems }; });
  if (SH) await P.screenshot({ path: SH + "/map_button.png" });
  await P.click("#mapTasksBtn"); await P.waitForTimeout(400);
  if (SH) await P.screenshot({ path: SH + "/panel_start.png" });
  const g0 = await P.evaluate(() => game.state.gems);
  await P.click('#dailySheet [data-claim="login"]'); await P.waitForTimeout(2500);
  const r1 = await P.evaluate((g0) => ({ gemsAdded: game.state.gems - g0, pts: game.dailyPoints(), badge: document.getElementById("mapTasksBadge").textContent, note: document.getElementById("dtNote").textContent, sv: game.state.daily.sv.slice() }), g0);
  /* real hooks: 15 tickets, an arena loss */
  const r2 = await P.evaluate(() => { game.state.weaponTickets = 20; game.weaponDraw(15); try { recordArenaResult("ai", 1000); recordArenaResult("ai", 1000); recordArenaResult("player", 1000); } catch (e) { return { err: e.message }; } const L = {}; game.dailyList().forEach((t) => { L[t.id] = t.have + "/" + t.need; }); return L; });
  /* everything else done -> claim all tasks, then all chests */
  const v0 = await P.evaluate(() => ({ valor: game.state.idle.valor, tk: game.state.weaponTickets, gems: game.state.gems }));
  await P.evaluate(() => { game.DAILY_TASKS.forEach((t) => game.dailyBump(t.id, t.need)); renderDailyTasks(); updateDailyBadge(); });
  const badgeAll = await P.evaluate(() => document.getElementById("mapTasksBadge").textContent);
  if (SH) await P.screenshot({ path: SH + "/panel_claimable.png" });
  for (let i = 0; i < 12; i++) { const id = await P.evaluate(() => { const e = document.querySelector("#dailySheet [data-claim]"); return e && e.getAttribute("data-claim"); }); if (!id) break; await P.click('#dailySheet [data-claim="' + id + '"]'); await P.waitForTimeout(150); }
  await P.waitForTimeout(4000);
  for (let i = 0; i < 5; i++) { await P.click('#dailySheet [data-ch="' + i + '"]'); await P.waitForTimeout(200); }
  await P.waitForTimeout(3000);
  if (SH) await P.screenshot({ path: SH + "/panel_done.png" });
  const r3 = await P.evaluate((v0) => ({ pts: game.dailyPoints(), chests: game.state.daily.ch.slice().sort(), valor: game.state.idle.valor - v0.valor, gems: game.state.gems - v0.gems, gc: game.state.daily.gc, sv: game.state.daily.sv.length, badge: document.getElementById("mapTasksBadge").textContent, again: game.dailyClaimTask("login").reason }), v0);
  const wallet = Object.keys(store).filter((k) => /wallet\/main$/.test(k)).map((k) => store[k])[0] || {};
  /* the server refuses the gem chest before 100 server-paid points (fresh player) */
  /* next UTC day resets */
  const r4 = await P.evaluate(() => { const real = Date.now; Date.now = () => real() + 86400000; const L = game.dailyList(), out = { pts: game.dailyPoints(), login: L[0].have, claimed: L.filter((t) => t.claimed).length, chests: game.dailyChests().filter((c) => c.claimed).length }; Date.now = real; return out; });
  console.log(JSON.stringify({ r0, r1, r2, badgeAll, r3, wallet: { gems: wallet.gems, daily: wallet.daily }, r4, errs }));
  await b.close();
  assert.deepStrictEqual(errs, []);
  assert(r0.vis && r0.above && r0.left === 10, "📋 button on the world map, above Search");
  assert.strictEqual(r0.badge, "1", "login is waiting -> badge 1");
  assert.strictEqual(r1.gemsAdded, 20, "server paid 20 gems for the login task"); assert.strictEqual(r1.pts, 5); assert.strictEqual(r1.badge, ""); assert.deepStrictEqual(r1.sv, ["login"]);
  assert.strictEqual(r2.tickets, "15/15", "15 tickets drawn counts"); assert.strictEqual(r2.arena, "3/3", "arena fights count, losses too");
  assert.strictEqual(badgeAll, "11", "11 tasks waiting");
  assert.strictEqual(r3.pts, 100); assert.deepStrictEqual(r3.chests, [0, 1, 2, 3, 4]); assert.strictEqual(r3.gems, 11 * 20 + 300, "gems: 11 tasks + gem chest"); assert.strictEqual(r3.gc, true); assert.strictEqual(r3.sv, 12);
  assert.strictEqual(r3.badge, ""); assert.strictEqual(r3.again, "claimed");
  assert.strictEqual(wallet.daily.t.length, 12); assert.strictEqual(wallet.daily.c, true);
  assert.deepStrictEqual(r4, { pts: 0, login: 1, claimed: 0, chests: 0 }, "next day starts fresh");
  console.log("g336 ok");
})().catch((e) => { console.error(e); process.exit(1); });
