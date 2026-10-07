/* v943: in-game Shop - tabs from config/shop, packs from packs/, local currency (switchable), timed deals hidden outside their window,
   badges, limits with reset timers, coming-soon buy button. Run: node dev/simfork/g192_shop.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const OUT = process.env.OUT || "/tmp/";
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
  const now = Date.now(), C = require(path.join(ROOT, "functions/core.js"));
  const mk = (o) => C.normalizePack(o);
  store["envs/test/packs/starter_pack"] = mk({ name: "Starter Pack", icon: "🎁", desc: "Everything a new lord needs", items: { gems: 300, wood: 5000 }, tier: 4, limit: 1 });
  store["envs/test/packs/daily_deal"] = mk({ name: "Daily Deal", icon: "⏰", items: { gems: 60 }, tier: 1, limit: 1, reset: "daily" });
  store["envs/test/packs/old_deal"] = mk({ name: "Expired Deal", items: { gems: 1 }, tier: 1 });
  store["envs/test/packs/future_deal"] = mk({ name: "Future Deal", items: { gems: 1 }, tier: 1 });
  store["envs/test/packs/gem_chest"] = mk({ name: "Gem Chest", icon: "💎", items: { gems: 2000 }, tier: 6 });
  store["envs/test/config/shop"] = C.normalizeShop({ tabs: [
    { name: "Deals", icon: "🔥", items: [{ pack: "daily_deal", end: now + 2 * 86400e3, badge: "-50%" }, { pack: "starter_pack", badge: "Best value" }, { pack: "old_deal", end: now - 1000 }, { pack: "future_deal", start: now + 86400e3 }] },
    { name: "Shop", icon: "🛒", items: [{ pack: "gem_chest" }, { pack: "starter_pack" }] }] }, null);
  Object.assign(store["envs/test/config/shop"], { topups: C.normalizeShop({ topups: [{ name: "Daily Top-up", period: "daily", tiers: [{ points: 500, items: { gems: 100 } }, { points: 2500, items: { wood: 5000, gems: 250 } }, { points: 10000, items: { gems: 2000 } }] }] }, []).topups });
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "g192@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Shopper"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  /* open it the way a player does: More -> Shop */
  await P.evaluate(() => setScreen("more", "menu")); await P.waitForTimeout(300);
  const tile = await P.$$eval("#moreMenu .mm-tile", (ts) => ts.findIndex((t) => /Shop/.test(t.textContent))); assert.ok(tile >= 0, "Shop tile in More");
  await (await P.$$("#moreMenu .mm-tile"))[tile].click(); await P.waitForTimeout(1200);
  await P.evaluate(() => { const s = document.getElementById("ksShopCur"); s.value = "NZD"; s.dispatchEvent(new Event("change")); }); await P.waitForTimeout(300);
  const S = () => P.evaluate(() => ({ tabs: [].map.call(document.querySelectorAll("#ksShopTabs .stab"), (b) => b.textContent), cards: [].map.call(document.querySelectorAll("#ksShopList .scard"), (c) => ({ n: c.querySelector(".snm").textContent, price: c.querySelector(".sbuy").textContent, badge: (c.querySelector(".sbadge") || {}).textContent || "", meta: (c.querySelector(".smeta") || {}).textContent || "", items: c.querySelector(".sitems").textContent })) }));
  const d = await S(); console.log("deals:", JSON.stringify(d));
  await P.screenshot({ path: OUT + "shop_deals.png" });
  assert.deepStrictEqual(d.tabs, ["🔥 Deals · 2", "🛒 Shop · 2", "🏆 Top-up"]);
  assert.deepStrictEqual(d.cards.map((c) => c.n), ["Daily Deal", "Starter Pack"], "expired + not-yet-started deals hidden, admin order kept");
  assert.strictEqual(d.cards[0].price, "NZ$1.69"); assert.strictEqual(d.cards[1].price, "NZ$8.49"); assert.strictEqual(d.cards[0].badge, "-50%");
  assert.ok(/Ends in 1d|Ends in 2d/.test(d.cards[0].meta) && /1 per day · resets in/.test(d.cards[0].meta), "timers"); assert.ok(/Wood × 5,000/.test(d.cards[1].items), "item labels");
  await P.click('#ksShop [data-stab="shop"]'); await P.waitForTimeout(200);
  const s2 = await S(); assert.deepStrictEqual(s2.cards.map((c) => c.n + " " + c.price), ["Gem Chest NZ$33.99", "Starter Pack NZ$8.49"]);
  await P.evaluate(() => { const s = document.getElementById("ksShopCur"); s.value = "TRY"; s.dispatchEvent(new Event("change")); }); await P.waitForTimeout(200);
  assert.strictEqual((await S()).cards[0].price, "₺899.99", "currency switch");
  await P.click("#ksShop .sbuy"); await P.waitForTimeout(200);
  assert.ok(/nothing was charged/.test(await P.textContent("#ksShopNote")), "buy says coming soon");
  await P.evaluate(() => { const s = document.getElementById("ksShopCur"); s.value = "NZD"; s.dispatchEvent(new Event("change")); }); await P.screenshot({ path: OUT + "shop_shop.png" });
  /* admin changes the shop while it's open -> updates live */
  store["envs/test/config/shop"].tabs[1].items.unshift({ pack: "daily_deal", start: null, end: null, badge: "NEW" }); await P.evaluate(() => window.__fbNotify && window.__fbNotify()); await P.waitForTimeout(500);
  assert.strictEqual((await S()).cards[0].n, "Daily Deal", "live update");
  /* v945: cards show top-up points; buying (delivered by an admin here) adds points; the Top-up tab shows progress and claims */
  await P.click('#ksShop [data-stab="deals"]'); await P.waitForTimeout(200);
  assert.ok(/⭐ \+2,500 top-up pts/.test((await S()).cards.find((c) => c.n === "Starter Pack").meta), "card shows top-up points");
  const uid = await P.evaluate(() => PLAYER_ID), ADMIN = require(path.join(ROOT, "functions/admins.json"))[0];
  const auth = JSON.stringify({ uid: ADMIN, token: { firebase: { sign_in_provider: "google.com" } } });
  const d1 = JSON.parse(await call("adminDeliverPurchase", JSON.stringify({ env: "test", uid, pack: "starter_pack", receiptId: "g192-0001" }), auth)); assert.ok(d1.data && d1.data.record.points === 2500, JSON.stringify(d1));
  await P.evaluate(() => window.__fbNotify && window.__fbNotify()); await P.waitForTimeout(600);
  await P.click('#ksShop [data-stab="__topup"]'); await P.waitForTimeout(300);
  const tp = await P.evaluate(() => ({ text: document.getElementById("ksShopList").textContent.replace(/\s+/g, " "), btns: [].map.call(document.querySelectorAll("#ksShopList [data-topc]"), (b) => b.textContent) }));
  console.log("top-up tab:", JSON.stringify(tp)); await P.screenshot({ path: OUT + "shop_topup.png" });
  assert.ok(/2,500 \/ 10,000/.test(tp.text), "progress"); assert.deepStrictEqual(tp.btns, ["Claim", "Claim", "Locked"]);
  const g0 = await P.evaluate(() => KSW.gems);
  await P.click('#ksShopList [data-topi="1"]'); await P.waitForTimeout(800); await P.evaluate(() => window.__fbNotify && window.__fbNotify()); await P.waitForTimeout(400);
  const after = await P.evaluate(() => ({ btns: [].map.call(document.querySelectorAll("#ksShopList [data-topc]"), (b) => b.textContent), gems: KSW.gems }));
  console.log("after claim:", JSON.stringify(after), "gems before", g0);
  assert.deepStrictEqual(after.btns, ["Claim", "✓ Claimed", "Locked"]); assert.strictEqual(after.gems, g0 + 250, "gems straight in");
  assert.ok(Object.keys(store).some((k) => k.indexOf("envs/test/players/" + uid + "/mail/") === 0 && store[k].items && store[k].items.wood === 5000 && /Top-up/.test(store[k].title)), "wood by mail");
  const dup = JSON.parse(await call("claimTopup", JSON.stringify({ env: "test", ladder: "daily_top_up", idx: 1 }), JSON.stringify({ uid, token: { firebase: { sign_in_provider: "password" } } }))); assert.ok(dup.data.dup, "can't claim twice");
  const early = JSON.parse(await call("claimTopup", JSON.stringify({ env: "test", ladder: "daily_top_up", idx: 2 }), JSON.stringify({ uid, token: { firebase: { sign_in_provider: "password" } } }))); assert.ok(early.error && /not enough/.test(early.error.message), "locked milestone refused by the server");
  await P.click('#ksShop [data-sx="1"]'); assert.ok(!(await P.isVisible("#ksShop")), "closes");
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
