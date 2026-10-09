/* v995: the game shows the suspend / ban notice and stops saving; an admin rollback makes the open game reload once. Run: node dev/simfork/g219_ban_notice.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
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
  await P.fill("#ksE", "g219@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Emp"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.waitForTimeout(3000);
  const setBan = (d) => P.evaluate((d) => window.claude.use("db").then((db) => d ? db.doc("bans/" + PLAYER_ID).set(d) : db.doc("bans/" + PLAYER_ID).delete()), d);
  const o = {};
  o.before = await P.evaluate(() => ({ ov: !!document.getElementById("ksBan"), slf: saveLoadFailed, pid: PLAYER_ID }));
  await setBan({ kind: "suspend", untilMs: Date.now() + 3600e3, reason: "Duplicated gold" }); await P.waitForTimeout(800);
  o.susp = await P.evaluate(() => { const ov = document.getElementById("ksBan"); return { txt: ov ? ov.innerText : "", slf: saveLoadFailed }; });
  await setBan({ kind: "ban", reason: "" }); await P.waitForTimeout(800);
  o.ban = await P.evaluate(() => { const ov = document.getElementById("ksBan"); return { txt: ov ? ov.innerText : "", slf: saveLoadFailed }; });
  await P.screenshot({ path: process.env.SHOT || "/tmp/ban.png" });
  /* lifted -> the game reloads fresh */
  const nav = P.waitForNavigation({ timeout: 15000 }).then(() => true, () => false);
  await setBan(null); o.reloadOnLift = await nav; await P.waitForTimeout(6000);
  o.afterLift = await P.evaluate(() => ({ ov: !!document.getElementById("ksBan"), slf: saveLoadFailed }));
  /* rollback: one reload onto the restored save, not a loop */
  const at = Date.now(), nav2 = P.waitForNavigation({ timeout: 15000 }).then(() => true, () => false);
  await setBan({ kind: "restore", untilMs: at + 60000, at, reason: "rollback" }); await P.waitForTimeout(500);
  o.restoreTxt = await P.evaluate(() => { const ov = document.getElementById("ksBan"); return ov ? ov.innerText : ""; });
  o.reloadOnRestore = await nav2; await P.waitForTimeout(6000);
  o.afterRestore = await P.evaluate(() => ({ ov: !!document.getElementById("ksBan"), seen: localStorage.getItem("ksRestoreSeen") }));
  o.at = at;
  console.log(JSON.stringify(o));
  assert.ok(!o.before.ov && !o.before.slf && o.before.pid, "normal play: no notice, saving on");
  assert.ok(/Account suspended/.test(o.susp.txt) && /Duplicated gold/.test(o.susp.txt) && /Back on/.test(o.susp.txt) && o.susp.slf, "suspended: notice + no saving");
  assert.ok(/Account banned/.test(o.ban.txt) && o.ban.slf, "banned: notice");
  assert.ok(o.reloadOnLift && !o.afterLift.ov, "lifted: reload, notice gone");
  assert.ok(/Game restored/.test(o.restoreTxt) && o.reloadOnRestore && !o.afterRestore.ov && o.afterRestore.seen === String(at), "rollback: one reload, no loop");
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
