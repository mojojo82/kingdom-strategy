/* v915: mailbox redesign (list + opened mail, Claim all, two looks). Headless Chromium with the Firebase stand-ins.
   Run: node dev/simfork/g171_mailskins.js   (override with PW_PATH / CHROME_PATH / OUT) */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const OUT = process.env.OUT || "/tmp/";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store), C = require(path.join(ROOT, "functions/core.js"));
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  async function open(vp) {
    const ctx = await b.newContext({ viewport: vp });
    await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
    await ctx.exposeFunction("__fbcall", call);
    await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
    await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
    await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort()); /* offline: fallback fonts */
    const p = await ctx.newPage(); p.on("pageerror", (e) => errs.push(e.message)); return p;
  }
  const T = "https://mojojo82.github.io/kingdom-strategy/test/";
  const P = await open({ width: 390, height: 844 });
  await P.goto(T); await P.waitForSelector("#ksAuth .box"); await P.fill("#ksE", "skins@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Skinny"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const uid = await P.evaluate(() => PLAYER_ID), M = "envs/test/players/" + uid + "/mail/", now = Date.now();
  store[M + "a1"] = C.makeMail("Sorry for the downtime", "Here is something for your trouble.", { gems: 50, food: 1000, shards_gareth: 5 }, "adm", now - 1000);
  store[M + "a2"] = C.makeMail("Harvest weekend reward", "", { wood: 500, gems: 20 }, "adm", now - 86400000);
  const c1 = C.makeMail("Welcome to the kingdom", "", { wood: 200 }, "adm", now - 3 * 86400000); c1.claimedAt = now - 86400000; store[M + "a3"] = c1;
  const c2 = C.makeMail("Compensation for the bug", "", { gems: 25 }, "adm", now - 6 * 86400000); c2.claimedAt = now - 86400000; store[M + "a4"] = c2;
  store[M + "w1"] = C.makeMail("Base raided", "Your base was hit.", { wood: 10 }, "adm", now - 500, "wars");
  await P.evaluate(() => { game.state.mailSaved = { a2: Date.now() }; window.__fbNotify(); }); await P.waitForTimeout(700);
  const S = () => P.evaluate(() => ({ cls: document.getElementById("mailPanel").className, tab: KSM.tab, titles: [].map.call(document.querySelectorAll("#mailList .mtt"), (x) => x.textContent), tabs: [].map.call(document.querySelectorAll("#mailTabs .mtab"), (x) => x.dataset.tab + (x.classList.contains("on") ? "*" : "") + ":" + ((x.querySelector(".tn") || {}).textContent || "0")),
    count: (document.querySelector("#mailBar .mcount") || {}).textContent, allDisabled: (document.querySelector("#mailBar .mall") || {}).disabled, detail: (document.querySelector(".mdet .dtitle") || {}).textContent || null }));
  const click = async (sel) => { await P.click(sel); await P.waitForTimeout(300); };

  await P.evaluate(() => setScreen("world")); await P.waitForTimeout(400); await click("#mapMailBtn"); let s = await S(); console.log("1. open (Game UI) ->", JSON.stringify(s));
  assert.ok(/sk-a/.test(s.cls) && /v-list/.test(s.cls)); assert.strictEqual(s.tab, "wars", "opens on Wars (first tab with unclaimed mail)");
  await click('[data-tab="system"]'); s = await S(); console.log("2. System ->", JSON.stringify([s.titles, s.count, s.tabs]));
  assert.deepStrictEqual(s.titles, ["Sorry for the downtime", "Harvest weekend reward", "Welcome to the kingdom", "Compensation for the bug"]); assert.strictEqual(s.count, "2 unclaimed in System");
  await P.screenshot({ path: OUT + "game_A_list.png" });
  await click('[data-open="a1"]'); s = await S(); console.log("3. opened mail ->", s.cls, "|", s.detail);
  assert.ok(/v-detail/.test(s.cls)); assert.strictEqual(s.detail, "Sorry for the downtime");
  const tiles = await P.evaluate(() => [].map.call(document.querySelectorAll(".dtile"), (x) => x.textContent.replace(/\s+/g, " ").trim())); console.log("   items:", JSON.stringify(tiles)); assert.strictEqual(tiles.length, 3);
  await P.screenshot({ path: OUT + "game_A_detail.png" });
  await click('[data-act="back"]'); s = await S(); assert.ok(/v-list/.test(s.cls)); console.log("4. back -> list again, tab", s.tab);

  await click('[data-act="skin"]'); s = await S(); console.log("5. switched look ->", s.cls, "| stored:", await P.evaluate(() => localStorage.getItem("ksMailSkin")));
  assert.ok(/sk-b/.test(s.cls)); assert.strictEqual(await P.evaluate(() => localStorage.getItem("ksMailSkin")), "b");
  await P.screenshot({ path: OUT + "game_B_list.png" });
  await click('[data-open="a1"]'); await P.screenshot({ path: OUT + "game_B_detail.png" });
  await click('[data-act="back"]');

  /* star from a row, then Saved tab */
  await click('[data-save="a1"]'); await click('[data-tab="saved"]'); s = await S(); console.log("6. Saved ->", JSON.stringify(s.titles)); assert.deepStrictEqual(s.titles.sort(), ["Harvest weekend reward", "Sorry for the downtime"]);
  await click('[data-tab="system"]');

  /* claim all in System: both unclaimed go, one after the other; gems come from the server wallet */
  const g0 = await P.evaluate(() => game.state.gems); await click('[data-act="all"]'); await P.waitForTimeout(2500); await P.evaluate(() => window.__fbNotify()); await P.waitForTimeout(600);
  s = await S(); const ap = await P.evaluate(() => ({ applied: Object.keys(game.state.mailApplied).sort(), wood: game.state.resources.wood, food: game.state.resources.food, gems: game.state.gems }));
  console.log("7. claim all ->", JSON.stringify(s.count), JSON.stringify(ap), "| gems", g0, "->", ap.gems);
  assert.ok(ap.applied.includes("a1") && ap.applied.includes("a2")); assert.strictEqual(s.count, "Nothing waiting in System"); assert.strictEqual(s.allDisabled, true); assert.strictEqual(ap.gems, g0 + 70, "gems 50 + 20 from the wallet");
  assert.ok(!ap.applied.includes("w1"), "Wars mail untouched by Claim all in System");
  const claimedDetail = await (async () => { await click('[data-open="a1"]'); return P.evaluate(() => document.querySelector(".dclaim").disabled + "|" + document.querySelector(".dclaim").textContent); })(); console.log("8. claimed mail detail button ->", claimedDetail); assert.strictEqual(claimedDetail, "true|Claimed");

  /* the look survives a reload; Esc closes */
  await P.reload(); await P.waitForTimeout(6000); await P.evaluate(() => setScreen("world")); await P.waitForTimeout(400); await click("#mapMailBtn"); s = await S(); console.log("9. after reload ->", s.cls); assert.ok(/sk-b/.test(s.cls));
  await P.keyboard.press("Escape"); assert.strictEqual(await P.evaluate(() => document.body.classList.contains("mail-open")), false);

  /* desktop */
  const D = await open({ width: 1400, height: 900 }); await D.goto(T); await D.waitForSelector("#ksAuth .box"); await D.fill("#ksE", "skins@test.dev"); await D.fill("#ksP", "secret123"); await D.click("#ksIn"); await D.waitForTimeout(6000);
  await D.evaluate(() => { document.body.classList.add("mail-open"); KSM.tab = "system"; KSM.skin = "b"; ksMailRender(); }); await D.waitForTimeout(300); await D.screenshot({ path: OUT + "game_B_desktop.png" });
  await D.evaluate(() => { KSM.skin = "a"; ksMailRender(); }); await D.waitForTimeout(300); await D.screenshot({ path: OUT + "game_A_desktop.png" });
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
