/* v962: bots carry a player's combat kit - weapons (incl. Salvo / shields), Fortress I or III, sometimes an Esper - in Arena and world PvP; world PvP brings both sides' weapons. Run: node dev/simfork/g205_bot_loadouts.js */
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
  await P.fill("#ksE", "g205@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Bots"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const r = await P.evaluate(() => {
    ["gareth", "lyra", "roran", "kessa", "sera"].forEach((k) => { const h = game.state.heroes[k]; h.owned = true; h.level = 40; h.stars = 10; }); game.state.conquestRoster = ["gareth", "lyra", "roran", "kessa", "sera"];
    const o = { n: 0, withW: 0, f3: 0, salvo: 0, esper: 0, lvls: [] };
    for (let i = 0; i < 200; i++) { const op = generateArenaOpponent(); o.n++; const ids = Object.keys(op.weapons || {}); if (ids.length) o.withW++; if (ids.length > 3) o.tooMany = true; if (op.weapons.salvo_loader) o.salvo++; if (fortressTypeOf(op.fortressTech || {}) === 3) o.f3++; if (op.esper) o.esper++; ids.forEach((id) => o.lvls.push(op.weapons[id])); }
    o.avgLvl = Math.round(o.lvls.reduce((a, x) => a + x, 0) / o.lvls.length); delete o.lvls;
    /* bot weapons really fire in an Arena fight */
    const op = generateArenaOpponent(); op.weapons = { missile_barrage: 30, laser_beam: 30, railgun: 30 }; const kit = botWeaponsToSim(op.weapons);
    const side = (ro, hs, fort, isP) => { const st = arenaSideStats(ro, hs, 20, 0, false, null, fort, undefined, ZERO_BONUS); (st.heroHp || []).forEach((e) => { e.runL = arenaRunDist(400, 240, ro.indexOf(e.id), isP); }); return st; };
    const tr = { src: {}, aiSrc: {}, perTick: [] }; const sim = arenaMakeSim(side(game.state.conquestRoster, game.state.heroes, null, true), side(op.roster, op.heroes, op.fortressTech, false), { rng: worldPvpSeededRng("b"), critSeed: "b", aiWeapons: kit.specs, aiShieldPct: kit.shieldPct, salvoA: kit.salvo, trace: tr });
    let fires = 0, x; do { x = sim.step(); fires += (x.info.aiWeaponFires || []).length; } while (!x.done);
    o.aiWeaponDmg = Object.keys(tr.aiSrc).filter((k) => /^weapon:/.test(k)).length; o.aiFires = fires;
    /* world PvP: a bot city's saved loadout is used */
    const bs = randomBotSaveState(0.7); o.botSaveWeapons = (bs.equippedWeapons || []).length; o.botSaveLv = bs.weaponLevels;
    return o;
  });
  console.log(JSON.stringify(r));
  assert.ok(r.withW === r.n && !r.tooMany, "every bot carries 1-3 weapons");
  assert.ok(r.f3 > 40 && r.f3 < 140, "bots pick Fortress III as well as I"); assert.ok(r.salvo > 0, "some Fortress I bots bring Salvo Loader"); assert.ok(r.esper > 0, "some bots bring an Esper");
  assert.ok(r.aiWeaponDmg > 0 && r.aiFires > 0, "bot weapons deal damage and are drawn"); assert.ok(r.botSaveWeapons >= 1, "world bots carry weapons in their save");
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
