/* Save import: a player opens the game (gets a Firebase save + map spot), closes it; admin imports the old claude.ai owner save into that
   account from the admin panel; the game reopens on the imported save with its map spot kept and the custom art loaded.
   Run: SAVEFILE=/path/kingdom_owner_save.json node dev/simfork/g199_import_save.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const OUT = process.env.OUT || "/tmp/";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
function uidFor(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return "u" + (h >>> 0).toString(36) + "xx"; }
const EMAIL = "owner@test.dev", PUID = uidFor(EMAIL);
require(path.join(ROOT, "functions/admins.json")).push(PUID); /* this test's player is an admin (only in this process) */
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store), ADMIN = PUID;
const BUNDLE = JSON.parse(fs.readFileSync(process.env.SAVEFILE, "utf8"));
const STUB = `window.firebase = { initializeApp: function () {}, auth: Object.assign(function () { return { useEmulator: function () {}, signOut: function () {}, signInWithPopup: function () { return Promise.resolve(); },
  onAuthStateChanged: function (cb) { setTimeout(function () { cb({ uid: "${ADMIN}", email: "admin@test.dev", isAnonymous: false, getIdTokenResult: function () { return Promise.resolve({}); } }); }, 50); } }; }, { GoogleAuthProvider: function () {} }),
  app: function () { return { functions: function () { return { useEmulator: function () {}, httpsCallable: function (name) { return function (data) {
    return window.__fbcall(name, JSON.stringify(data), JSON.stringify({ uid: "${ADMIN}", token: { firebase: { sign_in_provider: "google.com" } } })).then(function (s) { var r = JSON.parse(s); if (r.error) throw new Error(r.error.message); return { data: r.data }; }); }; } }; } }; } };`;
async function gameCtx(b) {
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 } });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  return ctx;
}
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  /* 1. the account exists on Firebase already (fresh save + map spot) */
  let ctx = await gameCtx(b), P = await ctx.newPage(); P.on("pageerror", (e) => errs.push("game1: " + e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", EMAIL); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Harley"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  const before = await P.evaluate(() => ({ uid: PLAYER_ID, home: game.state.homeTileId, th: game.state.buildings.townhall.level, server: game.state.serverId }));
  console.log("before:", JSON.stringify(before)); assert.strictEqual(before.uid, PUID);
  await ctx.close();
  const SP = "envs/test/players/" + PUID + "/";
  assert.ok(store[SP + "save/main"], "has a Firebase save");
  /* 2. admin panel import */
  const ac = await b.newContext({ viewport: { width: 1200, height: 900 } });
  await ac.exposeFunction("__fbcall", call);
  await ac.route(/gstatic\.com\/firebasejs\/.*app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: STUB }));
  await ac.route(/gstatic\.com\/firebasejs\/.*(auth|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ac.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await ac.route(/admin\.test\//, (r) => r.fulfill({ status: 200, contentType: "text/html", body: fs.readFileSync(path.join(ROOT, "admin/index.html"), "utf8") }));
  const A = await ac.newPage(); A.on("pageerror", (e) => errs.push("admin: " + e.message)); A.on("dialog", (d) => d.accept());
  await A.goto("https://admin.test/"); await A.waitForSelector("#app:not(.hide)", { timeout: 10000 }); await A.waitForTimeout(400);
  await A.setInputFiles("#impFile", process.env.SAVEFILE); await A.waitForTimeout(800);
  const sum = await A.evaluate(() => document.getElementById("impSum").textContent); console.log("summary:", sum);
  assert.ok(/Town Hall 8/.test(sum) && /11900/.test(sum) && /47 art/.test(sum), sum);
  await A.click("#impGo"); await A.waitForFunction(() => /Imported/.test(document.getElementById("impGo").textContent) || !document.getElementById("impGo").disabled, null, { timeout: 30000 });
  const btn = await A.evaluate(() => document.getElementById("impGo").textContent); console.log("button:", btn, "| toast:", await A.evaluate(() => document.getElementById("toast").textContent));
  assert.ok(/Imported/.test(btn));
  await A.screenshot({ path: OUT + "admin_import.png" }); await ac.close();
  const sv = store[SP + "save/main"]; assert.strictEqual(sv.buildings.townhall.level, 8); assert.strictEqual(sv.homeTileId, before.home, "map spot kept");
  assert.ok(Object.keys(store).some((k) => k.indexOf(SP + "save/backup_") === 0), "old save backed up");
  assert.strictEqual(store[SP + "wallet/main"].gems, 11900);
  assert.strictEqual(store[SP + "assets/overrides_index"].keys.length >= 47, true);
  /* 3. reopen the game: imported save + art */
  ctx = await gameCtx(b); P = await ctx.newPage(); P.on("pageerror", (e) => errs.push("game2: " + e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", EMAIL); await P.fill("#ksP", "secret123"); await P.click("#ksIn"); await P.waitForTimeout(9000);
  const after = await P.evaluate(() => ({ uid: PLAYER_ID, home: game.state.homeTileId, th: game.state.buildings.townhall.level, heroes: Object.keys(game.state.heroes).filter((k) => game.state.heroes[k].owned).length, ch: game.state.idle.chapter + "-" + game.state.idle.levelNum, gems: game.state.gems, art: Object.keys(cloudAssetMap).length, gareth: !!(cloudAssetMap.kingdom_prototype_heroart_v1_gareth || "").length }));
  console.log("after:", JSON.stringify(after));
  assert.strictEqual(after.th, 8); assert.strictEqual(after.heroes, 7); assert.strictEqual(after.home, before.home); assert.ok(after.art >= 40 && after.gareth, "art loaded");
  await P.evaluate(() => setScreen("heroes")); await P.waitForTimeout(1500); await P.screenshot({ path: OUT + "imported_heroes.png" });
  await P.evaluate(() => setScreen("city", "buildings")); await P.waitForTimeout(1200); await P.screenshot({ path: OUT + "imported_city.png" });
  /* the imported save survives the game's own next save */
  await P.evaluate(() => cloudSyncNow(true)); await P.waitForTimeout(2000); assert.strictEqual(store[SP + "save/main"].buildings.townhall.level, 8, "still TH8 after the game saves");
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
