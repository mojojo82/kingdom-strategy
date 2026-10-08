/* v951: foam + ripples round bases on the sea, Dev Tools switch, and the new Watchtower II skin (unlocked for everyone). Run: node dev/simfork/g200_base_water.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const OUT = process.env.OUT || "/tmp/";
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
  await P.fill("#ksE", "g200@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Wet"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => setScreen("world")); await P.waitForTimeout(2500);
  const look = () => P.evaluate(() => { const d = document.querySelector(".tile.mycity"), w = d && d.querySelector(".city-water"), im = d && d.querySelector(".city-icon-img");
    if (!w) return { water: false };
    const a = w.getBoundingClientRect(), c = im.getBoundingClientRect();
    return { water: true, centre: Math.round((a.left + a.right) / 2 - (c.left + c.right) / 2), belowBase: Math.round(a.bottom - c.bottom), wider: a.width > c.width, firstChildIsWater: d.querySelector(".tile-up").firstElementChild === w }; });
  /* 1. on by default, lined up under the base, on open sea */
  let L = await look(); console.log("default:", JSON.stringify(L));
  assert.ok(L.water && L.firstChildIsWater && L.wider && Math.abs(L.centre) <= 2 && L.belowBase > 0, "water layer behind the base");
  /* 2. it moves */
  const tr = () => P.evaluate(() => getComputedStyle(document.querySelector(".tile.mycity .city-water img")).transform);
  const t1 = await tr(); await P.waitForTimeout(370); const t2 = await tr(); console.log("moving:", t1, "->", t2); assert.notStrictEqual(t1, t2, "animates");
  /* 3. Watchtower II: listed, unlocked for a normal player, gets water too */
  const sk = await P.evaluate(() => ({ order: CITY_SKIN_ORDER.slice(), owned: citySkinOwned("tower2"), label: CITY_SKINS.tower2.label, admin: !!(window.KS_BACKEND && window.KS_BACKEND.isAdmin) }));
  console.log("skins:", JSON.stringify(sk)); assert.ok(!sk.admin && sk.owned && sk.label === "Watchtower II" && sk.order[0] === "tower" && sk.order.indexOf("tower2") === 1);
  await P.evaluate(() => setMapCitySkin("tower2")); await P.waitForTimeout(1200);
  L = await look(); assert.ok(L.water && Math.abs(L.centre) <= 2, "tower2 water " + JSON.stringify(L));
  assert.ok(await P.evaluate(() => /UklGR/.test(document.querySelector(".tile.mycity .city-icon-img").src) && myCitySkinId() === "tower2"), "tower2 art on the map");
  await P.screenshot({ path: OUT + "g200_tower2.png" });
  /* 4. land next to the base -> no water */
  await P.evaluate(() => { terrainEnsure(); const h = mapTileById(game.state.map, game.state.homeTileId); terrainArr[(h.y + 2) * terrainN + h.x + 1] = 1; renderVisibleTiles(); }); await P.waitForTimeout(300);
  L = await look(); console.log("with land:", JSON.stringify(L)); assert.ok(!L.water, "no water next to land");
  await P.evaluate(() => { const h = mapTileById(game.state.map, game.state.homeTileId); terrainArr[(h.y + 2) * terrainN + h.x + 1] = 0; renderVisibleTiles(); }); await P.waitForTimeout(300);
  assert.ok((await look()).water, "back on open sea");
  /* 5. Dev Tools switch turns it off (and remembers) */
  await P.evaluate(() => { const el = document.getElementById("devBaseWaterToggle"); el.checked = false; el.onchange(); }); await P.waitForTimeout(300);
  assert.ok(!(await look()).water, "switched off"); assert.strictEqual(await P.evaluate(() => localStorage.getItem("kingdom_baseWater_v1")), "0");
  await P.evaluate(() => { const el = document.getElementById("devBaseWaterToggle"); el.checked = true; el.onchange(); }); await P.waitForTimeout(300);
  assert.ok((await look()).water, "back on");
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
