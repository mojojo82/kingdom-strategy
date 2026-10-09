/* v977: shared card catalog - the same card text for every player, admins only can edit; an admin's own save text fills empty slots; Drop Signal added. Run: node dev/simfork/g212_card_catalog.js */
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
  await P.fill("#ksE", "g212@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Emp"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.waitForTimeout(1500);
  const r = await P.evaluate(async () => {
    const o = { started: !!cardCatalogStart.on };
    const K = window.KS_BACKEND, wait = (ms) => new Promise((res) => setTimeout(res, ms));
    /* 1) a normal player who typed "Critical Mass" into a card gets the catalog text instead (no free effect) */
    K.isAdmin = false; K.adminChecked = true;
    game.state.cards[2].name = "Critical Mass"; game.state.equippedCards = [2];
    cardCatalogRaw = []; cardCatalogSettle(); await wait(50);
    o.playerName = game.state.cards[2].name; o.playerRamp = !!equippedDmgRamp(game.state);
    openCardDetailOverlay(2); o.readOnly = document.getElementById("cardDetailName").readOnly; o.devModHidden = document.getElementById("cardDevModBtn").style.display === "none"; closeCardDetailOverlay();
    game.state.cardEffectOverrides = { "critical mass": { multiplier: 999 } }; o.ovIgnored = cardEffectFor("Critical Mass").multiplier === 10;
    /* 2) the admin's own save text fills the empty slots, Drop Signal goes in the last free slot, and it's written to the shared doc */
    K.isAdmin = true;
    game.state.cards[0].name = "Old Card"; game.state.cards[0].effect = "old text from the original save";
    cardCatalogRaw = [{ name: "", type: "", effect: "", narrative: "" }, { name: "Kept", type: "", effect: "already in catalog", narrative: "" }]; cardCatalogSettle(); await wait(1500);
    const doc = JSON.parse(await window.__fbstore("get")); const key = Object.keys(doc).find((k) => /assetitems\/cardcatalog$/.test(k));
    const cards = key ? doc[key].cards : null;
    o.saved = !!cards; o.slot0 = cards && cards[0].name; o.slot1 = cards && cards[1].name; o.last = cards && cards[cards.length - 1].name; o.dropCount = cards ? cards.filter((c) => /drop signal/i.test(c.name)).length : 0;
    o.adminEditable = (openCardDetailOverlay(0), !document.getElementById("cardDetailName").readOnly); closeCardDetailOverlay();
    o.dropFound = !!equippedSummonCall({ cards: game.state.cards, equippedCards: [game.state.cards.findIndex((c) => /drop signal/i.test(c.name))] });
    return o;
  });
  console.log(JSON.stringify(r));
  assert.ok(r.started, "the catalog listener starts with the cloud db");
  assert.ok(r.playerName === "" && !r.playerRamp && r.readOnly && r.devModHidden && r.ovIgnored, "a normal player can't make or edit card text or Dev Mod card values");
  assert.ok(r.saved && r.slot0 === "Old Card" && r.slot1 === "Kept" && r.last === "Drop Signal" && r.dropCount === 1, "admin save text fills empty slots, catalog text kept, Drop Signal in the last slot, written to the shared doc");
  assert.ok(r.adminEditable && r.dropFound, "an admin can edit; Drop Signal works from the catalog");
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
