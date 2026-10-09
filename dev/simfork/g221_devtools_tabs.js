/* v998: Dev Tools moved to More > Dev Tools as category tabs + tool chips (admin only), remembers the last tool, Conquest popup still works. Run: node dev/simfork/g221_devtools_tabs.js */
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
  await P.fill("#ksE", "g221@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Emp"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const o = {};
  o.hiddenForPlayers = await P.evaluate(() => { const t = document.querySelector("#moreMenu .mm-dev"); return !!t && getComputedStyle(t).display === "none" && document.documentElement.classList.contains("ks-noadmin"); });
  await P.evaluate(() => document.documentElement.classList.remove("ks-noadmin")); /* act as the admin */
  await P.evaluate(() => setScreen("more", "menu")); await P.waitForTimeout(400);
  await P.click("#moreMenu .mm-dev"); await P.waitForTimeout(600);
  o.open = await P.evaluate(() => ({ sub: document.body.getAttribute("data-sub"), inScreen: document.getElementById("devToolsPanel").parentNode.id, tabs: [...document.querySelectorAll("#devToolsPanel .dt-tab")].map((t) => t.textContent), on: document.querySelector("#devToolsPanel .dt-tab.on").textContent, chips: [...document.querySelectorAll("#devToolsPanel .dt-chip")].map((c) => c.textContent), visibleSubs: [...document.querySelectorAll("#devToolsPanel .dev-sub")].filter((d) => d.offsetParent).length, speed: !!document.querySelector("#devSpeedBtns .dev-speed-btn") && !!document.getElementById("devSpeedBtns").offsetParent, bar: document.getElementById("screenBar").textContent }));
  await P.screenshot({ path: (process.env.OUT || "/tmp/") + "devtools_tabs.png" });
  /* pick Combat > Heroes & Skills */
  await P.click('#devToolsPanel .dt-tab:has-text("Combat")'); await P.waitForTimeout(300);
  await P.click('#devToolsPanel .dt-chip:has-text("Heroes")'); await P.waitForTimeout(400);
  o.heroes = await P.evaluate(() => ({ chips: [...document.querySelectorAll("#devToolsPanel .dt-chip")].map((c) => c.textContent), shown: [...document.querySelectorAll("#devToolsPanel .dev-sub")].filter((d) => d.offsetParent).map((d) => d.querySelector(".dev-sub-header").getAttribute("data-target")), saved: localStorage.getItem("ksDevTab") }));
  await P.screenshot({ path: (process.env.OUT || "/tmp/") + "devtools_heroes.png" });
  /* Balance > USD renders its table on open (reveal hook) */
  await P.click('#devToolsPanel .dt-tab:has-text("Balance")'); await P.click('#devToolsPanel .dt-chip:has-text("USD")'); await P.waitForTimeout(500);
  o.usd = await P.evaluate(() => (document.getElementById("devUsdTable") || {}).children ? document.getElementById("devUsdTable").children.length : -1);
  /* Conquest 🛠️ popup still opens the same tools, and gives them back */
  await P.evaluate(() => setScreen("conquest")); await P.waitForTimeout(800);
  const hasIcon = await P.evaluate(() => !!document.querySelector(".idle-util-icons .idle-util-btn[title='Dev Tools']"));
  if (hasIcon) { await P.click(".idle-util-icons .idle-util-btn[title='Dev Tools']"); await P.waitForTimeout(400); }
  o.popup = await P.evaluate(() => ({ inPopup: document.getElementById("devToolsPanel").closest("#utilPopup") != null, tabs: document.querySelectorAll("#utilPopup .dt-tab").length }));
  await P.evaluate(() => document.getElementById("upX").click()); await P.waitForTimeout(200);
  await P.evaluate(() => devScreenOpen()); await P.waitForTimeout(300);
  o.back = await P.evaluate(() => ({ host: document.getElementById("devToolsPanel").parentNode.id, on: document.querySelector("#devToolsPanel .dt-tab.on").textContent, chip: document.querySelector("#devToolsPanel .dt-chip.on").textContent }));
  console.log(JSON.stringify(o));
  assert.ok(o.hiddenForPlayers, "tile hidden for normal players");
  assert.ok(o.open.sub === "devtools" && o.open.inScreen === "devScreen" && o.open.tabs.length >= 4 && o.open.visibleSubs === 1 && /Dev Tools/.test(o.open.bar), "opens as a More screen with tabs, one tool showing");
  assert.ok(o.heroes.shown.length === 1 && o.heroes.shown[0] === "devSubHeroes" && /combat\|devSubHeroes/.test(o.heroes.saved), "picked tool shows alone and is remembered");
  assert.ok(o.usd > 0, "USD tool renders when opened");
  assert.ok(!hasIcon || (o.popup.inPopup && o.popup.tabs >= 4), "Conquest popup still works");
  assert.ok(o.back.host === "devScreen" && /Balance/.test(o.back.on) && /USD/.test(o.back.chip), "back on the More screen, same tool");
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
