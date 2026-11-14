const fs = require("fs"), path = require("path");
const ROOT = "/home/claude/kingdom-strategy", OUTD = __dirname + "/" + (process.env.CAPD || "car");
const { chromium } = require("playwright");
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  fs.rmSync(OUTD, { recursive: true, force: true }); fs.mkdirSync(OUTD);
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, require(path.join(ROOT, "dev/tests/siteroute.js"))(GAME));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/", { timeout: 120000 }); await P.waitForSelector("#ksAuth .box", { timeout: 120000 });
  await P.fill("#ksE", "sc" + Date.now() + "@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 120000 }); await P.fill("#ksN", "PipTest"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => { const st = game.state; ["caelum", "kessa", "lyra"].forEach((k) => { st.heroes[k].owned = true; st.heroes[k].level = 40; st.heroes[k].skillLevels = { conquest: [3, 5, 3], expedition: [1, 1, 1] }; }); st.conquestRoster = ["caelum", "kessa", "lyra"]; document.querySelectorAll(".ks-update, #ksUpdate").forEach((e) => e.remove()); setScreen("more", "arena"); });
  await P.waitForTimeout(3000);
  await P.evaluate(() => { const st = game.state; ["caelum", "kessa", "lyra"].forEach((k) => { st.heroes[k].owned = true; st.heroes[k].level = 40; }); st.conquestRoster = ["caelum", "kessa", "lyra"]; });
  await P.waitForTimeout(4000);
  await P.evaluate(() => evWinOpen("brt")); await P.waitForTimeout(1200); await P.screenshot({ path: OUTD + "/t1_tab.png" });
  console.log("tabs", await P.evaluate(() => JSON.stringify({ open: game.evBRKey(), tabs: [...document.querySelectorAll("#evWin [data-evtab]")].map((b) => b.getAttribute("data-evtab")) })));
  await P.evaluate(() => document.querySelector("[data-ebrtest]").click()); await P.waitForTimeout(2500);
  console.log("pre", await P.evaluate(() => JSON.stringify({ test: arenaOpponent && arenaOpponent.kaijuTest, btn: document.getElementById("arenaAttackBtn").textContent, log: document.getElementById("arenaLog").textContent })));
  for (let r = 0; r < 2; r++) {
    await P.evaluate(() => document.getElementById("arenaAttackBtn").click()); await P.waitForTimeout(r ? 63000 : 20000);
    if (!r) { await P.screenshot({ path: OUTD + "/t2_fight.png" }); await P.waitForTimeout(43000); }
    console.log("fight" + r, await P.evaluate(() => JSON.stringify({ run: arenaBattleRunning, res: document.getElementById("arenaResult").textContent, br: game.state.ev && game.state.ev.br || null })));
  }
  console.log("store", JSON.stringify(Object.keys(store).filter((k) => /bosslb/.test(k))));
  await P.evaluate(() => document.getElementById("arenaNewOpponentBtn").click()); await P.waitForTimeout(1200);
  console.log("back", await P.evaluate(() => JSON.stringify({ view: arenaView, opp: !!arenaOpponent, tab: EVW.tab })));
  console.log("errs", errs.slice(0, 5)); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
