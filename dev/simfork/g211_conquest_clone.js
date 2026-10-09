/* v974: Clone Task works in Conquest - a living clone (3x Gareth at Lv30) fights the front enemy, takes hits once no infantry hero stands, falls and comes back. Run: node dev/simfork/g211_conquest_clone.js */
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
  await P.fill("#ksE", "g211@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Emp"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const r = await P.evaluate(async () => {
    const run = async (weapons, card, lvl) => { lvl = lvl || 40;
      let simTime = 1000; const sim = createGame({ now: () => simTime, mapSize: 5, seed: 1, combatSeed: 777 }); const s = sim.state;
      const FIVE = ["gareth", "lyra", "roran", "kessa", "sera"];
      Object.keys(s.heroes).forEach((k) => { s.heroes[k].owned = false; });
      FIVE.forEach((k) => { const h = s.heroes[k]; h.owned = true; h.level = lvl; h.stars = lvl >= 40 ? 10 : 0; h.skillLevels = { conquest: [3, 3, 3], expedition: [3, 3, 3] }; });
      s.conquestRoster = FIVE.slice(); s.weaponLevels = {}; weapons.forEach((id) => { s.weaponLevels[id] = 30; }); s.equippedWeapons = weapons.slice(); s.tech = {}; s.fortressTech = {};
      s.cards = [{ name: card ? "Drop Signal" : "" }]; s.equippedCards = card ? [0] : [];
      s.idle.fortressCannonEnabled = true; s.idle.fortressCannonTargetMode = "front";
      let maxClones = 0;
      for (let i = 0; i < 6000; i++) { simTime += 1000; sim.tick(); if (s.idle.cloneCasts > maxClones) maxClones = s.idle.cloneCasts; if (i % 1000 === 0) await new Promise((res) => setTimeout(res, 0)); }
      return { level: (s.idle.chapter - 1) * 20 + s.idle.levelNum, casts: s.idle.cloneCasts || 0, falls: s.idle.cloneFalls || 0, dmg: Math.round(s.idle.cloneDmg || 0), clones: s.idle.clones ? Object.keys(s.idle.clones).length : 0 };
    };
    return { none: await run(["missile_barrage"], false), clone: await run(["missile_barrage", "clone_task"], false), weak: await run(["missile_barrage", "clone_task"], false, 12) };
  });
  console.log(JSON.stringify(r));
  assert.strictEqual(r.none.casts, 0, "no Clone Task, no clone");
  assert.ok(r.clone.casts >= 2 && r.clone.dmg > 0, "the clone is summoned, fights, and comes back");
  assert.ok(r.weak.falls >= 1, "once Gareth is down, enemies hit the clone and can bring it down");
  assert.ok(r.clone.level >= r.none.level, "Clone Task helps (never hurts) a Conquest climb");
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
