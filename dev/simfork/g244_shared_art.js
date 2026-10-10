/* v1034/v1038: admin art (cards etc.) is the same for every player - no device shows or pushes its own copy; an upload that fails says so. Run: node dev/simfork/g244_shared_art.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const K0 = "kingdom_prototype_cardart_v1_0", K1 = "kingdom_prototype_cardart_v1_1";
const store = { "envs/test/assetitems/_shared_index": { keys: [K0] }, ["envs/test/assetitems/" + K0]: { data: "data:image/png;base64,SHARED", ts: 1 } }, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 } });
  await ctx.addInitScript(([a, b]) => { try { if (!sessionStorage.getItem("seeded")) { sessionStorage.setItem("seeded", "1"); localStorage.setItem(a, "data:image/png;base64,OLDPHONE"); localStorage.setItem(a + "__ts", String(Date.now() + 9e9)); localStorage.setItem(b, "data:image/png;base64,PHONEONLY"); } } catch (e) {} }, [K0, K1]);
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "g244@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Emp"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.waitForTimeout(1500);
  const o = {};
  o.load = await P.evaluate(([a, b]) => { const d = (k, v) => v === null || v === OWNER_DEFAULTS[k] ? null : v; return { fb: assetOnFirebase(), shown: getCardArt(0), local0: d(a, localStorage.getItem(a)), local1: d(b, localStorage.getItem(b)) }; }, [K0, K1]);
  o.defaults = await P.evaluate(() => { const D = OWNER_DEFAULTS; return { boss: getBossSprite() === D.kingdom_prototype_bosssprite_v1, kessa: getCombatSpriteOverride("kessa") === D.kingdom_prototype_combatsprite_v1_kessa, aries: getEsperGraphicOverride("aries") === D.kingdom_prototype_espergraphic_v1_aries, grass: getGrassOverlayTile() === D.kingdom_prototype_grassoverlay_v1, lyra: getHeroArt("lyra") === D.kingdom_prototype_heroart_v1_lyra, card15: getCardArt(15) === D.kingdom_prototype_cardart_v1_15 }; });
  o.cloudAfterLoad = store["envs/test/assetitems/" + K0].data;
  /* an admin phone that still has a picture the shared area doesn't have: it gets uploaded, then the phone copy goes */
  o.admin = await P.evaluate(async ([a, b]) => { KS_BACKEND.isAdmin = true; localStorage.setItem(b, "data:image/png;base64,PHONEONLY"); localStorage.setItem(a, "data:image/png;base64,OLDPHONE");
    sharedArtClearPhoneCopies(true); await new Promise((r) => setTimeout(r, 800)); const d = (k, v) => v === null || v === OWNER_DEFAULTS[k] ? null : v; return { shown0: getCardArt(0), shown1: getCardArt(1), local0: d(a, localStorage.getItem(a)), local1: d(b, localStorage.getItem(b)) }; }, [K0, K1]);
  o.cloud = { k0: store["envs/test/assetitems/" + K0].data, k1: (store["envs/test/assetitems/" + K1] || {}).data || null };
  /* admin upload that fails for good: back to the shared picture + a clear message */
  o.fail = await P.evaluate(async ([a]) => { const msgs = []; window.alert = (m) => msgs.push(m); const realDoc = assetSyncDb.doc.bind(assetSyncDb);
    assetSyncDb.doc = (pth) => { const d = realDoc(pth); if (pth === "assetitems/" + a) d.set = () => Promise.reject(new Error("network down")); return d; };
    assetSyncRetryCount[a] = 2; setCardArt(0, "data:image/png;base64,NEWFAILS"); const during = getCardArt(0); await new Promise((r) => setTimeout(r, 800));
    assetSyncDb.doc = realDoc; const v = localStorage.getItem(a); return { during, after: getCardArt(0), msgs, local: v === OWNER_DEFAULTS[a] ? null : v }; }, [K0]);
  /* admin upload that works: everyone's copy changes, nothing kept on the phone */
  o.ok = await P.evaluate(async ([a]) => { setCardArt(0, "data:image/png;base64,NEWGOOD"); await new Promise((r) => setTimeout(r, 800)); const v = localStorage.getItem(a); return { shown: getCardArt(0), local: v === OWNER_DEFAULTS[a] ? null : v }; }, [K0]);
  o.cloudOk = store["envs/test/assetitems/" + K0].data;
  console.log(JSON.stringify(o), errs);
  assert.ok(o.load.fb, "on Firebase");
  assert.deepStrictEqual(o.defaults, { boss: true, kessa: true, aries: true, grass: true, lyra: true, card15: true }, "built-in default art still shows when nothing is uploaded (v1038)");
  assert.strictEqual(o.load.shown, "data:image/png;base64,SHARED", "the shared picture shows, not the phone's newer-stamped copy");
  assert.strictEqual(o.cloudAfterLoad, "data:image/png;base64,SHARED", "the phone copy was NOT pushed over the shared one");
  assert.ok(o.load.local0 === null && o.load.local1 === null, "old phone copies removed");
  assert.deepStrictEqual(o.admin, { shown0: "data:image/png;base64,SHARED", shown1: "data:image/png;base64,PHONEONLY", local0: null, local1: null });
  assert.deepStrictEqual(o.cloud, { k0: "data:image/png;base64,SHARED", k1: "data:image/png;base64,PHONEONLY" }, "phone-only picture filled the empty shared slot; the existing one untouched");
  assert.ok(o.fail.after === "data:image/png;base64,SHARED" && o.fail.msgs.length === 1 && /did NOT save/.test(o.fail.msgs[0]) && o.fail.local === null, "failed upload: shows what players see + says so");
  assert.ok(o.ok.shown === "data:image/png;base64,NEWGOOD" && o.ok.local === null && o.cloudOk === "data:image/png;base64,NEWGOOD", "good upload goes to the shared copy only");
  assert.deepStrictEqual(errs, []);
  await b.close(); console.log("g244 OK");
})().catch((e) => { console.error(e); process.exit(1); });
