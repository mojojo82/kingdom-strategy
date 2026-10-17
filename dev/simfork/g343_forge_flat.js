/* v1251 (Harley: "1 energy should get 1 equipment", slowed by rarity alone, same pace, dismantle gives nothing, auto-dismantle, bag grows with the Forge).
   Run: node dev/simfork/g343_forge_flat.js (SHOTS=dir for a picture) */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call0 = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store), DELAY = 1500;
 /* the FIRST move is slow to reach the server (cold start / bad signal), later ones are quick - so a second move can land first, like on a phone */
const call = call0;
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
  await P.fill("#ksE", "g343@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Forge"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  const o = await P.evaluate(() => {
    const g = game, S = g.state, out = {};
    const i1 = g.forgeInfo(); out.cost1 = i1.cost; out.need1 = i1.need; out.inv1 = i1.invMax; out.auto1 = i1.autoDis; out.odds1 = i1.odds.map((x) => +x.toFixed(4)); out.sum1 = +i1.odds.reduce((a, b) => a + b, 0).toFixed(6);
    S.forge.level = 10; const i10 = g.forgeInfo(); out.cost10 = i10.cost; out.need10 = i10.need; out.epic10 = i10.odds[4]; out.inv10 = i10.invMax;
    S.forge.level = 30; out.inv30 = g.forgeInfo().invMax;
    S.forge.level = 1; S.forge.progress = 0; S.equipment.inv = []; S.energon = 700;
    let made = 0, kept = 0; while (S.energon >= 1 && made < 700) { const r = g.forgeOnce(); if (!r.ok) break; made++; if (!r.auto) kept++; }
    out.made = made; out.level = S.forge.level; out.energonLeft = S.energon; out.kept = kept; out.inv = S.equipment.inv.length; out.noCommonKept = S.equipment.inv.every((p) => p.r > 0);
    S.equipment.inv.push({ id: 99999, icon: 0, r: 2, atk: 2, hp: 2, def: 1, sec: [] }); const e0 = S.energon; const d = g.dismantlePiece(99999); out.dismantleGain = S.energon - e0; out.dismantleOk = d.ok;
    /* old save: Forge 5 with 10 old forges done -> 10 x old price (301) */
    const sv = JSON.parse(JSON.stringify(S)); sv.forge = { level: 5, progress: 10, forged: 40 }; g.loadState(sv); out.mig = { level: S.forge.level, progress: S.forge.progress, flat1: S.forge.flat1, autoDis: S.forge.autoDis };
    return out;
  });
  /* the panel: odds show small percentages, auto-dismantle buttons, Auto forges a batch per tick */
  await P.evaluate(() => { game.state.forge.level = 1; game.state.forge.progress = 0; game.state.equipment.inv = []; game.state.energon = 400; openForge(); }); await P.waitForTimeout(400);
  const ui = await P.evaluate(() => ({ ad: document.querySelectorAll("[data-autodis]").length, adOn: (document.querySelector("[data-autodis].on") || {}).textContent, odds: [...document.querySelectorAll(".fg-odd b")].map((b) => b.textContent), btn: document.getElementById("fgForge").textContent }));
  await P.click("#fgAuto"); await P.waitForTimeout(7500);
  ui.afterAuto = await P.evaluate(() => ({ en: game.state.energon, forged: game.state.forge.progress, auto: forgeAuto, msg: document.getElementById("fgMsg").textContent }));
  if (process.env.SHOTS) await P.screenshot({ path: process.env.SHOTS + "/g343_forge.png" });
  await P.click('[data-autodis="-1"]'); await P.waitForTimeout(200); ui.off = await P.evaluate(() => game.state.forge.autoDis);
  console.log(JSON.stringify({ o, ui, errs }));
  await b.close();
  assert.deepStrictEqual(errs, []);
  assert(o.cost1 === 1 && o.cost10 === 1, "1 Energon a forge at every level");
  assert(o.need1 === 600 && o.need10 === 1200 * 28, "forges per level = old price x old forges (600 at Lv1, 33,600 at Lv10)");
  assert(Math.abs(o.odds1[1] - 20 / 60) < 1e-3 && Math.abs(o.sum1 - 100) < 1e-6, "Lv1 Rare 20% / 60 = 0.33%, odds add to 100");
  assert(Math.abs(o.epic10 - 2.5 / 1200) < 1e-6, "Lv10 Epic 2.5% / 1200");
  assert(o.inv1 === 60 && o.inv10 === 105 && o.inv30 === 205, "bag 60 -> +5 a level -> 205");
  assert(o.auto1 === 0, "new accounts auto-dismantle Common");
  assert(o.made === 700 && o.energonLeft === 0 && o.level === 2 && o.noCommonKept && o.kept === o.inv, "700 Energon = 700 forges, Lv2 after 600, Commons auto-dismantled");
  assert(o.dismantleOk && o.dismantleGain === 0, "dismantle gives nothing");
  assert(o.mig.level === 5 && o.mig.progress === 3010 && o.mig.flat1 && o.mig.autoDis === 0, "old save progress converted");
  assert(ui.ad === 5 && ui.adOn === "Common" && /0\.33%/.test(ui.odds[1]) && ui.odds[0] === "99.7%" && /1/.test(ui.btn), "panel: 5 auto-dismantle choices, Common on, small odds shown");
  assert(ui.afterAuto.en === 0 && ui.afterAuto.forged === 400 && !ui.afterAuto.auto, "Auto forges in batches until the Energon runs out, then stops");
  assert.strictEqual(ui.off, -1, "auto-dismantle can be turned off");
  console.log("g343 ok");
})().catch((e) => { console.error(e); process.exit(1); });
