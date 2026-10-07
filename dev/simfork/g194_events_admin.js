/* v946: admin Events - Burst of Life template, save, preview; event card code identical in admin and game. Run: node dev/simfork/g194_events_admin.js */
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
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 1200, height: 900 } });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/gstatic\.com\/firebasejs\/.*app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: STUB }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await ctx.route(/admin\.test\//, (r) => r.fulfill({ status: 200, contentType: "text/html", body: fs.readFileSync(path.join(ROOT, "admin/index.html"), "utf8") }));
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message)); P.on("dialog", (d) => d.accept());
  await P.goto("https://admin.test/"); await P.waitForSelector("#app:not(.hide)", { timeout: 10000 }); await P.waitForTimeout(500);
  const norm = (t) => { const a = t.indexOf("/* KSE-CARD-BEGIN"), b = t.indexOf("/* KSE-CARD-END */"); return t.slice(a, b).split("\n").map((l) => l.trim()).join("\n"); };
  assert.strictEqual(norm(fs.readFileSync(path.join(ROOT, "admin/index.html"), "utf8")), norm(fs.readFileSync(path.join(ROOT, "test/index.html"), "utf8")), "admin event card code = game's");
  await P.click("#evTpl"); await P.waitForTimeout(300);
  const ms = await P.$$eval("[data-emt]", (els) => els.map((e) => +e.value)); console.log("milestones:", ms.join(", "));
  assert.deepStrictEqual(ms, [50000, 300000, 500000, 1000000, 1500000, 2000000, 2500000, 3000000, 4000000]);
  await P.click('[data-evprev="0"]'); await P.waitForTimeout(300);
  const pv = await P.evaluate(() => ({ title: (document.querySelector("#pvPhone .etitle") || {}).textContent, tag: (document.querySelector("#pvPhone .etag") || {}).textContent, grand: (document.querySelector("#pvPhone .erow.grand") || {}).textContent, rows: document.querySelectorAll("#pvPhone .erow").length }));
  console.log("preview:", JSON.stringify(pv)); assert.ok(pv.title === "Burst of Life" && pv.tag === "Beginner" && /4,000,000/.test(pv.grand) && /Neptune/.test(pv.grand) && /54K/.test(pv.grand) && pv.rows === 9);
  await P.screenshot({ path: OUT + "admin_event_preview.png" }); await P.click("#pvClose");
  await P.click("#evSave"); await P.waitForTimeout(500);
  const ev = store["envs/test/config/events"]; assert.ok(ev && ev.events[0].id === "burst_of_life" && ev.events[0].schedule.days === 7 && ev.events[0].milestones[8].items.skin_city_titan === 1, "saved");
  await P.screenshot({ path: OUT + "admin_events.png", fullPage: true });
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
