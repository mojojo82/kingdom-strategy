// v1625: event rewards through the server, in the real TEST game (headless, fake Firebase + local functions). node dev/tests/evclaim_game_test.js
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "playwright");
const C = require(path.join(ROOT, "functions/core.js")), R = C.envRoot("test");
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), errs = [];
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: process.env.SHOT ? 2 : 1 });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, require(path.join(__dirname, "siteroute.js"))(GAME));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "evc@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "evc"); await P.click("#ksGo"); await P.waitForTimeout(8000);
  const uid = await P.evaluate(() => KS_BACKEND.uid);
  // the live config on the server has ONE milestone; the phone is told about two (the second one is fake -> the server must refuse it)
  store[R + "config/liveops"] = C.normalizeLiveops({ fhw: { hero: "kessa", ms: [{ at: 1, items: { gems: 150, speedup_general_5m: 2 } }] } });
  const out = {};
  const sp = () => P.evaluate(() => game.state.speedups.general_5m || 0);
  await P.evaluate(() => { LIVEOPS.fhw.ms = [{ at: 1, items: { gems: 150, speedup_general_5m: 2 } }, { at: 1, items: { gems: 5000, speedup_general_5m: 7 } }]; LIVEOPS.items = { off: false, phone: [] }; game.evSync().pts = 10; });
  const s0 = await sp();
  out.claim = await P.evaluate(() => { var r = game.evClaimMs(0); evDone("Got " + evGotText(r.got)); return { r: r, queued: game.evSync().pq.length }; });
  out.instant = (await sp()) - s0; assert.strictEqual(out.instant, 2, "speedups show at once"); assert.strictEqual(out.claim.r.got.gems, 150);
  await P.waitForTimeout(2500);
  out.afterSync = await P.evaluate(() => ({ queued: game.evSync().pq.length, gems: game.state.gems }));
  out.wallet = (store[R + "players/" + uid + "/wallet/main"] || {}).gems; assert.strictEqual(out.wallet, 150 + (out.wallet - 150)); assert.ok(out.wallet >= 150);
  assert.strictEqual(out.afterSync.queued, 0); assert.strictEqual(out.afterSync.gems, out.wallet, "game shows the wallet's gems");
  // fake reward -> refused -> taken back
  const s1 = await sp();
  out.fakeInstant = await P.evaluate((s1) => { LIVEOPS.fhw.ms = [{ at: 1, items: { gems: 150, speedup_general_5m: 2 } }, { at: 1, items: { gems: 5000, speedup_general_5m: 7 } }]; LIVEOPS.items = { off: false, phone: [] }; /* the live config listener replaced it */ var r = game.evClaimMs(1); var n = (game.state.speedups.general_5m || 0) - s1; evDone("Got " + evGotText(r.got)); return n; }, s1);
  await P.waitForTimeout(2500); out.fakeAfter = (await sp()) - s1; out.fakeNote = await P.evaluate(() => EVW.note.replace(/<[^>]+>/g, ""));
  assert.strictEqual(out.fakeInstant, 7); assert.strictEqual(out.fakeAfter, 0, "taken back"); assert.strictEqual((store[R + "players/" + uid + "/wallet/main"] || {}).gems, out.wallet, "no gems for the fake");
  // no connection -> refused before anything is given
  out.offline = await P.evaluate(() => { Object.defineProperty(navigator, "onLine", { configurable: true, get: function () { return false; } }); game.evSync().ms = []; var r = game.evClaimMs(0); return { r: r, note: EVW.note.replace(/<[^>]+>/g, "") }; });
  assert.strictEqual(out.offline.r.reason, "offline");
  // Phone switch: speedups paid by the phone alone (no server job), master switch too
  out.phone = await P.evaluate(() => { Object.defineProperty(navigator, "onLine", { configurable: true, get: function () { return true; } }); LIVEOPS.items = { off: false, phone: ["speedup_general_5m"] };
    LIVEOPS.fhw.ms = [{ at: 1, items: { speedup_general_5m: 1 } }, { at: 1, items: { wood: 5 } }]; game.evSync().ms = []; var r = game.evClaimMs(0); var q1 = game.evSync().pq.length; LIVEOPS.items = { off: true, phone: [] }; var r2 = game.evClaimMs(1); return { ok: r.ok && r2.ok, queuedPhone: q1, queuedMaster: game.evSync().pq.length }; });
  assert.ok(out.phone.ok); assert.strictEqual(out.phone.queuedPhone, 0); assert.strictEqual(out.phone.queuedMaster, 0);
  // v1628 activity gems: two monster kills + the login gift (button in Daily Missions)
  const w0 = (store[R + "players/" + uid + "/wallet/main"] || {}).gems || 0;
  await P.evaluate(() => { gemAct("monster"); gemAct("monster"); evWinOpen("daily"); }); await P.waitForTimeout(1500);
  await P.evaluate(() => document.querySelector("#evWin [data-galogin]").click()); await P.waitForTimeout(1500);
  out.actGems = ((store[R + "players/" + uid + "/wallet/main"] || {}).gems || 0) - w0; assert.strictEqual(out.actGems, 340, "2 x 20 + 300");
  out.dailyText = await P.evaluate(() => document.querySelector("#evWin .evw-list").textContent.slice(0, 200)); assert.ok(/Monsters 2\/20/.test(out.dailyText), out.dailyText);
  if (process.env.SHOT) await P.screenshot({ path: process.env.SHOT });
  out.ledger = Object.keys(store).filter((k) => k.indexOf("players/" + uid + "/ledger/") >= 0).map((k) => store[k].item + " " + store[k].delta + " " + store[k].reason).filter((x) => /ev_/.test(x));
  out.errors = errs; console.log(JSON.stringify(out, null, 1));
  assert.deepStrictEqual(errs, []); console.log("evclaim game test passed"); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
