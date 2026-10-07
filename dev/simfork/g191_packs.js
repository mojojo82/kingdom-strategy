/* v943: admin packs - one list for 🛒 shop packs and 🎁 mail gift bundles: create, edit, delete, fill a mail from a gift pack, deliver a shop pack
   (gems to the wallet, other items by mail). Run: node dev/simfork/g191_packs.js */
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
  async function makePack(name, rows, price, shop, mail) {
    await P.click("#pkNew"); await P.fill("#pkName", name); if (price) await P.fill("#pkPrice", String(price));
    for (let i = 0; i < rows.length; i++) { if (i) await P.click("#pkAdd"); const r = (await P.$$("#pkItems .itemrow"))[i]; await (await r.$("select")).selectOption(rows[i][0]); await (await r.$("input")).fill(String(rows[i][1])); }
    if ((await P.isChecked("#pkShop")) !== shop) await P.click("#pkShop"); if ((await P.isChecked("#pkMail")) !== mail) await P.click("#pkMail");
    await P.click("#pkSave"); await P.waitForTimeout(400);
  }
  await makePack("Bug apology", [["gems", 100], ["food", 2000]], 0, false, true);
  await makePack("Starter Pack", [["gems", 300], ["wood", 5000]], 4.99, true, false);
  const st = await P.evaluate(() => ({ list: document.getElementById("pkList").textContent.replace(/\s+/g, " "), deliver: [].map.call(document.querySelectorAll("#packSel option"), (o) => o.value), gifts: [].map.call(document.querySelectorAll("#mGift option"), (o) => o.value) }));
  console.log(JSON.stringify(st).slice(0, 400));
  assert.ok(store["envs/test/packs/bug_apology"] && store["envs/test/packs/starter_pack"], "saved per environment");
  assert.deepStrictEqual(store["envs/test/packs/starter_pack"].items, { gems: 300, wood: 5000 });
  assert.ok(st.deliver.includes("starter_pack") && !st.deliver.includes("bug_apology"), "deliver list = shop packs");
  assert.ok(st.gifts.includes("bug_apology") && !st.gifts.includes("starter_pack"), "gift list = mail packs");
  /* fill the everyone-mail from a gift pack */
  await P.selectOption("#aGift", "bug_apology"); await P.waitForTimeout(200);
  const filled = await P.evaluate(() => ({ title: document.getElementById("aTitle").value, rows: [].map.call(document.querySelectorAll("#aItems .itemrow"), (r) => r.querySelector("select").value + ":" + r.querySelector("input").value) }));
  console.log("filled:", JSON.stringify(filled)); assert.deepStrictEqual(filled, { title: "Bug apology", rows: ["gems:100", "food:2000"] });
  await P.screenshot({ path: OUT + "admin_packs.png", fullPage: true });
  /* edit: Bug apology -> 150 gems */
  await P.click('[data-pkedit="bug_apology"]'); await P.waitForTimeout(200); await (await (await P.$$("#pkItems .itemrow"))[0].$("input")).fill("150"); await P.click("#pkSave"); await P.waitForTimeout(400);
  assert.strictEqual(store["envs/test/packs/bug_apology"].items.gems, 150, "edited in place");
  /* deliver the shop pack: gems straight to the wallet, wood by mail */
  const auth = JSON.stringify({ uid: ADMIN, token: { firebase: { sign_in_provider: "google.com" } } });
  const r = JSON.parse(await call("adminDeliverPurchase", JSON.stringify({ env: "test", uid: "playerAbc123", pack: "starter_pack", receiptId: "rcpt-0001" }), auth));
  console.log("deliver:", JSON.stringify(r).slice(0, 300));
  assert.strictEqual(r.data.gems, 300); const mk = Object.keys(store).find((k) => k.indexOf("envs/test/players/playerAbc123/mail/") === 0);
  assert.ok(mk && store[mk].items.wood === 5000 && !store[mk].items.gems, "wood arrives by mail");
  /* delete */
  await P.click('[data-pkdel="bug_apology"]'); await P.waitForTimeout(400); assert.ok(!store["envs/test/packs/bug_apology"], "deleted");
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
