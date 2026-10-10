/* v1031/v1032: Research hub (cards per tree incl. Fortress I + III); both fortress trees researchable. Run: node dev/simfork/g242_research_fortress.js */
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
  o.hub = await P.evaluate(() => ({ banners: [...document.querySelectorAll("#techList .rh-banner")].map((x) => x.textContent), cards: [...document.querySelectorAll("#techList .rh-card")].map((c) => c.querySelector(".rh-nm").textContent + " " + c.querySelector(".rh-cnt").textContent + (c.querySelector(".rh-badge") ? " " + c.querySelector(".rh-badge").textContent : "")), tabsHidden: document.getElementById("techTabs").style.display === "none" }));
  await P.evaluate(() => { game.researchTech("pavedRoads"); persist(); renderTechs(); }); await P.waitForTimeout(300);
  o.run = await P.evaluate(() => ({ badge: document.querySelector('#techList .rh-card[data-rh="growth"] .rh-badge').textContent, q: document.getElementById("rhQ").innerText.replace(/\s+/g, " ") }));
  await P.screenshot({ path: (process.env.OUT || "/tmp/") + "research_hub.png", fullPage: false });
  /* open Fortress III, research a node (not the active type) */
  await P.evaluate(() => document.querySelector('#techList .rh-card[data-rh="fortress3"]').click()); await P.waitForTimeout(400);
  o.f3 = await P.evaluate(() => { const h = document.getElementById("techFortressHost"); return { nodes: h.querySelectorAll(".rt-node").length, title: document.getElementById("tfTitle").textContent, back: !!document.querySelector("#techTabs .rh-back"), name: document.querySelector("#techTabs .rh-tname").textContent }; });
  o.stable = await P.evaluate(() => { const b0 = document.querySelector("#techFortressHost .rt-board"); renderTechs(); renderTechs(); return document.querySelector("#techFortressHost .rt-board") === b0; });
  o.up3 = await P.evaluate(async () => { const st = game.state; const n = document.querySelector("#techFortressHost .rt-node.can"); const k = n.getAttribute("data-k"); n.click(); await new Promise((r) => setTimeout(r, 200)); document.getElementById("ftUpBtn").click(); await new Promise((r) => setTimeout(r, 200)); return { k, lv: st.fortressTech[k] || 0, type: fortressTypeOf(st.fortressTech) }; });
  await P.evaluate(() => { const p = document.getElementById("rtPop"); if (p) p.style.display = "none"; });
  await P.screenshot({ path: (process.env.OUT || "/tmp/") + "research_f3.png" });
  /* back, then Fortress I */
  await P.evaluate(() => document.querySelector("#techTabs .rh-back").click()); await P.waitForTimeout(300);
  o.backHub = await P.evaluate(() => !!document.querySelector("#techList .rh-grid") && document.getElementById("techList").style.display !== "none" && document.getElementById("techFortressHost").style.display === "none");
  await P.evaluate(() => document.querySelector('#techList .rh-card[data-rh="fortress1"]').click()); await P.waitForTimeout(400);
  o.f1 = await P.evaluate(() => document.getElementById("tfTitle").textContent + ":" + document.querySelectorAll("#techFortressHost .rt-node").length);
  await P.evaluate(() => { document.querySelector("#techTabs .rh-back").click(); document.querySelector('#techList .rh-card[data-rh="battle"]').click(); }); await P.waitForTimeout(300);
  o.battle = await P.evaluate(() => document.querySelectorAll("#techList .rt-node").length);
  /* More > Fortress still has the (active) tree */
  await P.evaluate(() => { mapMode = "fortress"; fortressViewType = null; fortressBodyHome(); document.getElementById("fortressModeContent").style.display = ""; renderFortress(); }); await P.waitForTimeout(300);
  o.more = await P.evaluate(() => document.getElementById("fortressBody").parentNode.id + ":" + document.querySelectorAll("#fortressModeContent .rt-node").length);
  console.log(JSON.stringify(o), errs);
  assert.deepStrictEqual(o.hub.banners, ["Economy", "Warfare"]);
  assert.deepStrictEqual(o.hub.cards.map((c) => c.split(" ").slice(0, c.startsWith("Fortress") ? 2 : 1).join(" ")), ["Growth", "Economy", "Battle", "Fortress I", "Fortress III"]);
  assert.ok(o.hub.tabsHidden && o.hub.cards.some((c) => /👍/.test(c)), "hub shows, 👍 where research is possible");
  assert.ok(o.run.badge === "⏳" && /Paved Roads Lv1/.test(o.run.q), "researching tree shows ⏳ and the bottom bar");
  assert.ok(o.f3.nodes > 5 && /III/.test(o.f3.title) && o.f3.back && /Fortress III/.test(o.f3.name), "Fortress III tree opens");
  assert.ok(o.stable, "not rebuilt every tick");
  assert.ok(o.up3.lv === 1 && o.up3.type === 1, "can research Fortress III while Fortress I is active");
  assert.ok(o.backHub, "back to the hub");
  assert.ok(/Fortress I —/.test(o.f1) && +o.f1.split(":")[1] > 5, "Fortress I tree opens");
  assert.ok(o.battle >= 5, "Battle tree opens");
  assert.ok(/^fortressModeContent:\d+$/.test(o.more) && +o.more.split(":")[1] > 5, "More > Fortress still has the tree");
  assert.deepStrictEqual(errs, []);
  await b.close(); console.log("g242 OK");
})().catch((e) => { console.error(e); process.exit(1); });
