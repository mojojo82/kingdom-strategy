/* v948: World-map shortcuts - 7-day sign-in calendar, Burst of Life, Deals; red dot when claimable; tap opens it. Run: node dev/simfork/g197_event_dock.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const OUT = process.env.OUT || "/tmp/";
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: +(process.env.W || 430), height: +(process.env.H || 932) } });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const C = require(path.join(ROOT, "functions/core.js")), ADMIN = require(path.join(ROOT, "functions/admins.json"))[0];
  const tpl = { name: "Burst of Life", tag: "Beginner", desc: "Boost your power and win a limited skin reward!", goal: "power", schedule: { type: "newplayer", days: 7 }, milestones: [
    { target: 50000, worth: 300, items: { gems: 100, wood: 100000, stone: 20000, gold: 10000 } }, { target: 300000, worth: 700, items: { gems: 300, speedup_construction_1h: 2 } },
    { target: 4000000, worth: 54000, items: { skin_city_titan: 1, gems: 2000 } }] };
  store["envs/test/config/events"] = { events: C.normalizeEvents([{ name: "7-Day Sign-in", icon: "📅", goal: "signin", schedule: { type: "newplayer" }, milestones: [1,2,3,4,5,6,7].map((d) => ({ items: { gems: 100 * d } })) }, tpl]) };
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "g197@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Newbie"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => setScreen("world")); await P.waitForTimeout(2500);
  const dock = () => P.evaluate(() => { const d = document.getElementById("ksEvDock"), r = d.getBoundingClientRect(); return { on: getComputedStyle(d).display !== "none", items: [].map.call(d.querySelectorAll(".ed"), (b) => b.getAttribute("data-ek") + (b.classList.contains("has") ? "!" : "")), rect: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)], vw: innerWidth,
    overlaps: ["mapMailBtn", "mapReconBtn", "ksFbBadge"].filter((id) => { const e = document.getElementById(id); if (!e || getComputedStyle(e).display === "none") return false; const q = e.getBoundingClientRect(); return q.width && !(q.right <= r.left || q.left >= r.right || q.bottom <= r.top || q.top >= r.bottom); }) }; });
  const d0 = await dock(); console.log("dock:", JSON.stringify(d0)); assert.ok(d0.on); assert.deepStrictEqual(d0.items, ["ev:7_day_sign_in!", "ev:burst_of_life", "shop"]); assert.deepStrictEqual(d0.overlaps, []); assert.ok(d0.rect[2] <= d0.vw);
  await P.screenshot({ path: OUT + "dock_" + (process.env.W || 430) + ".png" });
  /* not on other screens */
  await P.evaluate(() => setScreen("city")); await P.waitForTimeout(1200); assert.ok(!(await dock()).on, "only on World"); await P.evaluate(() => setScreen("world")); await P.waitForTimeout(1200);
  /* tap the calendar -> Events opens on the sign-in tab; claim -> dot goes */
  await P.click('#ksEvDock [data-ek="ev:7_day_sign_in"]'); await P.waitForTimeout(800);
  const tab = await P.evaluate(() => ({ open: document.getElementById("ksEvents").style.display, title: document.querySelector("#ksEvList .etitle").textContent })); assert.ok(tab.open === "flex" && tab.title === "7-Day Sign-in", JSON.stringify(tab));
  await P.click('#ksEvList [data-evi="0"]'); await P.waitForTimeout(3500); await P.click("#ksEvents [data-ex]"); await P.waitForTimeout(1500);
  const d1 = await dock(); console.log("after claim:", JSON.stringify(d1.items)); assert.deepStrictEqual(d1.items, ["ev:7_day_sign_in", "ev:burst_of_life", "shop"]);
  /* Burst tab + Deals open */
  await P.click('#ksEvDock [data-ek="ev:burst_of_life"]'); await P.waitForTimeout(600); assert.strictEqual(await P.evaluate(() => document.querySelector("#ksEvList .etitle").textContent), "Burst of Life"); await P.click("#ksEvents [data-ex]");
  await P.click('#ksEvDock [data-ek="shop"]'); await P.waitForTimeout(1200); assert.ok(await P.evaluate(() => { const o = document.getElementById("ksShop"); return !!o && getComputedStyle(o).display !== "none"; }), "shop opens");
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
