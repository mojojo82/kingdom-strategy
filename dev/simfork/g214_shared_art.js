/* v982: art is an admin tool shared by every player (only the avatar is personal): non-admins can't upload and see only the shared copy; an admin's upload goes to the shared area; the admin's own old per-player art fills empty shared keys. Run: node dev/simfork/g214_shared_art.js */
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
  await P.fill("#ksE", "g214@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Emp"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.waitForTimeout(2000);
  const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  const r = await P.evaluate(async (PNG) => {
    const K = window.KS_BACKEND, wait = (ms) => new Promise((res) => setTimeout(res, ms)), dump = async () => JSON.parse(await window.__fbstore("get"));
    const o = { shared: assetIsShared("kingdom_prototype_heroart_v1_gareth"), avatarShared: assetIsShared(AVATAR_KEY), settingShared: assetIsShared("kingdom_prototype_enemyinfantryflip_v1") };
    /* non-admin: upload ignored, tap does nothing, a stale local copy is not shown */
    K.isAdmin = false; K.adminChecked = true;
    try { localStorage.setItem("kingdom_prototype_heroart_v1_lyra", PNG); } catch (e) {}
    assetSyncUpload("kingdom_prototype_heroart_v1_lyra", PNG); await wait(800);
    o.nonAdminWrote = Object.keys(await dump()).some((k) => /assetitems\/kingdom_prototype_heroart_v1_lyra$/.test(k));
    o.nonAdminSees = getHeroArt("lyra") === PNG ? "own" : (getHeroArt("lyra") === ((typeof OWNER_DEFAULTS !== "undefined" && OWNER_DEFAULTS["kingdom_prototype_heroart_v1_lyra"]) || null) ? "default" : "other"); o.canEdit = assetCanEditArt();
    /* admin: upload goes to the shared area + shared index */
    K.isAdmin = true;
    setCardArt(5, PNG); await wait(1500);
    const st = await dump(), sk = Object.keys(st);
    o.adminShared = sk.some((k) => /(^|\/)assetitems\/kingdom_prototype_cardart_v1_5$/.test(k) && !/players\//.test(k));
    const idxKey = sk.find((k) => /assetitems\/_shared_index$/.test(k)); o.indexHas = !!(idxKey && st[idxKey].keys.indexOf("kingdom_prototype_cardart_v1_5") !== -1);
    /* migration: art on the admin's own account (old per-player copy) is copied into an empty shared key */
    await assetSyncDb.doc(assetSyncPersonalDocIdFor("kingdom_prototype_heroart_v1_roran")).set({ data: PNG, ts: 1 });
    await assetSyncDb.doc(assetSyncIndexDoc()).set({ keys: ["kingdom_prototype_heroart_v1_roran", AVATAR_KEY] });
    K.adminChecked = true; assetSyncLoadShared(); await wait(2500);
    const st2 = await dump(); o.migrated = Object.keys(st2).some((k) => /assetitems\/kingdom_prototype_heroart_v1_roran$/.test(k) && !/players\//.test(k));
    /* a non-admin now sees the admin's card picture */
    K.isAdmin = false; o.playerSeesCard = getCardArt(5) === PNG;
    return o;
  }, PNG);
  console.log(JSON.stringify(r));
  assert.ok(r.shared && !r.avatarShared && !r.settingShared, "art keys are shared; the avatar and small settings are not");
  assert.ok(!r.nonAdminWrote && r.nonAdminSees === "default" && !r.canEdit, "a non-admin can't upload art and doesn't see a personal copy");
  assert.ok(r.adminShared && r.indexHas, "an admin's upload goes to the shared area and its index");
  assert.ok(r.playerSeesCard, "every player sees the admin's art");
  assert.ok(r.migrated, "the admin's own old art is copied into the shared area");
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
