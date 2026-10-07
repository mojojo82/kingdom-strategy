/* v923: leaving the World map (Conquest) and coming back must keep the map where you left it. Run: node dev/simfork/g183_mapkeep.js (GAMEFILE=, NOASSERT=1) */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, hasTouch: true, isMobile: true });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "g183@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Mapper"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const pos = () => P.evaluate(() => { const v = document.getElementById("mapviewport"); return { L: Math.round(v.scrollLeft), T: Math.round(v.scrollTop) }; });
  const clickNav = async (label) => { await P.evaluate((label) => { const el = [].find.call(document.querySelectorAll("#bottomNav *, .bottom-nav *, nav *"), (x) => x.children.length <= 3 && (x.textContent || "").trim() === label); if (el) el.click(); else setScreen(label.toLowerCase()); }, label); await P.waitForTimeout(800); };
  await clickNav("World"); await P.waitForTimeout(1000);
  const home = await pos();
  /* the player drags the map somewhere else */
  await P.evaluate(() => { const v = document.getElementById("mapviewport"); v.scrollLeft += 900; v.scrollTop += 600; v.dispatchEvent(new Event("scroll")); try { mapUserMovedMap = true; } catch (e) {} });
  await P.waitForTimeout(600);
  const left = await pos();
  await clickNav("Conquest"); await P.waitForTimeout(1500);
  await clickNav("World"); await P.waitForTimeout(1200);
  const back = await pos();
  const moved = Math.hypot(back.L - left.L, back.T - left.T);
  console.log("home view", JSON.stringify(home), "| left the map at", JSON.stringify(left), "| came back to", JSON.stringify(back), "| off by", Math.round(moved), "px");
  /* an explicit jump (e.g. a shared location / march / report) must still go where it was asked to */
  await clickNav("Conquest"); await P.waitForTimeout(800);
  const jump = await P.evaluate(async () => { const home = mapTileById(game.state.map, game.state.homeTileId), far = mapTileAt(game.state.map, (home.x + 300) % 1100 + 40, (home.y + 200) % 1100 + 40); setScreen("world"); centerMapOnTile(far.id);
    await new Promise((r) => setTimeout(r, 1500)); const v = document.getElementById("mapviewport"), pos = (typeof tilePos === "function") ? null : null; return { L: v.scrollLeft, T: v.scrollTop }; });
  const jumpOff = Math.hypot(jump.L - left.L, jump.T - left.T); console.log("explicit jump to a far tile -> moved", Math.round(jumpOff), "px away from the old spot (must be far)");
  await P.evaluate(() => { const v = document.getElementById("mapviewport"); v.scrollLeft = window.__L0; });
  await P.evaluate((l) => { const v = document.getElementById("mapviewport"); v.scrollLeft = l.L; v.scrollTop = l.T; }, left);
  const others = [];
  for (const tab of ["City", "Heroes", "More"]) { await clickNav(tab); await P.waitForTimeout(700); await clickNav("World"); await P.waitForTimeout(900); const p2 = await pos(); others.push(tab + ":" + Math.round(Math.hypot(p2.L - left.L, p2.T - left.T)) + "px"); }
  console.log("round trips via other tabs, off by:", others.join(" "));
  const othersBad = others.filter((x) => +x.split(":")[1].replace("px", "") > 2);
  console.log("errs", errs.slice(0, 3));
  if (!process.env.NOASSERT) { assert.ok(moved <= 2, "map kept where you left it"); assert.deepStrictEqual(othersBad, [], "every tab keeps it"); assert.ok(jumpOff > 2000, "explicit jump wins"); assert.deepStrictEqual(errs, []); console.log("ALL OK"); }
  await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
