/* v1252 (Harley, from HSH): each weapon level adds flat ATK/HP/DEF % to the global bonus - Elite 2.2, Super Rare 4, Epic 8, Legendary 64 per level; every owned weapon. Run: node dev/simfork/g344_weapon_level_bonus.js */
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
  await P.fill("#ksE", "g344@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Wpn"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  const o = await P.evaluate(() => {
    const S = game.state; S.weaponFrags = {}; S.weaponLevels = {}; S.equippedWeapons = [];
    const by = (r) => WEAPON_DEFS.find((w) => !w.visualOnly && w.rarity === r);
    const a0 = heroBonusTotal("atk"), e = by("Elite"), l = by("Legendary"), ep = by("Epic");
    S.weaponFrags[e.id] = 1; const one = weaponBonusOf(S);
    S.weaponLevels[e.id] = 50; S.weaponFrags[l.id] = 1; S.weaponLevels[l.id] = 50; S.weaponFrags[ep.id] = 1; S.weaponLevels[ep.id] = 10;
    const both = weaponBonusOf(S), a1 = heroBonusTotal("atk"), h1 = heroBonusTotal("hp"), d1 = heroBonusTotal("def");
    S.weaponLevels[l.id] = 99; const capped = weaponBonusOf(S);
    setScreen("more", "weapons"); renderWeapons();
    return { one, both, dAtk: +(a1 - a0).toFixed(1), h1, d1, capped, hint: document.getElementById("weaponsHint").textContent, perm: (document.querySelector(".weapon-perm") || {}).textContent };
  });
  console.log(JSON.stringify({ o, errs }));
  await b.close();
  assert.deepStrictEqual(errs, []);
  assert.strictEqual(o.one, 2.2, "an owned Elite at Lv1 = +2.2%");
  assert.strictEqual(o.both, 110 + 3200 + 80, "Elite 50 + Legendary 50 + Epic 10");
  assert.strictEqual(o.dAtk, o.both, "added straight onto the global ATK"); assert(o.h1 >= o.both && o.d1 >= o.both, "and HP, DEF");
  assert.strictEqual(o.capped, o.both, "capped at Lv50");
  assert(/\+3\.4K%|\+3,390%|3390/.test(o.hint) && /Permanent: ATK, HP, DEF/.test(o.perm), "shown on the Weapons screen: " + o.hint);
  console.log("g344 ok");
})().catch((e) => { console.error(e); process.exit(1); });
