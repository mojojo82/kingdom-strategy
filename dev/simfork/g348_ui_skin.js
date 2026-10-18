/* v1265 (Harley: player-swappable UI styles): Classic is the default and untouched; Blue puts the frame art + moves the buttons onto it on Conquest only,
   nothing jumps while the skill bar/slots rebuild, other screens are left alone. Run: node dev/simfork/g348_ui_skin.js */
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
  await P.fill("#ksE", "g348@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Skin"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  await P.evaluate(() => { setScreen("conquest"); }); await P.waitForTimeout(2500);
  const classic = await P.evaluate(() => ({ skin: uiSkin(), cls: document.body.classList.contains("ui-blue"), rules: uiSkinSheet.textContent.length, nav: getComputedStyle(document.querySelector("#bottomNav .bn")).transform }));
  await P.evaluate(() => setUiSkin("blue")); await P.waitForTimeout(1500);
  const jitter = await P.evaluate(async () => { const pos = {}; for (let t = 0; t < 40; t++) { await new Promise(r => setTimeout(r, 50)); ["#idleForgeBtn", "#idleStatsBtn", ".skill-auto-btn", "#avatarWrap"].forEach((s) => { const r = document.querySelector(s).getBoundingClientRect(); (pos[s] = pos[s] || new Set()).add(Math.round(r.left) + "," + Math.round(r.top)); }); } return Object.fromEntries(Object.entries(pos).map(([k, v]) => [k, v.size])); });
  const blue = await P.evaluate(() => { const f = document.getElementById("idleForgeBtn").getBoundingClientRect(), k = innerWidth / 430; return { cls: document.body.classList.contains("ui-blue"), rules: uiSkinSheet.textContent.split("\n").length, forgeX: f.left / k, forgeW: f.width / k }; });
  await P.evaluate(() => setScreen("heroes")); await P.waitForTimeout(600);
  const other = await P.evaluate(() => ({ cls: document.body.classList.contains("ui-blue"), nav: getComputedStyle(document.querySelector("#bottomNav .bn")).transform }));
  await P.evaluate(() => { setScreen("conquest"); setUiSkin("classic"); }); await P.waitForTimeout(600);
  const back = await P.evaluate(() => ({ cls: document.body.classList.contains("ui-blue"), rules: uiSkinSheet.textContent.length }));
  console.log(JSON.stringify({ classic, jitter, blue, other, back, errs }));
  assert.strictEqual(classic.skin, "classic"); assert(!classic.cls && classic.rules === 0 && classic.nav === "none", "classic untouched");
  assert(blue.cls && blue.rules > 30, "blue applied"); assert(Math.abs(blue.forgeX - 160) < 3 && Math.abs(blue.forgeW - 110) < 3, "forge on its frame");
  Object.entries(jitter).forEach(([k, n]) => assert.strictEqual(n, 1, k + " stays put"));
  assert(!other.cls && other.nav === "none", "other screens untouched"); assert(!back.cls && back.rules === 0, "back to classic");
  assert.deepStrictEqual(errs, []); console.log("g348 ok"); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
