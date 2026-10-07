/* v947: 7-Day Sign-in - admin template + save + preview, then a new player claims day 1, can't claim day 2 the same day, claims it "tomorrow" and gets Roran.
   Run: node dev/simfork/g196_signin.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const OUT = process.env.OUT || "/tmp/";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store), ADMIN = require(path.join(ROOT, "functions/admins.json"))[0];
const STUB = `window.firebase = { initializeApp: function () {}, auth: Object.assign(function () { return { useEmulator: function () {}, signOut: function () {}, signInWithPopup: function () { return Promise.resolve(); },
  onAuthStateChanged: function (cb) { setTimeout(function () { cb({ uid: "${ADMIN}", email: "admin@test.dev", isAnonymous: false, getIdTokenResult: function () { return Promise.resolve({}); } }); }, 50); } }; }, { GoogleAuthProvider: function () {} }),
  app: function () { return { functions: function () { return { useEmulator: function () {}, httpsCallable: function (name) { return function (data) {
    return window.__fbcall(name, JSON.stringify(data), JSON.stringify({ uid: "${ADMIN}", token: { firebase: { sign_in_provider: "google.com" } } })).then(function (s) { var r = JSON.parse(s); if (r.error) throw new Error(r.error.message); return { data: r.data }; }); }; } }; } }; } };`;
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  /* ---- admin: add the template, check it, preview, save ---- */
  const ac = await b.newContext({ viewport: { width: 1200, height: 900 } });
  await ac.exposeFunction("__fbcall", call);
  await ac.route(/gstatic\.com\/firebasejs\/.*app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: STUB }));
  await ac.route(/gstatic\.com\/firebasejs\/.*(auth|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ac.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await ac.route(/admin\.test\//, (r) => r.fulfill({ status: 200, contentType: "text/html", body: fs.readFileSync(path.join(ROOT, "admin/index.html"), "utf8") }));
  const A = await ac.newPage(); A.on("pageerror", (e) => errs.push("admin: " + e.message)); A.on("dialog", (d) => d.accept());
  await A.goto("https://admin.test/"); await A.waitForSelector("#app:not(.hide)", { timeout: 10000 }); await A.waitForTimeout(500);
  await A.click("#evTpl2"); await A.waitForTimeout(300);
  const ed = await A.evaluate(() => ({ days: document.querySelectorAll("[data-emt]").length, txt: document.getElementById("evEd").textContent }));
  assert.strictEqual(ed.days, 0, "no target boxes for sign-in"); assert.ok(/Day 7/.test(ed.txt) && /no time limit/.test(ed.txt), "Day N labels + no time limit");
  await A.click('[data-evprev="0"]'); await A.waitForTimeout(300);
  const pv = await A.evaluate(() => ({ tiles: [].map.call(document.querySelectorAll("#pvPhone .esd"), (t) => t.className.replace("esd", "").trim() + ":" + t.textContent), next: (document.querySelector("#pvPhone .esnext") || {}).textContent }));
  console.log("preview:", JSON.stringify(pv)); assert.strictEqual(pv.tiles.length, 7); assert.ok(/now/.test(pv.tiles[3]) && /got/.test(pv.tiles[0]) && /grand/.test(pv.tiles[6]));
  await A.screenshot({ path: OUT + "admin_signin_preview.png" }); await A.click("#pvClose");
  await A.click("#evSave"); await A.waitForTimeout(500);
  const sv = store["envs/test/config/events"].events[0]; assert.ok(sv.id === "7_day_sign_in" && sv.goal === "signin" && sv.schedule.days === 0 && sv.milestones[1].items.hero_roran === 1, JSON.stringify(sv).slice(0, 300));
  await ac.close();
  /* ---- game: a new player ---- */
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 } });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "g196@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Newbie"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  const uid = await P.evaluate(() => PLAYER_ID), W = "envs/test/players/" + uid + "/wallet/main";
  assert.ok(await P.evaluate(() => !game.state.heroes.roran.owned), "no Roran yet");
  await P.evaluate(() => ksEvOpen()); await P.waitForTimeout(1500);
  const tiles = () => P.evaluate(() => ({ t: [].map.call(document.querySelectorAll("#ksEvList .esd"), (x) => (x.classList.contains("got") ? "got" : x.classList.contains("now") ? "now" : "-")).join(","), next: (document.querySelector("#ksEvList .esnext") || {}).textContent, time: !!document.querySelector("#ksEvList .etime"), note: document.getElementById("ksEvNote").textContent }));
  const t0 = await tiles(); console.log("day 1:", JSON.stringify(t0)); assert.strictEqual(t0.t, "now,-,-,-,-,-,-"); assert.ok(!t0.time, "no countdown - no time limit");
  await P.screenshot({ path: OUT + "signin_day1.png" });
  const g0 = await P.evaluate(() => KSW.gems);
  await P.click('#ksEvList [data-evi="0"]'); await P.waitForTimeout(3500);
  const t1 = await tiles(); console.log("after day 1:", JSON.stringify(t1)); assert.strictEqual(t1.t, "got,-,-,-,-,-,-"); assert.ok(/Next reward in/.test(t1.next)); assert.strictEqual(await P.evaluate(() => KSW.gems), g0 + 500);
  const auth = JSON.stringify({ uid, token: { firebase: { sign_in_provider: "password" } } });
  const same = JSON.parse(await call("claimEvent", JSON.stringify({ env: "test", event: "7_day_sign_in", idx: 1 }), auth)); assert.ok(same.error && /tomorrow/.test(same.error.message), "day 2 refused the same day");
  /* "tomorrow" (move the last-claim day back by one - same as the clock passing midnight UTC) */
  store[W].events["7_day_sign_in"].d -= 1; await P.evaluate(() => window.__fbNotify && window.__fbNotify()); await P.waitForTimeout(1500);
  const t2 = await tiles(); console.log("next day:", JSON.stringify(t2)); assert.strictEqual(t2.t, "got,now,-,-,-,-,-");
  await P.click('#ksEvList [data-evi="1"]'); await P.waitForTimeout(3500); await P.evaluate(() => window.__fbNotify && window.__fbNotify()); await P.waitForTimeout(800);
  const mid = Object.keys(store).find((k) => k.indexOf("envs/test/players/" + uid + "/mail/") === 0 && store[k].items && store[k].items.hero_roran).split("/").pop();
  await P.evaluate((m) => ksMailClaim(m), mid); await P.waitForTimeout(1500);
  const r = await P.evaluate(() => { const h = game.state.heroes.roran; return { owned: h.owned, level: h.level, unlock: h.unlock, skills: !!h.skillLevels }; }); console.log("Roran:", JSON.stringify(r));
  assert.ok(r.owned && r.level >= 1 && r.unlock === undefined && r.skills, "Roran unlocked");
  /* a second copy turns into shards */
  const f0 = await P.evaluate(() => { ksMailApply("dupe_test", [{ path: "heroes.roran.unlock", kind: "save", qty: 1 }]); return game.state.heroes.roran.fragments; }); assert.strictEqual(f0, 30, "duplicate hero -> 30 shards");
  await P.evaluate(() => ksEvOpen()); await P.waitForTimeout(800); const t3 = await tiles(); console.log("after day 2:", JSON.stringify(t3)); assert.strictEqual(t3.t, "got,got,-,-,-,-,-");
  await P.screenshot({ path: OUT + "signin_day2.png" });
  /* all 7 claimed -> the event goes away */
  store[W].events["7_day_sign_in"] = Object.assign({}, store[W].events["7_day_sign_in"], { c: [0, 1, 2, 3, 4, 5, 6] }); await P.evaluate(() => window.__fbNotify && window.__fbNotify()); await P.waitForTimeout(1500);
  const gone = await P.evaluate(() => document.querySelectorAll("#ksEvList .esd").length); assert.strictEqual(gone, 0, "finished sign-in disappears");
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
