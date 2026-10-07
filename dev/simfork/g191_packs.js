/* v943: admin packs - one list for 🛒 shop packs and 🎁 mail gift bundles: create, edit, delete, fill a mail from a gift pack, deliver a shop pack
   (gems to the wallet, other items by mail). Run: node dev/simfork/g191_packs.js (v943 shop: tiers in 5 currencies, buy limits incl. daily/weekly/monthly, Deals/Shop tabs with timed placements + badges) */
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
  async function makePack(name, icon, rows, tier, mail, limit, reset) {
    await P.click("#pkNew"); await P.fill("#pkName", name); await P.fill("#pkIcon", icon); await P.selectOption("#pkTier", String(tier));
    for (let i = 0; i < rows.length; i++) { if (i) await P.click("#pkAdd"); const r = (await P.$$("#pkItems .itemrow"))[i]; await (await r.$("select")).selectOption(rows[i][0]); await (await r.$("input")).fill(String(rows[i][1])); }
    if ((await P.isChecked("#pkMail")) !== mail) await P.click("#pkMail");
    await P.fill("#pkLimit", String(limit || 0)); await P.selectOption("#pkReset", reset || "none");
    await P.click("#pkSave"); await P.waitForTimeout(400);
  }
  await makePack("Bug apology", "🩹", [["gems", 100], ["food", 2000]], 0, true);
  await makePack("Starter Pack", "🎁", [["gems", 300], ["wood", 5000]], 4, false, 1, "none");
  await makePack("Daily Deal", "⏰", [["gems", 60]], 1, false, 1, "daily");
  const s1 = await P.evaluate(() => ({ grid: document.getElementById("pkGrid").textContent.replace(/\s+/g, " "), gifts: [].map.call(document.querySelectorAll("#mGift option"), (o) => o.value) }));
  console.log("library:", s1.grid.slice(0, 420));
  assert.ok(/NZ\$8\.49/.test(s1.grid) && /US\$4\.99/.test(s1.grid) && /€4\.99/.test(s1.grid) && /₺224\.99/.test(s1.grid) && /MX\$99/.test(s1.grid), "tier 4 price in all 5 currencies");
  assert.ok(/1 per day/.test(s1.grid) && /1 per player \(one-time\)/.test(s1.grid), "limits shown");
  assert.deepStrictEqual(store["envs/test/packs/daily_deal"].reset, "daily");
  assert.ok(s1.gifts.includes("bug_apology") && !s1.gifts.includes("starter_pack"), "gift picker = 🎁 packs only");
  /* mail box: fill from a gift pack */
  await P.selectOption("#aGift", "bug_apology"); await P.waitForTimeout(200);
  const filled = await P.evaluate(() => ({ title: document.getElementById("aTitle").value, rows: [].map.call(document.querySelectorAll("#aItems .itemrow"), (r) => r.querySelector("select").value + ":" + r.querySelector("input").value) }));
  assert.deepStrictEqual(filled, { title: "Bug apology", rows: ["gems:100", "food:2000"] });
  /* shop tabs: Deals <- Daily Deal (badge, ends in 2 days) + Starter Pack ; Shop <- Starter Pack */
  await P.click('#shTabs [data-s="tabs"]'); await P.waitForTimeout(200);
  await P.selectOption('[data-tadd="0"]', "daily_deal"); await P.selectOption('[data-tadd="0"]', "starter_pack"); await P.selectOption('[data-tadd="1"]', "starter_pack");
  await P.fill('[data-ef="badge"][data-ti="0"][data-ei="0"]', "-50%");
  const endLocal = await P.evaluate(() => { const d = new Date(Date.now() + 2 * 86400e3), z = (n) => (n < 10 ? "0" : "") + n; return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate()) + "T" + z(d.getHours()) + ":" + z(d.getMinutes()); });
  await P.fill('[data-ef="end"][data-ti="0"][data-ei="0"]', endLocal);
  await P.click('[data-emv="1"][data-ti="0"][data-ei="0"]'); await P.waitForTimeout(100); /* Daily Deal moves below Starter Pack */
  await P.click("#tabSave"); await P.waitForTimeout(500);
  const shop = store["envs/test/config/shop"]; console.log("shop:", JSON.stringify(shop.tabs));
  assert.deepStrictEqual(shop.tabs.map((t) => t.name + ":" + t.items.map((e) => e.pack).join(",")), ["Deals:starter_pack,daily_deal", "Shop:starter_pack"]);
  assert.ok(shop.tabs[0].items[1].badge === "-50%" && shop.tabs[0].items[1].end > Date.now(), "badge + end time kept with its pack after reorder");
  await P.screenshot({ path: OUT + "admin_shoptabs.png", fullPage: true });
  /* price tiers: change tier 4 NZD */
  await P.click('#shTabs [data-s="tiers"]'); await P.fill('[data-tier="4"][data-cur="NZD"]', "8.99"); await P.click("#tierSave"); await P.waitForTimeout(400);
  assert.strictEqual(store["envs/test/config/shop"].tiers[4].NZD, 8.99);
  await P.click('#shTabs [data-s="lib"]'); await P.waitForTimeout(200);
  assert.ok(/NZ\$8\.99/.test(await P.textContent("#pkGrid")), "library shows the new price");
  await P.screenshot({ path: OUT + "admin_packs.png", fullPage: true });
  /* deliver the starter pack: gems to wallet, wood by mail; one-time limit */
  const auth = JSON.stringify({ uid: ADMIN, token: { firebase: { sign_in_provider: "google.com" } } });
  const dl = async (rc, pack) => JSON.parse(await call("adminDeliverPurchase", JSON.stringify({ env: "test", uid: "playerAbc123", pack: pack || "starter_pack", receiptId: rc }), auth));
  const r = await dl("rcpt-0001"); assert.strictEqual(r.data.gems, 300);
  const mk = Object.keys(store).find((k) => k.indexOf("envs/test/players/playerAbc123/mail/") === 0); assert.ok(mk && store[mk].items.wood === 5000 && !store[mk].items.gems, "wood arrives by mail");
  const r2 = await dl("rcpt-0002"); console.log("2nd starter:", JSON.stringify(r2.error)); assert.ok(r2.error && /limit/.test(r2.error.message), "one-time pack can't be bought twice");
  assert.ok((await dl("rcpt-0001")).data.dup, "same receipt = no-op, not a limit error");
  assert.ok((await dl("rcpt-0003", "daily_deal")).data); const r4 = await dl("rcpt-0004", "daily_deal"); assert.ok(r4.error && r4.error.details && r4.error.details.resetsAt > Date.now(), "daily limit with reset time");
  /* edit + delete */
  await P.click('[data-pkedit="bug_apology"]'); await P.waitForTimeout(200); await (await (await P.$$("#pkItems .itemrow"))[0].$("input")).fill("150"); await P.click("#pkSave"); await P.waitForTimeout(400);
  assert.strictEqual(store["envs/test/packs/bug_apology"].items.gems, 150);
  await P.click('[data-pkdel="starter_pack"]'); await P.waitForTimeout(500);
  assert.ok(!store["envs/test/packs/starter_pack"]); assert.ok(!JSON.stringify(store["envs/test/config/shop"].tabs).includes("starter_pack"), "removed from tabs too");
  /* v945: tier points column + a top-up ladder */
  await P.click('#shTabs [data-s="tiers"]'); assert.strictEqual(await P.inputValue('[data-tier="8"][data-cur="points"]'), "50000", "NZ$169.99 tier = 50,000 pts");
  await P.click('#shTabs [data-s="topups"]'); await P.click("#topAdd"); await P.waitForTimeout(150);
  await P.fill('[data-lf="name"][data-li="0"]', "Daily Top-up");
  await (await P.$('#tm_0_0 .itemrow select')).selectOption("gems"); await (await P.$('#tm_0_0 .itemrow input')).fill("100");
  await P.click('[data-mnew="0"]'); await P.waitForTimeout(150); await P.fill('[data-mp="0_1"]', "2500");
  await (await P.$('#tm_0_1 .itemrow select')).selectOption("wood"); await (await P.$('#tm_0_1 .itemrow input')).fill("5000");
  await P.click('[data-madd="0_1"]'); const rr = await P.$$('#tm_0_1 .itemrow'); await (await rr[1].$("select")).selectOption("gems"); await (await rr[1].$("input")).fill("250");
  await P.click("#topSave"); await P.waitForTimeout(500);
  const L = store["envs/test/config/shop"].topups; console.log("ladder:", JSON.stringify(L));
  assert.ok(L && L[0].name === "Daily Top-up" && L[0].period === "daily" && L[0].tiers.length === 2 && L[0].tiers[1].points === 2500 && L[0].tiers[1].items.wood === 5000 && L[0].tiers[1].items.gems === 250, "ladder saved");
  await P.screenshot({ path: OUT + "admin_topups.png", fullPage: true });
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
