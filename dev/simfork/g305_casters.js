/* v1185 (Harley): Archer -> Caster, Cavalry -> Ranged (names, icons, buildings: Mage Tower trains Casters, Archery Range trains Ranged).
   Caster heroes (Lyra, Sera) shoot spell orbs in their own colour instead of arrows, in Conquest and Arena (Kessa keeps her blue orb).
   Screenshots out_g305_*.png.  Run: node dev/simfork/g305_casters.js */
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
  await P.fill("#ksE", "g305@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Casters"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const o = {};
  o.names = await P.evaluate(() => ({ archer: TROOP_DEFS.archer.name, cav: TROOP_DEFS.cavalry.name, t5: TROOP_DEFS.archer_t5.name, archery: BUILDING_DEFS.archery.name, stable: BUILDING_DEFS.stable.name, icons: TROOP_ICON.archer + TROOP_ICON.cavalry }));
  await P.evaluate(() => { game.state.buildings.archery.level = 3; game.state.buildings.townhall.level = Math.max(5, game.state.buildings.townhall.level); setScreen("city", "troops"); }); await P.waitForTimeout(1000);
  o.tabs = await P.evaluate(() => [...document.querySelectorAll("#troopsList .tr-type")].map((t) => t.textContent));
  await P.evaluate(() => { const st = game.state; ["lyra", "sera", "kessa"].forEach((k) => { st.heroes[k].owned = true; st.heroes[k].level = Math.max(5, st.heroes[k].level || 1); }); st.conquestRoster = ["gareth", "lyra", "sera"]; st.equippedWeapons = []; setScreen("conquest"); });
  o.spells = await P.evaluate(async () => { const seen = {}; const t0 = performance.now();
    while (performance.now() - t0 < 25000) { idleAnim.projectiles.forEach((p) => { if (p.style) seen[p.style + ":" + (p.spellCol ? p.spellCol[1] : "")] = 1; }); (idleAnim.skillShots || []).forEach((s) => { if (s.style) seen["skill-" + s.style] = 1; }); if (Object.keys(seen).length >= 3) break; await new Promise((r) => setTimeout(r, 30)); }
    return Object.keys(seen); });
  await P.screenshot({ path: path.join(__dirname, "out_g305_conquest.png"), clip: await P.evaluate(() => { const r = document.getElementById("idleCanvas").getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; }) });
  await P.evaluate(() => setScreen("more", "arena")); await P.waitForTimeout(1500);
  await P.evaluate(() => { document.getElementById("arenaQuickMatchBtn").click(); }); await P.waitForTimeout(800);
  await P.evaluate(() => { document.getElementById("arenaAttackBtn").click(); });
  o.arena = await P.evaluate(async () => { const seen = {}; const t0 = performance.now();
    while (performance.now() - t0 < 20000) { (arenaAnim.projectiles || []).forEach((p) => { if (p.style === "spell") seen[p.spellCol ? p.spellCol[1] : "none"] = 1; }); if (Object.keys(seen).length >= 1) break; await new Promise((r) => setTimeout(r, 30)); }
    return Object.keys(seen); });
  console.log(JSON.stringify({ o, errs }));
  await b.close();
  if (!process.env.NOASSERT) {
    assert.deepStrictEqual(errs, []);
    assert.deepStrictEqual(o.names, { archer: "Caster", cav: "Ranged", t5: "Caster T5", archery: "Mage Tower", stable: "Archery Range", icons: "🔮🏹" });
    assert(o.tabs.some((t) => /🔮 Caster/.test(t)) && o.tabs.some((t) => /🏹 Ranged/.test(t)), "training tabs renamed");
    assert(o.spells.some((k) => /^spell:/.test(k)), "Caster heroes cast spell orbs in Conquest"); assert(!o.spells.some((k) => /^null/.test(k)));
    assert(o.arena.length >= 1 && o.arena[0] !== "none", "spell orbs in Arena too");
    console.log("g305 ok");
  }
})().catch((e) => { console.error(e); process.exit(1); });
