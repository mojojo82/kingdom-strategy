/* v1247 (Harley: "time to evolve"): City > Buildings is the oil rig - rooms with level badges, a tap card over the next room, Build/Upgrade from the card, List toggle. Run: node dev/simfork/g341_rig_city.js */
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
  await P.fill("#ksE", "g341@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Rig"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  const SH = process.env.SHOTS;
  await P.evaluate(() => { try { localStorage.removeItem("kingdom_bld_view_v1"); } catch (e) {} setScreen("city", "buildings"); render(); }); await P.waitForTimeout(900);
  const a = await P.evaluate(() => ({ rig: !!document.querySelector("#rigView .rig-scene img"), rooms: document.querySelectorAll("#rigView .rig-room").length,
    listHidden: getComputedStyle(document.getElementById("buildingsList")).display === "none",
    th: document.querySelector('.rig-room[data-rk="townhall"]').textContent, farm: document.querySelector('.rig-room[data-rk="farm"]').textContent,
    quarryLocked: document.querySelector('.rig-room[data-rk="quarry"]').classList.contains("locked"),
    sea: (function () { var c = document.querySelector("#rigView canvas"); return c.width > 0 && c.height > 0; })(),
    edge: (function () { var r = document.querySelector("#rigView .rig-scene").getBoundingClientRect(); return { l: Math.round(r.left), w: Math.round(r.width), vw: innerWidth }; })(),
    h2: getComputedStyle(document.querySelector("#buildingsModeContent > h2")).display, tabsIn: document.getElementById("bldViewTabs").parentNode.id }));
  if (SH) await P.screenshot({ path: SH + "/g341_rig.png", fullPage: false });
  /* v1250: the animated sea - plays on the city, sits on the water line, pauses when you leave */
  await P.waitForTimeout(1200);
  const w = await P.evaluate(() => { const v = document.getElementById("rigWaves"), sc = document.querySelector("#rigView .rig-scene"), img = sc.querySelector(".rig-wrap > img");
    const WL = img.parentNode.offsetTop + img.offsetHeight * RIG_WL, line = parseFloat(v.style.top) + parseFloat(v.style.height) * RIG_WAVES_LINE / RIG_WAVES_H;
    return { has: !!v, src: v.currentSrc.slice(0, 16), playing: !v.paused && v.currentTime > 0.2, muted: v.muted, lineOff: Math.round(Math.abs(line - WL)), wide: Math.round(v.getBoundingClientRect().width) === sc.clientWidth }; });
  await P.evaluate(() => { setScreen("world"); render(); }); await P.waitForTimeout(400);
  w.pausedAway = await P.evaluate(() => document.getElementById("rigWaves").paused);
  await P.evaluate(() => { setScreen("city", "buildings"); render(); }); await P.waitForTimeout(600);
  w.playsAgain = await P.evaluate(() => !document.getElementById("rigWaves").paused);
  console.log("waves", JSON.stringify(w));
  assert(w.has && w.playing && w.muted && w.lineOff <= 1 && w.wide && w.pausedAway && w.playsAgain, "v1250 waves: play, on the water line, full width, pause away, play again");
  /* tap the Farm room -> its card, Build */
  await P.click('.rig-room[data-rk="farm"]'); await P.waitForTimeout(300);
  const bb = await P.evaluate(() => { var c = document.getElementById("rigCard"), r = c.getBoundingClientRect(), s = document.querySelector('.rig-room[data-rk="sawmill"]').getBoundingClientRect();
    return { shown: c.style.display !== "none", txt: c.textContent, overSawmill: Math.abs(r.left - s.left) < 30 && Math.abs(r.top - s.top) < 30 }; });
  if (SH) await P.screenshot({ path: SH + "/g341_card.png" });
  await P.click('#rigCard [data-rigact="farm"]'); await P.waitForTimeout(400);
  await P.evaluate(() => render()); await P.waitForTimeout(200);
  const c = await P.evaluate(() => ({ up: !!game.state.buildings.farm.upgrading, badge: document.querySelector('.rig-room[data-rk="farm"]').textContent, card: document.getElementById("rigCard").textContent }));
  /* a locked room explains what it needs; the right-hand room's card goes over the left room */
  await P.click('#rigCard [data-rigx]'); await P.waitForTimeout(200);
  await P.click('.rig-room[data-rk="goldmine"]'); await P.waitForTimeout(300);
  const d = await P.evaluate(() => { var c = document.getElementById("rigCard"), r = c.getBoundingClientRect(), q = document.querySelector('.rig-room[data-rk="quarry"]').getBoundingClientRect(); return { txt: c.textContent, overQuarry: Math.abs(r.left - q.left) < 30 }; });
  /* the engine room = Town Hall, card above it */
  await P.click('.rig-room[data-rk="townhall"]'); await P.waitForTimeout(300);
  const e = await P.evaluate(() => { var c = document.getElementById("rigCard"), r = c.getBoundingClientRect(), t = document.querySelector('.rig-room[data-rk="townhall"]').getBoundingClientRect(); return { txt: c.textContent, above: r.top < t.top }; });
  if (SH) await P.screenshot({ path: SH + "/g341_th.png" });
  /* tap the same room again closes the card */
  await P.click('.rig-room[data-rk="townhall"]', { position: { x: 20, y: 20 } }); await P.waitForTimeout(200);
  const f = await P.evaluate(() => document.getElementById("rigCard").style.display);
  /* List toggle and back */
  await P.click('#bldViewTabs [data-bv="list"]'); await P.waitForTimeout(300);
  const g = await P.evaluate(() => ({ tabsOut: document.getElementById("bldViewTabs").parentNode.id, h2: getComputedStyle(document.querySelector("#buildingsModeContent > h2")).display, list: document.querySelectorAll("#buildingsList .bld").length, rigHidden: document.getElementById("rigView").style.display === "none", saved: localStorage.getItem("kingdom_bld_view_v1") }));
  await P.click('#bldViewTabs [data-bv="rig"]'); await P.waitForTimeout(300);
  const h = await P.evaluate(() => document.getElementById("rigView").style.display !== "none" && getComputedStyle(document.getElementById("buildingsList")).display === "none" && document.getElementById("bldViewTabs").parentNode.id === "rigView");
  console.log(JSON.stringify({ a, bb, c, d, e, f, g, h, errs }));
  await b.close();
  assert.deepStrictEqual(errs, []);
  assert(a.rig && a.rooms === 13 && a.listHidden && a.sea, "rig shown with 13 rooms, list hidden, sea drawn");
  assert(a.edge.l === 0 && a.edge.w === a.edge.vw && a.h2 === "none" && a.tabsIn === "rigView", "v1248: rig fills the screen edge to edge, no header, toggle on the sky");
  assert(g.tabsOut === "buildingsModeContent" && g.h2 !== "none", "List view gets its header and toggle back");
  assert(/Lv 1/.test(a.th) && /Build/.test(a.farm) && a.quarryLocked, "badges: Town Hall Lv 1, Farm Build, Quarry locked");
  assert(bb.shown && /Farm/.test(bb.txt) && /Build/.test(bb.txt) && bb.overSawmill, "Farm card over the Sawmill");
  assert(c.up && /⏳/.test(c.badge) && /Upgrading/.test(c.card), "Build from the card starts it, badge shows the timer");
  assert(/Requires Town Hall/.test(d.txt) && d.overQuarry, "Gold Mine card shows its requirement, over the Quarry");
  assert(/Town Hall/.test(e.txt) && e.above, "Town Hall card above the engine room");
  assert.strictEqual(f, "none", "tap again closes");
  assert(g.list >= 13 && g.rigHidden && g.saved === "list" && h, "List toggle works and back");
  console.log("g341 ok");
})().catch((e) => { console.error(e); process.exit(1); });
