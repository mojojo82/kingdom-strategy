/* v1211 (Harley): the profile's bottom buttons are Power Details / Battle Stats / Achievements / Share Profile; the old ones live in Dev Tools.
   (Template was g327:) the Overlord Profile ship shows the equipped weapons' barrels like Conquest. For each skin: equip Missiles + Laser + Railgun,
   open the profile, check the ship picture is the ship+barrels composite; with no barrel weapons it's the plain ship.
   SHOTS=dir saves profile + Conquest pictures per skin. Run: node dev/simfork/g328_profile_buttons.js */
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
  await P.fill("#ksE", "g328@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Guns"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  const out = {}; const sh = process.env.SHOTS;
  await P.evaluate(() => { game.state.arena.record = { wins: 7, losses: 3, draws: 0 }; openGovProfile(); });
  out.labels = await P.evaluate(() => [...document.querySelectorAll("#govProfileOverlay .gp-btns button")].map((b) => b.textContent));
  if (sh) await P.screenshot({ path: sh + "/profile.png" });
  for (const [id, sel, name] of [["gpPowerBtn", "#powerDetailsOverlay", "power"], ["gpStatsBtn", "#profileInfoOverlay", "stats"], ["gpAchBtn", "#profileInfoOverlay", "ach"]]) {
    await P.click("#" + id); await P.waitForTimeout(300);
    out[name] = await P.evaluate((sel) => { const o = document.querySelector(sel); return o && o.style.display === "flex" ? o.innerText.replace(/\s+/g, " ").slice(0, 300) : null; }, sel);
    if (sh) await P.screenshot({ path: sh + "/" + name + ".png" });
    await P.evaluate((sel) => { document.querySelector(sel).style.display = "none"; }, sel);
  }
  await P.evaluate(() => { navigator.clipboard.writeText = (t) => { window.__copied = t; return Promise.resolve(); }; try { delete Navigator.prototype.share; } catch (e) {} });
  await P.click("#gpShareBtn"); await P.waitForTimeout(200); out.share = await P.evaluate(() => window.__copied || null);
  out.dev = await P.evaluate(() => { closeGovProfile(); document.getElementById("devSaveDataBtn").click(); const a = document.getElementById("saveDataOverlay").style.display; document.getElementById("saveDataCloseBtn").click(); document.getElementById("devDevNotesBtn").click(); const b = document.getElementById("devNotesOverlay").style.display; return [a, b]; });
  console.log(JSON.stringify({ out, errs }, null, 1));
  await b.close();
  assert.deepStrictEqual(errs, []);
  assert.deepStrictEqual(out.labels, ["Power Details", "Battle Stats", "Achievements", "Share Profile"]);
  assert(out.power && /Power Details/.test(out.power)); assert(out.stats && /7 \/ 3 \/ 0/.test(out.stats) && /70%/.test(out.stats)); assert(out.ach && /coming soon/.test(out.ach));
  assert(out.share && /Guns/.test(out.share)); assert.deepStrictEqual(out.dev, ["flex", "flex"]);
  console.log("g328 ok");
})().catch((e) => { console.error(e); process.exit(1); });
