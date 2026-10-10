/* v1048: march ship skin per formation (Skins > Marches); the march carries it, it is shared, and the 3D ship is drawn with it. Run: node dev/simfork/g249_march_skins.js */
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
  await P.fill("#ksE", "g249@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Emp"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const o = {};
  await P.evaluate(() => { setScreen("more", "skins"); skinsTab = "march"; renderSkinsScreen(); }); await P.waitForTimeout(600);
  o.forms = await P.evaluate(() => [...document.querySelectorAll("#skinsPanel .sk-form, #skinsModeContent .sk-form")].map((e) => e.textContent).slice(0, 3));
  await P.evaluate(() => { document.querySelectorAll(".sk-form")[1].click(); }); await P.waitForTimeout(200);
  await P.evaluate(() => { [...document.querySelectorAll(".lb2-row")].find((r) => r.getAttribute("data-id") === "voidspire_crimson").click(); }); await P.waitForTimeout(300);
  await P.screenshot({ path: (process.env.OUT || "/tmp/") + "march_skins.png" });
  o.saved = await P.evaluate(() => game.state.formations.map((f) => formationMarchSkin(f)));
  /* send formation 2 to a resource tile through the real attack form */
  o.march = await P.evaluate(async () => { const st = game.state; st.troops.infantry = 500; st.formations[1].troops = { infantry: 50, archer: 0, cavalry: 0 }; setScreen("world");
    const h = tileXY(st.homeTileId); let t = null; for (let r = 2; r < 15 && !t; r++) for (let dx = -r; dx <= r && !t; dx++) { const tt = mapTileById(st.map, (h[0] + dx) + "," + (h[1] + r)); if (tt && tt.type === "resource") t = tt; }
    selectedTile = t.id; renderTileInfo(); await new Promise((r) => setTimeout(r, 300));
    const btn = [...document.querySelectorAll(".formation-attack-btn")][1]; btn.click(); await new Promise((r) => setTimeout(r, 300));
    const m = st.marches[st.marches.length - 1]; return m && m.skin; });
  o.ships = await P.evaluate(async () => { const orig = marchGLDraw; let seen = null; window.marchGLDraw = function (ships, u) { if (ships.length) seen = ships.map((s) => s.skin); return orig.apply(this, arguments); }; updateMarchMarkers(); await new Promise((r) => setTimeout(r, 400)); updateMarchMarkers(); return seen; });
  await P.waitForTimeout(3000);
  o.published = Object.entries(store).filter(([k]) => /\/marches\//.test(k)).map(([, v]) => v.skin);
  o.foreign = await P.evaluate(() => { worldMarches["other_1"] = { ownerId: "other", ownerName: "X", skin: "voidspire_gilded", tileId: game.state.marches[0].tileId, homeTileId: game.state.homeTileId, arriveAt: vnow() + 60000, actionEnd: vnow() + 65000, returnAt: vnow() + 120000, travelSec: 60 }; return foreignMarchList(vnow()).map((m) => m.skin); });
  console.log(JSON.stringify(o), errs);
  assert.strictEqual(o.forms.length, 3);
  assert.deepStrictEqual(o.saved.slice(0, 3), ["voidspire", "voidspire_crimson", "voidspire"], "skin saved on formation 2 only");
  assert.strictEqual(o.march, "voidspire_crimson", "the march carries its formation's skin");
  assert.ok(o.ships === null || o.ships.includes("voidspire_crimson"), "3D layer gets the skin (when WebGL is available)");
  assert.ok(o.published.includes("voidspire_crimson"), "shared march record has the skin");
  assert.deepStrictEqual(o.foreign, ["voidspire_gilded"], "other players' marches show their skin");
  assert.deepStrictEqual(errs, []);
  await b.close(); console.log("g249 OK");
})().catch((e) => { console.error(e); process.exit(1); });
