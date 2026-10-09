/* v920: admin site shows anti-cheat flags (Flagged players list + the player's Anti-cheat tab). Firebase stood in by the local function runner. */
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
  const T = Date.now();
  store["envs/test/acplayers/cheaterX"] = { uid: "cheaterX", count: 3, firstAt: T - 86400000, lastAt: T - 60000, recent: [{ at: T - 60000, dtSec: 5, reasons: ["gold +49,999,000 in 5s (limit 109,000)", "Conquest +60 levels (5 to 65) in 5s; the game needs at least 301s"] }, { at: T - 3600000, dtSec: 60, reasons: ["troops +8,999,800 in 60s (limit 7,100)"] }], reverted: 0 };
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 1200, height: 900 } });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/gstatic\.com\/firebasejs\/.*app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: STUB }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await ctx.route(/admin\.test\//, (r) => r.fulfill({ status: 200, contentType: "text/html", body: fs.readFileSync(path.join(ROOT, "admin/index.html"), "utf8") }));
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://admin.test/"); await P.waitForSelector("#app:not(.hide)", { timeout: 10000 });
  await P.click("#flaggedBtn"); await P.waitForSelector("#results [data-uid]", { timeout: 10000 });
  const list = await P.textContent("#results"); console.log("list:", list.replace(/\s+/g, " ").slice(0, 200)); assert.ok(/cheaterX/.test(list) && /gold \+49,999,000/.test(list));
  await P.click("#results [data-uid]"); await P.waitForFunction(() => /Anti-cheat flags/.test(document.getElementById("pStats").textContent), null, { timeout: 10000 });
  const tab = await P.textContent("#tabBody"); console.log("tab:", tab.replace(/\s+/g, " ").slice(0, 220)); assert.ok(/3 flag\(s\)/.test(tab) && /troops \+8,999,800/.test(tab) && /not changed/.test(tab));
  await P.screenshot({ path: OUT + "admin_flags.png" });
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
