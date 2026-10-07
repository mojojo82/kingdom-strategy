/* v942: "new version" banner + maintenance mode in the game (server side is covered by ci/integration.test.js).
   Run: node dev/simfork/g190_updmaint.js */
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
  let remoteV = null; await ctx.route(/version\.json/, (r) => remoteV ? r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ v: remoteV }) }) : r.fulfill({ status: 404, body: "" }));
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "g190@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Upd"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const build = await P.evaluate(() => KS_BUILD);
  /* 1: same version -> no banner */
  remoteV = build; await P.evaluate(() => ksCheckVersion()); await P.waitForTimeout(500);
  assert.ok(!(await P.$("#ksUpdBanner")), "no banner when up to date");
  /* 2: newer version -> banner; Update reloads past the cache */
  remoteV = "v9999"; await P.evaluate(() => ksCheckVersion()); await P.waitForTimeout(500);
  assert.ok(await P.$("#ksUpdBanner"), "banner shows"); await P.evaluate(() => setScreen("world")); await P.waitForTimeout(300); await P.screenshot({ path: OUT + "upd_banner.png" });
  const navP = P.waitForNavigation({ timeout: 8000 }); await P.click("#ksUpdBanner button"); await navP;
  console.log("update tap ->", P.url()); assert.ok(/\?u=v9999/.test(P.url()), "reloaded with a fresh copy");
  await P.waitForTimeout(6000); remoteV = null;
  /* 3: maintenance ON -> lock screen, saving stops */
  const uid = await P.evaluate(() => PLAYER_ID);
  store["envs/test/config/maintenance"] = { on: true, msg: "Upgrading the forge", until: Date.now() + 3600e3 };
  await P.evaluate(() => window.__fbNotify && window.__fbNotify()); await P.waitForTimeout(800);
  const m1 = await P.evaluate(() => ({ ov: !!document.getElementById("ksMaint"), txt: (document.getElementById("ksMaint") || {}).textContent || "", saving: !saveLoadFailed }));
  console.log("maintenance on:", JSON.stringify(m1)); await P.screenshot({ path: OUT + "maint_screen.png" });
  assert.ok(m1.ov && /Upgrading the forge/.test(m1.txt) && /Back around/.test(m1.txt), "lock screen with message"); assert.ok(!m1.saving, "saving stopped");
  /* 4: an admin sees a bar instead and can keep playing */
  await P.evaluate(() => { KS_BACKEND.isAdmin = true; ksMaintRender(); });
  const m2 = await P.evaluate(() => ({ ov: !!document.getElementById("ksMaint"), bar: !!document.getElementById("ksMaintBar") }));
  assert.deepStrictEqual(m2, { ov: false, bar: true }, "admin bypass");
  await P.evaluate(() => { KS_BACKEND.isAdmin = false; ksMaintRender(); });
  /* 5: maintenance OFF -> the game reloads by itself */
  store["envs/test/config/maintenance"] = { on: false };
  const navP2 = P.waitForNavigation({ timeout: 8000 }); await P.evaluate(() => window.__fbNotify && window.__fbNotify()); await navP2;
  console.log("maintenance off ->", P.url()); assert.ok(/\?u=/.test(P.url()), "reloaded when maintenance ended");
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
