/* Cannon Doctrine in Conquest (Harley, 16 Oct, audit item 4): a maxed Fortress I player runs Conquest from the start until stuck,
   (a) without the card, (b) with Cannon Doctrine as it is now (heroes + cannon get +70%, weapons don't), (c) with the card also boosting weapons
   (what fixing item 4 would do - injected into this sim's copy only, the game is untouched).
   Maxed = 5 heroes Lv80, full stars, skills 5; all research + Fortress I tree maxed; all weapons Lv50, Missiles + Laser + Railgun; cannon on. No gear.
   v1189: the fix is in the game now (weapons get the card in Conquest), so run (c) was dropped - (b) is the fixed game.
   node dev/balance/cannon_doctrine.js [hours=24]  (game hours of Conquest per run; stops early when no new level for 3 h) */
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "../.."), HOURS = +process.argv[2] || 24;
(async () => {
  const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
  const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
  let GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
  const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 } });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => process.stderr.write("PAGEERR " + e.message + "\n"));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "cd" + process.pid + "@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 20000 }); await P.fill("#ksN", "CD"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => setScreen("city"));
  const runs = [["no card", false, false], ["Cannon Doctrine (now)", true, false]], out = [];
  for (const [name, card, weap] of runs) {
    const r = await P.evaluate(([card, weap, HOURS]) => {
      window.__CD_WEAP = weap; let t = Date.UTC(2026, 0, 5); const t0 = t;
      const g = createGame({ now: () => t, mapSize: 5, seed: 1, combatSeed: 777 }), s = g.state, H = HERO_DEFS;
      setEquipBonus({});
      const FIVE = ["gareth", "lyra", "roran", "kessa", "sera"];
      FIVE.forEach((k) => { const h = s.heroes[k]; h.owned = true; h.level = HERO_MAX_LEVEL; h.stars = STAR_MAX_ARMS; h.skillLevels = { conquest: [5, 5, 5], expedition: [5, 5, 5] }; });
      s.conquestRoster = FIVE.slice();
      s.tech = s.tech || {}; Object.keys(TECH_DEFS).forEach((k) => { s.tech[k] = TECH_DEFS[k].maxLevel; });
      s.fortressTech = s.fortressTech || {}; Object.keys(FORTRESS1_TREE).forEach((k) => { s.fortressTech[k] = FORTRESS1_TREE[k].maxLevel; }); s.fortressTech._type = 1;
      s.weaponLevels = s.weaponLevels || {}; WEAPON_DEFS.forEach((w) => { if (!w.visualOnly) s.weaponLevels[w.id] = WEAPON_MAX_LEVEL; });
      s.equippedWeapons = ["missile_barrage", "laser_beam", "railgun"];
      s.idle.fortressCannonEnabled = true; s.idle.fortressCannonTargetMode = "front";
      s.cards = s.cards || []; s.cards[0] = Object.assign({}, s.cards[0] || {}, { name: "Cannon Doctrine" }); s.equippedCards = card ? [0] : [];
      const chk = { wlv: g.weaponLevel("railgun"), heroDmg: g.idleAttackerDamage("gareth"), railDmg: g.weaponDmgFor(WEAPON_DEFS_BY_ID.railgun), mods: cardModsFrom(s).t1Army || 0 };
      const gl = () => (s.idle.chapter - 1) * 20 + s.idle.levelNum; let best = gl(), bestAt = 0, losses = 0; const reached = {};
      let lastHp = null;
      for (let sec = 0; sec < HOURS * 3600; ) {
        const boss = s.idle.enemies.some((e) => e.type === "boss"), step = boss ? 1 : 5;
        const before = gl(); t += step * 1000; g.tick(); sec += step;
        const now = gl(); if (now < before) losses++;
        if (now > best) { best = now; bestAt = sec; if (now % 20 === 1) reached[Math.floor((now - 1) / 20) + 1] = +(sec / 3600).toFixed(2); }
        if (sec - bestAt > 3 * 3600) break;
      }
      return { chk, best, label: (Math.floor((best - 1) / 20) + 1) + "-" + (((best - 1) % 20) + 1), hoursToBest: +(bestAt / 3600).toFixed(2), losses, reached };
    }, [card, weap, HOURS]);
    r.name = name; out.push(r); console.log(JSON.stringify(r));
  }
  fs.mkdirSync(path.join(__dirname, "results"), { recursive: true });
  fs.writeFileSync(path.join(__dirname, "results", "cannon_doctrine.json"), JSON.stringify({ when: new Date().toISOString(), hours: HOURS, out }, null, 1));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
