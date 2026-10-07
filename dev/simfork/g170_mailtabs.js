/* v914: mailbox tabs (Wars / Alliance / System / Reports / Saved) + star bookmarks. Headless Chromium with the Firebase stand-ins.
   Run: node dev/simfork/g170_mailtabs.js   (needs playwright + a chromium; override with PW_PATH / CHROME_PATH / OUT) */
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
    const p = await ctx.newPage(); p.on("pageerror", (e) => errs.push(e.message)); return p;
  }
  const T = "https://mojojo82.github.io/kingdom-strategy/test/";
  const A = await open({ width: 1400, height: 900 });
  await A.goto(T); await A.waitForSelector("#ksAuth .box"); await A.fill("#ksE", "tabs@test.dev"); await A.fill("#ksP", "secret123"); await A.click("#ksUp");
  await A.waitForSelector("#ksN", { timeout: 15000 }); await A.fill("#ksN", "Tabby"); await A.click("#ksGo"); await A.waitForTimeout(5000);
  const uid = await A.evaluate(() => PLAYER_ID), M = "envs/test/players/" + uid + "/mail/", now = Date.now();
  const old = C.makeMail("Old style mail", "sent before categories existed", { wood: 10 }, "adm", now - 5000); delete old.category; /* v913 mail has no category field */
  store[M + "m_old"] = old;
  store[M + "m_war"] = C.makeMail("Raid report", "", { wood: 20 }, "adm", now - 4000, "wars");
  store[M + "m_sys"] = C.makeMail("Server gift", "", { wood: 30 }, "adm", now - 3000, "system");
  store[M + "m_rep"] = C.makeMail("Battle summary", "", { wood: 40 }, "adm", now - 2000, "reports");
  const claimedAlly = C.makeMail("Old ally note", "", { wood: 1 }, "adm", now - 1000, "alliance"); claimedAlly.claimedAt = now; store[M + "m_all"] = claimedAlly;
  await A.evaluate(() => window.__fbNotify()); await A.waitForTimeout(600);
  const S = () => A.evaluate(() => ({ tab: KSM.tab, tabs: [].map.call(document.querySelectorAll("#mailTabs .mtab"), (x) => x.dataset.tab + (x.classList.contains("on") ? "*" : "") + ":" + ((x.querySelector(".tn") || {}).textContent || "0")),
    titles: [].map.call(document.querySelectorAll("#mailList .mtt"), (x) => x.textContent.replace(/[★☆]/, "")), empty: (document.querySelector("#mailList .me") || {}).textContent || null }));
  const click = async (sel) => { await A.click(sel); await A.waitForTimeout(250); };

  await click("#mailBtn"); let s = await S(); console.log("1. open ->", JSON.stringify(s));
  assert.deepStrictEqual(s.tabs, ["wars*:1", "alliance:0", "system:2", "reports:1", "saved:0"], "5 tabs, unread counts (claimed ally mail doesn't count, old mail counts as System)");
  assert.strictEqual(s.tab, "wars", "opens on the first tab with unread mail"); assert.deepStrictEqual(s.titles, ["Raid report"]);
  await A.screenshot({ path: OUT + "mailtabs_desktop.png", clip: { x: 420, y: 40, width: 560, height: 420 } });

  await click('[data-tab="system"]'); s = await S(); console.log("2. System ->", JSON.stringify(s.titles));
  assert.deepStrictEqual(s.titles, ["Server gift", "Old style mail"].sort((a, c) => s.titles.indexOf(a) - s.titles.indexOf(c)), "old no-category mail shows under System"); assert.strictEqual(s.titles.length, 2);
  await click('[data-tab="alliance"]'); s = await S(); console.log("3. Alliance ->", JSON.stringify(s.titles));
  assert.deepStrictEqual(s.titles, ["Old ally note"]);
  await click('[data-tab="saved"]'); s = await S(); console.log("4. Saved (nothing yet) ->", s.empty); assert.ok(/Nothing saved/.test(s.empty));

  await click('[data-tab="reports"]'); await click('[data-save="m_rep"]'); await click('[data-tab="wars"]'); await click('[data-save="m_war"]');
  await click('[data-tab="saved"]'); s = await S(); console.log("5. starred two ->", JSON.stringify(s.titles), "| state:", await A.evaluate(() => Object.keys(game.state.mailSaved)));
  assert.strictEqual(s.titles.length, 2); assert.ok(s.titles.includes("Raid report") && s.titles.includes("Battle summary"));
  await A.screenshot({ path: OUT + "mailtabs_saved.png", clip: { x: 420, y: 40, width: 560, height: 420 } });

  await A.evaluate(() => cloudSyncNow(true)); await A.waitForTimeout(800);
  const cloud = store["envs/test/players/" + uid + "/save/main"]; console.log("6. cloud save has bookmarks:", JSON.stringify(Object.keys((cloud || {}).mailSaved || {})));
  assert.deepStrictEqual(Object.keys(cloud.mailSaved).sort(), ["m_rep", "m_war"]);

  await click('[data-save="m_war"]'); s = await S(); console.log("7. un-starred one ->", JSON.stringify(s.titles)); assert.deepStrictEqual(s.titles, ["Battle summary"]);

  await click('[data-tab="system"]'); await click('[data-claim="m_sys"]'); await A.waitForTimeout(1500); await A.evaluate(() => window.__fbNotify()); await A.waitForTimeout(500);
  s = await S(); console.log("8. claimed a System mail -> tabs", JSON.stringify(s.tabs), "| wood +30 applied:", await A.evaluate(() => !!game.state.mailApplied.m_sys));
  assert.ok(s.tabs.includes("system*:1"), "system unread count dropped to 1");

  /* reload: bookmarks survive in the save */
  await A.reload(); await A.waitForTimeout(6000); const back = await A.evaluate(() => Object.keys(game.state.mailSaved || {})); console.log("9. after reload mailSaved ->", JSON.stringify(back)); assert.deepStrictEqual(back, ["m_rep"]);

  /* phone width: five tabs must fit */
  const P = await open({ width: 380, height: 760 }); await P.goto(T); await P.waitForSelector("#ksAuth .box"); await P.fill("#ksE", "tabs@test.dev"); await P.fill("#ksP", "secret123");
  await P.click("#ksIn"); await P.waitForTimeout(6000); await P.evaluate(() => window.__fbNotify()); await P.waitForTimeout(600);
  await P.evaluate(() => { document.body.classList.add("mail-open"); ksMailPickTab(); ksMailRender(); }); await P.waitForTimeout(300);
  const fit = await P.evaluate(() => { const t = document.getElementById("mailTabs"); return { sw: t.scrollWidth, cw: t.clientWidth, n: t.children.length }; }); console.log("10. phone 380px tabs row ->", JSON.stringify(fit));
  assert.ok(fit.sw <= fit.cw + 1 && fit.n === 5, "five tabs fit without scrolling"); await P.screenshot({ path: OUT + "mailtabs_phone.png" });
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
