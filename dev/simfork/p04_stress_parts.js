/* v1254 (Harley): TEST-only world-map stress buttons 10/20/30 send visual-only ships ~20 tiles out; they vanish on arrival; nothing saved / sent. Run: node dev/simfork/g345_stress_ships.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call0 = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store), DELAY = 1500;
 /* the FIRST move is slow to reach the server (cold start / bad signal), later ones are quick - so a second move can land first, like on a phone */
const call = call0;
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
  await P.fill("#ksE", "p04@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Stress"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  await P.evaluate(() => { setScreen("world"); stressBarShow(); }); await P.waitForTimeout(1500);
  const cdp = await ctx.newCDPSession(P); if (process.env.THROTTLE) await cdp.send("Emulation.setCPUThrottlingRate", { rate: +process.env.THROTTLE });
  const meas = () => P.evaluate(() => new Promise((ok) => { let n = 0; const t0 = performance.now(); (function f() { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else ok(+(n / ((performance.now() - t0) / 1000)).toFixed(1)); })(); }));
  await P.evaluate(() => { stressSend(20); stressMarches.forEach((m) => { m.travelSec = 600; m.arriveAt = vnow() + 300000; }); }); await P.waitForTimeout(1500);
  const R = {};
  R.all = await meas();
  await P.addStyleTag({ content: ".march-path{display:none!important}" }); await P.waitForTimeout(500); R.noChevrons = await meas();
  await P.evaluate(() => { march3dWater = false; }); await P.waitForTimeout(500); R.noChevNoWake = await meas();
  await P.evaluate(() => { march3dOn = false; }); await P.waitForTimeout(500); R.no3d = await meas();
  await P.evaluate(() => { march3dOn = true; march3dWater = true; document.querySelectorAll("style").forEach((x) => { if (/march-path\{display:none/.test(x.textContent)) x.remove(); }); }); await P.waitForTimeout(500);
  await P.evaluate(() => { march3dOn = false; }); await P.waitForTimeout(500); R.chevronsOnly = await meas();
  await P.evaluate(() => { stressSend(0); }); await P.waitForTimeout(500); R.none = await meas();
  console.log(JSON.stringify(R)); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
