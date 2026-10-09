/* v995: admin Security panel - stats, live feed, players, oddities, bans, limits (save/reset), auto-rollback switch, per-player actions (suspend / rollback / ban / lift), audit log. Run: node dev/simfork/g220_admin_security.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const OUT = process.env.OUT || "/tmp/";
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store), ADMIN = require(path.join(ROOT, "functions/admins.json"))[0];
const STUB = `window.firebase = { initializeApp: function () {}, auth: Object.assign(function () { return { useEmulator: function () {}, signOut: function () {}, signInWithPopup: function () { return Promise.resolve(); },
  onAuthStateChanged: function (cb) { setTimeout(function () { cb({ uid: "${ADMIN}", email: "admin@test.dev", isAnonymous: false, getIdTokenResult: function () { return Promise.resolve({}); } }); }, 50); } }; }, { GoogleAuthProvider: function () {} }),
  app: function () { return { functions: function () { return { useEmulator: function () {}, httpsCallable: function (name) { return function (data) {
    return window.__fbcall(name, JSON.stringify(data), JSON.stringify({ uid: "${ADMIN}", token: { firebase: { sign_in_provider: "google.com" } } })).then(function (s) { var r = JSON.parse(s); if (r.error) throw new Error(r.error.message); return { data: r.data }; }); }; } }; } }; } };`;
(async () => {
  const T = Date.now(), R = "envs/test/";
  const sv = (g) => ({ resources: { food: 500, wood: 500, stone: 300, gold: g }, idle: { chapter: 1, levelNum: 1 } });
  store[R + "acplayers/cheaterX"] = { uid: "cheaterX", count: 4, status: "open", firstAt: T - 86400000, lastAt: T - 60000, snapAt: T - 90000, recent: [{ at: T - 60000, dtSec: 5, reasons: ["gold +49,999,000 in 5s (limit 109,000)"] }, { at: T - 3600000, dtSec: 9, reasons: ["wood +9,000,000 in 9s (limit 119,000)"] }] };
  store[R + "acplayers/honestYY"] = { uid: "honestYY", count: 1, status: "open", firstAt: T - 7200000, lastAt: T - 7200000, recent: [{ at: T - 7200000, dtSec: 40, reasons: ["idle.valor +60,000 in 40s (limit 54,000)"] }] };
  store[R + "acsnap/cheaterX"] = { uid: "cheaterX", at: T - 90000, save: sv(100) };
  store[R + "players/cheaterX/save/main"] = sv(5e7);
  store[R + "players/cheaterX/assetitems/kingdom_prototype_playername_v1"] = { data: "GoldDuper" };
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [], dialogs = [];
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 } });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/gstatic\.com\/firebasejs\/.*app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: STUB }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await ctx.route(/admin\.test\//, (r) => r.fulfill({ status: 200, contentType: "text/html", body: fs.readFileSync(path.join(ROOT, "admin/index.html"), "utf8") }));
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  let promptAnswer = "Duplicated gold";
  P.on("dialog", (d) => { dialogs.push(d.type() + ": " + d.message().replace(/\n+/g, " / ")); d.type() === "prompt" ? d.accept(promptAnswer) : d.accept(); });
  await P.goto("https://admin.test/"); await P.waitForSelector("#app:not(.hide)", { timeout: 10000 });
  await P.waitForFunction(() => /Flags \(24 h\)/.test(document.getElementById("secStats").textContent), null, { timeout: 10000 });
  const stats = await P.textContent("#secStats"), feed = await P.textContent("#secBody");
  console.log("stats:", stats.replace(/\s+/g, " ")); assert.ok(/Flags \(24 h\) 3/.test(stats) && /Open 2/.test(stats), stats);
  assert.ok(/GoldDuper/.test(feed) && /gold \+49,999,000/.test(feed) && /valor/.test(feed));
  await P.screenshot({ path: OUT + "admin_sec_feed.png", fullPage: false });
  const tab = async (s) => { await P.click('#secTabs [data-s="' + s + '"]'); await P.waitForTimeout(400); return (await P.textContent("#secBody")).replace(/\s+/g, " "); };
  const pl = await tab("players"); assert.ok(/GoldDuper/.test(pl) && /honestYY/.test(pl));
  const od = await tab("odd"); assert.ok(/Repeat offenders/.test(od) && /GoldDuper/.test(od) && /gold/.test(od) && /no player-tracking/.test(od));
  /* limits: change resource per-second, save, persisted in the config; then reset */
  await tab("limits");
  await P.fill('[data-lk="res.perSec"]', "120"); await P.click("#limSave"); await P.waitForTimeout(600);
  assert.strictEqual(store[R + "secconfig/main"].limits.res.perSec, 120, "limit saved");
  assert.ok(/✱/.test(await P.textContent("#secBody")), "changed limit marked");
  await P.click("#limReset"); await P.waitForTimeout(600); assert.deepStrictEqual(store[R + "secconfig/main"].limits, {}, "reset");
  /* auto-rollback switch */
  await P.click("#secAutoBtn"); await P.waitForTimeout(600); assert.strictEqual(store[R + "secconfig/main"].autoRevert, true); assert.strictEqual(await P.textContent("#secAuto"), "ON");
  await P.click("#secAutoBtn"); await P.waitForTimeout(600); assert.strictEqual(store[R + "secconfig/main"].autoRevert, false);
  /* open the cheater from the feed -> actions panel */
  await tab("feed"); await P.click('#secBody [data-sec="cheaterX"]');
  await P.waitForSelector('#tabBody [data-pact="suspend"]', { timeout: 10000 });
  let pt = (await P.textContent("#tabBody")).replace(/\s+/g, " "); assert.ok(/Roll back to/.test(pt) && /Watch/.test(pt) && /Hide from rankings/.test(pt), pt);
  await P.selectOption("#susH", "72"); await P.click('#tabBody [data-pact="suspend"]'); await P.waitForTimeout(800);
  const ban = store[R + "bans/cheaterX"]; assert.ok(ban && ban.kind === "suspend" && ban.reason === "Duplicated gold" && ban.untilMs > T + 71 * 3600e3, JSON.stringify(ban));
  await P.waitForFunction(() => /suspended until/.test(document.getElementById("tabBody").textContent), null, { timeout: 5000 });
  await P.screenshot({ path: OUT + "admin_sec_player.png", fullPage: false });
  const bn = await tab("bans"); assert.ok(/GoldDuper/.test(bn) && /suspend/.test(bn) && /Duplicated gold/.test(bn));
  await P.click('#secBody [data-lift="cheaterX"]'); await P.waitForTimeout(800); assert.ok(!store[R + "bans/cheaterX"], "lifted");
  /* rollback */
  await P.waitForSelector('#tabBody [data-pact="rollback"]'); await P.click('#tabBody [data-pact="rollback"]'); await P.waitForTimeout(900);
  assert.strictEqual(store[R + "players/cheaterX/save/main"].resources.gold, 100, "rolled back"); assert.strictEqual(store[R + "acplayers/cheaterX"].status, "dismissed");
  const au = await tab("audit"); await P.waitForTimeout(600); const au2 = (await P.textContent("#secBody")).replace(/\s+/g, " ");
  assert.ok(/rollback/.test(au2) && /suspend/.test(au2) && /config/.test(au2) && /unsuspend/.test(au2), au2);
  await P.screenshot({ path: OUT + "admin_sec_audit.png", fullPage: false });
  console.log("dialogs:", dialogs.join(" | ").slice(0, 400));
  assert.ok(dialogs.some((d) => /Suspend this player for 72/.test(d)) && dialogs.some((d) => /Roll this player/.test(d)) && dialogs.some((d) => /auto-rollback ON/.test(d)), "every action confirmed");
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
