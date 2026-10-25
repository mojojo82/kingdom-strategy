/* v1183 (Harley): Hall of Heroes deleted. No such building in the list; a brand-new account can recruit a hero straight away; an old save that still has
   a tavern level loads fine. Run: node dev/simfork/g303_no_hall.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "g303@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "NoHall"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const o = await P.evaluate(async () => {
    const st = game.state, out = {};
    out.inDefs = "tavern" in BUILDING_DEFS; out.inState = "tavern" in st.buildings;
    setScreen("city", "buildings"); await new Promise((r) => setTimeout(r, 800));
    out.listed = /Hall of Heroes/.test(document.getElementById("buildingsModeContent").innerText);
    const key = Object.keys(HERO_DEFS).find((k) => !st.heroes[k].owned && !HERO_DEFS[k].vipOnly && !HERO_DEFS[k].comingSoon && HERO_DEFS[k].recruitCost);
    /* v1436: recruiting needs 1 fragment of that hero, no gold */
    out.noFrag = game.recruitHero(key).reason; const gold0 = st.resources.gold; game.grantFragments(key, 1);
    out.th = st.buildings.townhall.level; out.recruit = game.recruitHero(key); out.owned = st.heroes[key].owned; out.goldSame = st.resources.gold === gold0; out.fragKept = st.heroes[key].fragments;
    const save = JSON.parse(JSON.stringify(st)); save.buildings.tavern = { level: 5, upgrading: null, queue: [] };
    try { game.loadState ? game.loadState(save) : null; out.loadOk = true; } catch (e) { out.loadOk = String(e); }
    out.after = "tavern" in game.state.buildings;
    return out; });
  await P.evaluate(() => setScreen("heroes")); await P.waitForTimeout(1000);
  const locked = await P.evaluate(() => /Requires Hall of Heroes/.test(document.body.innerText));
  console.log(JSON.stringify({ o, locked, errs }));
  await b.close();
  if (!process.env.NOASSERT) {
    assert.deepStrictEqual(errs, []);
    assert(!o.inDefs && !o.inState && !o.listed, "no Hall of Heroes building");
    assert(o.th <= 2 && o.recruit.ok && o.owned, "new account recruits without it");
    assert(o.noFrag === "need_fragment" && o.goldSame && o.fragKept === 1, "v1436: needs 1 fragment, costs no gold, fragment kept");
    assert(o.loadOk === true && !o.after, "old save with a tavern level loads");
    assert(!locked, "no 'Requires Hall of Heroes' lock anywhere");
    console.log("g303 ok");
  }
})().catch((e) => { console.error(e); process.exit(1); });
