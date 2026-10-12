/* v1110: an admin's saved fortress layout must reach OTHER players. Two accounts on one fake backend: A (admin) saves a layout, B opens the game afterwards and must use it.
   Before the fix B's game fetched the shared value but never applied it (shared settings were only read, the skin layout reads skinLayouts).  Run: node dev/simfork/g272_layout_share.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
async function player(b, email, name, admin) {
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 } }), errs = [];
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", email); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", name); await P.click("#ksGo"); await P.waitForTimeout(5000);
  if (admin) await P.evaluate(() => { window.KS_BACKEND.isAdmin = true; });
  return { P, errs, ctx };
}
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
  const A = await player(b, "g272a@test.dev", "Admin", true);
  const info = await A.P.evaluate(async () => {
    const kind = window.KS_BACKEND && window.KS_BACKEND.kind, shared = assetIsShared(SKIN_LAYOUT_KEY);
    skinLayouts.void = { c: [0.9, 0.5], w0: [0.2, 0.3], w1: [0.4, 0.2], w2: [0.6, 0.1], h0: [0.3, 0.4], h1: [0.7, 0.35], h2: [0.5, 0.4], h3: [0.2, 0.4], h4: [0.8, 0.4], ko: [0.1, 0.45] };
    saveSkinLayouts(); await new Promise((r) => setTimeout(r, 3000));
    return { kind, shared };
  });
  const B = await player(b, "g272b@test.dev", "Player", false);
  await B.P.waitForTimeout(4000);
  const got = await B.P.evaluate(() => ({ layout: skinLayoutFor({ id: "void" }), inCloud: !!(typeof cloudAssetMap !== "undefined" && cloudAssetMap[SKIN_LAYOUT_KEY]) }));
  console.log(JSON.stringify({ info, got, errsA: A.errs, errsB: B.errs }));
  await b.close();
  if (!process.env.NOASSERT) { assert(info.shared, "the layout is a shared admin setting on this backend"); assert(got.layout && got.layout.c && got.layout.c[0] === 0.9, "player B uses the admin's layout"); console.log("g272 ok"); }
})().catch((e) => { console.error(e); process.exit(1); });
