/* v925: Intel & Recon button on the World map (stacked with the map mailbox). Phone + PC screenshots, tap opens Recon, back keeps the map spot.
   Run: node dev/simfork/g184_maprecon.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const OUT = process.env.OUT || "/tmp/";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  async function run(vp, tag, email) {
    const ctx = await b.newContext({ viewport: vp });
    await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
    await ctx.exposeFunction("__fbcall", call);
    await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
    await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
    await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(tag + ": " + e.message));
    await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
    await P.fill("#ksE", email); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
    await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Scout"); await P.click("#ksGo"); await P.waitForTimeout(5000);
    await P.evaluate(() => setScreen("world")); await P.waitForTimeout(1200);
    const geo = await P.evaluate(() => { const r = (id) => { const e = document.getElementById(id); if (!e) return null; const b = e.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height), shown: getComputedStyle(e).display !== "none" }; }; return { recon: r("mapReconBtn"), mail: r("mapMailBtn"), top: r("mailBtn"), mailOn: document.documentElement.classList.contains("ks-mail-on") }; });
    await P.screenshot({ path: OUT + "map_recon_" + tag + ".png" });
    const before = await P.evaluate(() => { const v = document.getElementById("mapviewport"); return [v.scrollLeft, v.scrollTop]; });
    await P.click("#mapReconBtn"); await P.waitForTimeout(800);
    const opened = await P.evaluate(() => appScreen + "/" + appSub + " mode=" + mapMode);
    await P.evaluate(() => setScreen("world")); await P.waitForTimeout(1000);
    const after = await P.evaluate(() => { const v = document.getElementById("mapviewport"); return [v.scrollLeft, v.scrollTop]; });
    console.log(tag, "| recon button", JSON.stringify(geo.recon), "| mail button", JSON.stringify(geo.mail), "| tap ->", opened, "| map spot kept:", before[0] === after[0] && before[1] === after[1]);
    assert.ok(geo.recon && geo.recon.shown && geo.recon.w === 46); assert.ok(!geo.mail.shown || Math.abs(geo.mail.y - geo.recon.y) >= 50, "not on top of the mailbox");
    assert.ok(geo.mailOn && geo.mail.shown && geo.mail.y + 46 <= geo.recon.y, "v929: mailbox above recon"); assert.ok(!geo.top.shown, "v929: no top-bar mail");
    assert.strictEqual(opened, "more/recon mode=recon"); assert.ok(before[0] === after[0] && before[1] === after[1]);
    await P.click("#mapMailBtn"); await P.waitForTimeout(600); assert.ok(await P.evaluate(() => document.body.classList.contains("mail-open")), "map mailbox opens mail");
    await ctx.close();
  }
  await run({ width: 430, height: 932 }, "phone", "g184a@test.dev");
  await run({ width: 1400, height: 900 }, "pc", "g184b@test.dev");
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
