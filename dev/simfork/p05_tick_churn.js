/* Counts elements torn down + rebuilt per second on each screen with nothing touched (finds the 1 s render() churn). Run: node dev/simfork/p05_tick_churn.js */
/* v1249 (Harley: "that's our new sound, put it in"): the reward sound is the new "popup" one, it decodes and plays on a claim; Options has no Pickup/Chest choice. Run: node dev/simfork/g342_reward_sound.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = "/home/claude/kingdom-strategy";
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call0 = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store), DELAY = 1500;
 /* the FIRST move is slow to reach the server (cold start / bad signal), later ones are quick - so a second move can land first, like on a phone */
const call = call0;
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "arshot@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Snd"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  await P.evaluate(() => { game.state.idle.chapter = 5; game.state.idle.levelNum = 3; setScreen("conquest"); }); await P.waitForTimeout(2500);
  const screens = [["conquest"], ["heroes"], ["city"], ["city", "troops"], ["world"], ["more"]];
  for (const sc of screens) {
    await P.evaluate((sc) => setScreen(sc[0], sc[1]), sc); await P.waitForTimeout(2500);
    const r = await P.evaluate(async () => { const cnt = {}; const own = (n) => { let e = n; while (e && e !== document.body) { if (e.id) return "#" + e.id; e = e.parentElement; } return "body"; };
      const mo = new MutationObserver((ms) => ms.forEach((m) => { if (m.type !== "childList") return; const els = [...m.removedNodes].filter(n => n.nodeType === 1); if (!els.length) return; const k = own(m.target) + (m.target.offsetParent || m.target === document.body ? "" : " (hidden)"); cnt[k] = (cnt[k] || 0) + els.length; }));
      mo.observe(document.body, { childList: true, subtree: true }); await new Promise(r => setTimeout(r, 5000)); mo.disconnect();
      return Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => k + " x" + (v / 5).toFixed(1) + "/s").join("\n   "); });
    console.log("== " + sc.join("/") + " (5 s, nothing touched; elements removed+rebuilt per second):\n   " + r);
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
