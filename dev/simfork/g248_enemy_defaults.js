/* v1046: built-in archer/lancer come back when the phone copy was deleted (and the one-time seeding had already run). Run: node dev/simfork/g248_enemy_defaults.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 } });
  await ctx.addInitScript(() => { try { if (!sessionStorage.getItem("s1")) { sessionStorage.setItem("s1", "1"); localStorage.setItem("kingdom_prototype_ownerDefaultsSeeded_v1", "1"); } } catch (e) {} });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "g248@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Emp"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const o = await P.evaluate(() => ({ archer: enemyArcherSpriteSlot.get() === OWNER_DEFAULTS.kingdom_prototype_enemyarcher_v1, lancer: enemyLancerSpriteSlot.get() === OWNER_DEFAULTS.kingdom_prototype_enemylancer_v1,
    afterDelete: (localStorage.removeItem("kingdom_prototype_enemylancer_v1"), enemyLancerSpriteSlot.get() === OWNER_DEFAULTS.kingdom_prototype_enemylancer_v1) }));
  console.log(JSON.stringify(o), errs);
  assert.deepStrictEqual(o, { archer: true, lancer: true, afterDelete: true });
  assert.deepStrictEqual(errs, []);
  await b.close(); console.log("g248 OK");
})().catch((e) => { console.error(e); process.exit(1); });
