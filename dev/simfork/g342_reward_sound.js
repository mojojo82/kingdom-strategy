/* v1249 (Harley: "that's our new sound, put it in"): the reward sound is the new "popup" one, it decodes and plays on a claim; Options has no Pickup/Chest choice. Run: node dev/simfork/g342_reward_sound.js */
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
  await P.fill("#ksE", "g342@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Snd"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  const o = await P.evaluate(async () => {
    const buf = await ensureRewardSfxBuf("popup"); let played = 0; const orig = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function () { if (this.buffer === rewardSfxBuf.popup) played++; return orig.apply(this, arguments); };
    soundFxEnabled = true; sfxReward();
    let opt = ""; try { setScreen("more", "options"); renderOptionsScreen(); opt = document.body.innerText; } catch (e) { opt = "ERR " + e.message; }
    return { pick: rewardSfxPick, dur: buf ? +buf.duration.toFixed(2) : 0, played, optOk: !/ERR/.test(opt) && opt.length > 50, choice: !!document.querySelector("[data-rsfx]") };
  });
  console.log(JSON.stringify({ o, errs }));
  await b.close();
  assert.deepStrictEqual(errs, []);
  assert.strictEqual(o.pick, "popup"); assert(o.dur > 1.2 && o.dur < 1.8, "about 1.4 s: " + o.dur); assert.strictEqual(o.played, 1, "sfxReward plays it");
  assert(o.optOk && !o.choice, "Options still renders, no Pickup/Chest choice");
  console.log("g342 ok");
})().catch((e) => { console.error(e); process.exit(1); });
