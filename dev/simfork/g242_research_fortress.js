/* v1031: Research has a 4th tab, Fortress, showing the Fortress tree (same one as More > Fortress). Run: node dev/simfork/g242_research_fortress.js */
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
  await P.fill("#ksE", "g242@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Emp"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => { game.state.researchPoints = 5e6; game.state.buildings.academy.level = 5; setScreen("city", "research"); renderTechs(); }); await P.waitForTimeout(600);
  const o = {};
  o.tabs = await P.evaluate(() => [...document.querySelectorAll("#techTabs .techtab")].map((t) => t.textContent.trim()));
  await P.evaluate(() => [...document.querySelectorAll("#techTabs .techtab")].find((t) => /Fortress/.test(t.textContent)).click()); await P.waitForTimeout(500);
  o.shown = await P.evaluate(() => { const h = document.getElementById("techFortressHost"); return { host: !!h && h.offsetHeight > 200, nodes: h.querySelectorAll(".rt-node").length, techHidden: document.getElementById("techList").style.display === "none", title: document.getElementById("tfTitle").textContent }; });
  /* the board is not rebuilt every second */
  o.stable = await P.evaluate(async () => { const b0 = document.querySelector("#techFortressHost .rt-board"); renderTechs(); renderTechs(); return document.querySelector("#techFortressHost .rt-board") === b0; });
  /* upgrade a root node from here */
  o.up = await P.evaluate(async () => { const st = game.state, m0 = JSON.stringify(st.fortressTech || {}); const n = document.querySelector("#techFortressHost .rt-node.can"); n.click(); await new Promise((r) => setTimeout(r, 200)); const btn = document.getElementById("ftUpBtn"); if (btn) btn.click(); await new Promise((r) => setTimeout(r, 200)); return JSON.stringify(st.fortressTech || {}) !== m0; });
  await P.evaluate(() => { const p = document.getElementById("rtPop"); if (p) p.style.display = "none"; document.getElementById("techTabs").scrollIntoView(); }); await P.waitForTimeout(200);
  await P.screenshot({ path: (process.env.OUT || "/tmp/") + "research_fortress.png" });
  /* back to Growth, then More > Fortress still has the tree */
  await P.evaluate(() => [...document.querySelectorAll("#techTabs .techtab")].find((t) => /Growth/.test(t.textContent)).click()); await P.waitForTimeout(300);
  o.growth = await P.evaluate(() => document.getElementById("techList").style.display !== "none" && document.getElementById("techFortressHost").style.display === "none");
  await P.evaluate(() => { setScreen("more"); const t = [...document.querySelectorAll(".techtab")].find((x) => /Fortress/.test(x.textContent) && x.closest("#mapModeTabs, .maptabs, #modeTabs") ); if (t) t.click(); else { mapMode = "fortress"; fortressBodyHome(); document.getElementById("fortressModeContent").style.display = ""; renderFortress(); } }); await P.waitForTimeout(400);
  o.more = await P.evaluate(() => document.getElementById("fortressBody").parentNode.id + ":" + document.querySelectorAll("#fortressModeContent .rt-node").length);
  console.log(JSON.stringify(o), errs);
  assert.deepStrictEqual(o.tabs.map((t) => t.replace(/^\S+\s/, "")), ["Growth", "Economy", "Battle", "Fortress"]);
  assert.ok(o.shown.host && o.shown.nodes > 5 && o.shown.techHidden && /Fortress/.test(o.shown.title), "fortress tree shows in Research");
  assert.ok(o.stable, "not rebuilt every tick");
  assert.ok(o.up, "can upgrade from the Research tab");
  assert.ok(o.growth, "Growth tab back to normal");
  assert.ok(/^fortressModeContent:\d+$/.test(o.more) && +o.more.split(":")[1] > 5, "More > Fortress still has the tree");
  assert.deepStrictEqual(errs, []);
  await b.close(); console.log("g242 OK");
})().catch((e) => { console.error(e); process.exit(1); });
