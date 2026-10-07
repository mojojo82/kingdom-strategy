/* v939: message-only mail (no items): no Claim button, opening it marks it read (server claimedAt), unread badge clears, no "Items" section.
   Run: node dev/simfork/g189_mailmsg.js */
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
  await A.goto(T); await A.waitForSelector("#ksAuth .box"); await A.fill("#ksE", "msg@test.dev"); await A.fill("#ksP", "secret123"); await A.click("#ksUp");
  await A.waitForSelector("#ksN", { timeout: 15000 }); await A.fill("#ksN", "Msgy"); await A.click("#ksGo"); await A.waitForTimeout(5000);
  const uid = await A.evaluate(() => PLAYER_ID), M = "envs/test/players/" + uid + "/mail/", now = Date.now();
  store[M + "m_msg"] = C.makeMail("Server news", "Maintenance tonight at 9pm.", {}, "adm", now - 2000, "system");
  store[M + "m_gift"] = C.makeMail("Gift", "", { wood: 5 }, "adm", now - 1000, "system");
  await A.evaluate(() => window.__fbNotify()); await A.waitForTimeout(600);
  const st = () => A.evaluate(() => ({ badge: (document.getElementById("mapMailBadge") || {}).textContent, rows: [].map.call(document.querySelectorAll("#mailList .mi"), (r) => ({ t: r.querySelector(".mtt").textContent, claimBtn: !!r.querySelector("[data-claim]"), line: (r.querySelector(".mcl") || {}).textContent || "" })) }));
  await A.evaluate(() => { setScreen("world"); document.getElementById("mapMailBtn").click(); }); await A.waitForTimeout(500);
  const s0 = await st(); console.log("before:", JSON.stringify(s0));
  const msgRow0 = s0.rows.find((r) => /news/.test(r.t)), giftRow0 = s0.rows.find((r) => /Gift/.test(r.t));
  assert.ok(msgRow0 && !msgRow0.claimBtn, "message-only mail has no Claim button"); assert.ok(giftRow0 && giftRow0.claimBtn, "item mail still has Claim");
  assert.strictEqual(s0.badge, "2", "both count as unread");
  await A.evaluate(() => document.querySelector('#mailList [data-open="m_msg"]').click()); await A.waitForTimeout(800);
  const det = await A.evaluate(() => ({ body: (document.querySelector("#mailList .dbody") || {}).textContent, itemsHdr: !!document.querySelector("#mailList .dlab"), footClaim: !!document.querySelector("#mailFoot [data-claim]"), footText: document.getElementById("mailFoot").textContent }));
  console.log("detail:", JSON.stringify(det)); assert.ok(/Maintenance/.test(det.body)); assert.ok(!det.itemsHdr && !det.footClaim, "no items section, no Claim");
  assert.ok(store[M + "m_msg"].claimedAt > 0, "opening marked it read on the server");
  await A.evaluate(() => window.__fbNotify()); await A.waitForTimeout(500);
  await A.evaluate(() => document.querySelector('#mailPanel [data-act="back"]') ? document.querySelector('#mailPanel [data-act="back"]').click() : null); await A.waitForTimeout(400);
  const s1 = await st(); console.log("after:", JSON.stringify(s1));
  assert.strictEqual(s1.badge, "1", "only the gift is still unread"); assert.ok(/Read/.test(s1.rows.find((r) => /news/.test(r.t)).line));
  await A.screenshot({ path: OUT + "mail_msg.png" });
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
