/* v1035: built-in card art for the 18 named cards; an admin upload still wins. Run: node dev/simfork/g245_card_art.js */
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
  await P.fill("#ksE", "g245@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Emp"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => { setScreen("more", "cards"); renderCards(); }); await P.waitForTimeout(1200);
  const o = await P.evaluate(() => {
    const st = game.state, nm = (i) => (st.cards[i] && st.cards[i].name) || "";
    const has = (i) => /^data:image\/webp/.test(getCardArt(i) || "");
    const r = { names: [0, 13, 27, 28, 29].map(nm), art: [0, 4, 13, 14, 27, 28, 29].map(has), empty: has(20), shown: document.querySelectorAll("#cardsModeContent img[src^='data:image/webp']").length };
    const keep = st.cards[0].name; st.cards[0].name = "Something Else"; r.renamed = has(0); st.cards[0].name = keep;
    const t = st.cards[3]; st.cards[3] = st.cards[13]; st.cards[13] = t; r.moved = getCardArt(3) === CARD_ART_BUILTIN["death gerbils"].src; st.cards[13] = st.cards[3]; st.cards[3] = t;
    cloudAssetMap[CARD_ART_PREFIX + 0] = "data:image/png;base64,UPLOADED"; r.upload = getCardArt(0); delete cloudAssetMap[CARD_ART_PREFIX + 0];
    return r; });
  await P.screenshot({ path: (process.env.OUT || "/tmp/") + "card_art.png" });
  console.log(JSON.stringify(o), errs);
  assert.deepStrictEqual(o.art, [true, true, true, true, true, true, true], "named cards have built-in art");
  assert.ok(!o.empty && !o.renamed, "unnamed / renamed slots get no stale picture");
  assert.ok(o.moved, "art follows the card's name");
  assert.strictEqual(o.upload, "data:image/png;base64,UPLOADED", "an admin upload wins");
  assert.ok(o.shown >= 18, "cards page shows them");
  assert.deepStrictEqual(errs, []);
  await b.close(); console.log("g245 OK");
})().catch((e) => { console.error(e); process.exit(1); });
