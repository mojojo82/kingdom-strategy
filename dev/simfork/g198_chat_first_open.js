/* v949: World chat shows messages the first time you open it (Harley: empty until switching to Alliance and back). Run: node dev/simfork/g198_chat_first_open.js */
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
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "g198@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Newbie"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const path_ = await P.evaluate(() => "envs/test/" + worldChatPath());
  const t0 = Date.now(); for (let i = 0; i < 40; i++) store[path_ + "/" + (t0 + i) + "_other"] = { pid: "other", name: "Other", text: "hello " + i, ts: t0 + i };
  await P.evaluate(() => window.__fbNotify && window.__fbNotify()); await P.waitForTimeout(1500);
  const pre = await P.evaluate(() => ({ wchatOn: WCHAT.on, n: WCHAT.msgs.length, preview: document.getElementById("chatPreviewLines").textContent }));
  console.log("before opening:", JSON.stringify(pre));
  await P.click("#chatPreview"); await P.waitForTimeout(800);
  const shown = () => P.evaluate(() => { const el = document.getElementById("chatMessages"); return { msgs: el.querySelectorAll(".chat-msg, [data-key]").length, text: el.textContent.slice(0, 80), offsetParent: !!el.offsetParent, bottom: el.scrollHeight - el.scrollTop - el.clientHeight < 40 }; });
  const s1 = await shown(); console.log("first open:", JSON.stringify(s1));
  /* a new message arriving while it's open */
  store[path_ + "/" + (t0 + 99) + "_other"] = { pid: "other", name: "Other", text: "while open", ts: t0 + 99 }; await P.evaluate(() => window.__fbNotify && window.__fbNotify()); await P.waitForTimeout(1200);
  const s2 = await shown(); console.log("new msg while open:", JSON.stringify(s2));
  await P.screenshot({ path: OUT + "chat_first_open.png" });
  assert.ok(s1.msgs >= 40, "messages there the first time"); assert.ok(s1.bottom, "opens at the newest message"); assert.ok(/while open/.test(await P.evaluate(() => document.getElementById("chatMessages").textContent)), "live message shows");
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
