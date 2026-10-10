/* v1021: the map look (tile size, base art size, base height) is one shared setting: an admin's values reach every player, so bases sit on their
   squares the same for everyone. Two players on one fake backend. Run: node dev/simfork/g236_shared_map_look.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  const mk = async (email, name, pre) => {
    const ctx = await b.newContext({ viewport: { width: 430, height: 932 } });
    if (pre) await ctx.addInitScript(pre);
    await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
    await ctx.exposeFunction("__fbcall", call);
    await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
    await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
    await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(name + ": " + e.message));
    await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
    await P.fill("#ksE", email); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
    await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", name); await P.click("#ksGo"); await P.waitForTimeout(5000);
    return P;
  };
  /* the admin already tuned the look on their own account (old per-account copy in their browser) */
  const A = await mk("g236a@test.dev", "Admin");
  await A.evaluate(() => { isoCfg.base = 3.6; isoCfg.y = 14; KS_BACKEND.isAdmin = true; }); await A.waitForTimeout(19000);
  const o = { aCfg: await A.evaluate(() => JSON.stringify(isoCfg)), doc: (Object.entries(store).find(([k]) => /assetitems\/_mapiso$/.test(k)) || [])[1] || null };
  const B = await mk("g236b@test.dev", "Bravo");
  await B.evaluate(() => cloudDb.doc("players/" + PLAYER_ID + "/assetitems/g236ping").set({ data: "1" })); await B.waitForTimeout(800);
  o.bCfg = await B.evaluate(() => JSON.stringify(isoCfg));
  /* admin moves the Base height slider: B follows */
  await A.evaluate(() => { const el = document.getElementById("devIsoY"); el.value = -8; el.dispatchEvent(new Event("input")); }); await A.waitForTimeout(1500);
  o.docAfter = (Object.entries(store).find(([k]) => /assetitems\/_mapiso$/.test(k)) || [])[1] || null; o.aY = await A.evaluate(() => isoCfg.y);
  await B.evaluate(() => cloudDb.doc("players/" + PLAYER_ID + "/assetitems/g236ping").set({ data: "2" })); await B.waitForTimeout(800);
  o.bCfg2 = await B.evaluate(() => JSON.stringify(isoCfg));
  /* an old per-account copy arriving later doesn't override the shared look */
  o.bAfterOld = await B.evaluate(() => { try { localStorage.setItem("kingdom_prototype_mapisocfg_v2", JSON.stringify({ tile: 30, base: 3.2, y: 0 })); } catch (e) {} return isoSharedOn; });
  console.log(JSON.stringify(o));
  assert.ok(o.doc && o.doc.base === 3.6 && o.doc.y === 14, "the admin's tuned look was published");
  assert.strictEqual(o.bCfg, o.aCfg, "a new player gets the admin's look");
  assert.ok(/"y":-8/.test(o.bCfg2), "admin slider changes reach other players");
  assert.ok(o.bAfterOld, "shared look is in charge");
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
