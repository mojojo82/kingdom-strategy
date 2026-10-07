/* v944: pack banner + Preview. Admin: upload a banner (cropped + shrunk to JPEG), save, preview shows the real shop card; the game draws the
   same card with the banner. Also checks the card code in admin/index.html is identical to the game's. Run: node dev/simfork/g193_banner.js */
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
  /* the two copies of the card code must match */
  const norm = (t) => { const a = t.indexOf("/* KSS-CARD-BEGIN"), b = t.indexOf("/* KSS-CARD-END */"); return t.slice(a, b).split("\n").map((l) => l.trim()).join("\n"); };
  assert.strictEqual(norm(fs.readFileSync(path.join(ROOT, "admin/index.html"), "utf8")), norm(fs.readFileSync(path.join(ROOT, "test/index.html"), "utf8")), "admin preview card code = game card code");
  const PIC = path.join(OUT, "g193_pic.png"); await P.setViewportSize({ width: 1200, height: 900 });
  await P.evaluate(() => { const c = document.createElement("canvas"); c.width = 1600; c.height = 900; const g = c.getContext("2d"); const gr = g.createLinearGradient(0, 0, 1600, 900); gr.addColorStop(0, "#2f6b93"); gr.addColorStop(1, "#c9a24a"); g.fillStyle = gr; g.fillRect(0, 0, 1600, 900); g.fillStyle = "#fff"; g.font = "bold 160px sans-serif"; g.fillText("BANNER", 420, 520); window.__pic = c.toDataURL("image/png"); });
  fs.writeFileSync(PIC, Buffer.from((await P.evaluate(() => window.__pic)).split(",")[1], "base64"));
  await P.click("#pkNew"); await P.fill("#pkName", "Master's Acuity"); await P.fill("#pkIcon", "🧭"); await P.fill("#pkDesc", "All the supplies and extra help an adventurer needs.");
  await P.selectOption("#pkTier", "5"); const r0 = (await P.$$("#pkItems .itemrow"))[0]; await (await r0.$("select")).selectOption("gems"); await (await r0.$("input")).fill("2500");
  await P.click("#pkAdd"); const r1 = (await P.$$("#pkItems .itemrow"))[1]; await (await r1.$("select")).selectOption("food"); await (await r1.$("input")).fill("10000");
  await P.setInputFiles("#pkBanFile", PIC); await P.waitForFunction(() => document.getElementById("pkBanThumb").style.display !== "none", null, { timeout: 5000 });
  await P.click("#pkPrev"); await P.waitForTimeout(300);
  const pv = await P.evaluate(() => ({ open: !document.getElementById("pvOv").classList.contains("hide"), ban: !!document.querySelector("#pvPhone .sban"), title: (document.querySelector("#pvPhone .sbt .snm") || {}).textContent, price: document.querySelector("#pvPhone .sbuy").textContent }));
  console.log("preview:", JSON.stringify(pv)); assert.ok(pv.open && pv.ban && pv.title === "Master's Acuity" && pv.price === "NZ$16.99", "preview = real card with banner");
  await P.screenshot({ path: OUT + "admin_preview.png" });
  await P.click("#pvClose"); await P.click("#pkSave"); await P.waitForTimeout(500);
  const saved = store["envs/test/packs/master_s_acuity"]; assert.ok(saved && /^data:image\/jpeg;base64,/.test(saved.banner) && saved.banner.length < 600000, "banner saved as small JPEG (" + (saved && saved.banner.length) + " chars)");
  console.log("banner size:", Math.round(saved.banner.length * 0.75 / 1024), "KB");
  /* the game draws it the same way */
  const ctx2 = await b.newContext({ viewport: { width: 430, height: 932 } }); const G = await ctx2.newPage(); G.on("pageerror", (e) => errs.push("game: " + e.message));
  await G.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width"></head><body style="margin:0;background:#05090f"><div class="kss" id="c" style="padding:12px"></div></body></html>');
  const game = fs.readFileSync(path.join(ROOT, "test/index.html"), "utf8"); const code = game.slice(game.indexOf("/* KSS-CARD-BEGIN"), game.indexOf("/* KSS-CARD-END */"));
  await G.addScriptTag({ content: code + '\nvar st=document.createElement("style");st.textContent=KSS_CARD_CSS;document.head.appendChild(st);' });
  await G.evaluate((p) => { const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]); document.getElementById("c").innerHTML = ksShopCardHtml(p, { end: Date.now() + 4 * 3600e3, badge: "Best value" }, "NZ$16.99", Date.now(), esc); }, saved);
  await G.screenshot({ path: OUT + "game_banner_card.png" }); const gb = await G.evaluate(() => ({ ban: !!document.querySelector(".sban"), time: (document.querySelector(".stime") || {}).textContent }));
  console.log("game card:", JSON.stringify(gb)); assert.ok(gb.ban && /4h|3h/.test(gb.time), "game card has banner + timer");
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
