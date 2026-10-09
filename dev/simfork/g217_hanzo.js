/* v992: Hanzo - VIP-only, Shuriken Storm hits every enemy (+ fortress in Arena), Shadow Step dodge (no dice), same in Conquest and Arena. Run: node dev/simfork/g217_hanzo.js */
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
  await P.fill("#ksE", "g217@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Emp"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const r = await P.evaluate(async () => {
    const o = {}, BASE = ["gareth", "lyra", "roran", "kessa", "sera"], HZ = ["hanzo", "lyra", "roran", "kessa", "sera"];
    o.recruit = game.recruitHero("hanzo").reason; o.botPool = ARENA_COMBAT_HERO_KEYS.includes("hanzo");
    o.dodge = [1, 2, 3, 4, 5].map((L) => heroDodgePct("hanzo", { skillLevels: { conquest: [1, L] } }));
    o.cd = [1, 5].map((L) => skillCdAt(HERO_DEFS.hanzo.conquestSkills[0], L));
    /* Conquest climb */
    const run = async (roster, L) => { let simTime = 1000; const sim = createGame({ now: () => simTime, mapSize: 5, seed: 1, combatSeed: 777 }); const s = sim.state;
      Object.keys(s.heroes).forEach((k) => { s.heroes[k].owned = false; });
      roster.forEach((k) => { const h = s.heroes[k]; h.owned = true; h.level = 40; h.stars = 10; h.skillLevels = { conquest: k === "hanzo" ? [L, L, 1] : [3, 3, 3], expedition: [3, 3, 3] }; });
      s.conquestRoster = roster.slice(); s.weaponLevels = { missile_barrage: 30 }; s.equippedWeapons = ["missile_barrage"]; s.tech = {}; s.fortressTech = {}; s.cards = []; s.equippedCards = [];
      s.idle.fortressCannonEnabled = true; s.idle.fortressCannonTargetMode = "front";
      for (let i = 0; i < 6000; i++) { simTime += 1000; sim.tick(); if (i % 1000 === 0) await new Promise((res) => setTimeout(res, 0)); }
      const he = s.idle.heroHp && s.idle.heroHp.hanzo;
      return { level: (s.idle.chapter - 1) * 20 + s.idle.levelNum, aoe: Math.round(s.idle.aoeDmg || 0), dodges: s.idle.dodges || 0, dgN: s.idle.dodgeTries || 0, casts: (s.idle.skillFireCounts || {}).hanzo || 0 };
    };
    o.cqBase = await run(BASE, 3); o.cqL1 = await run(HZ, 1); o.cqL5 = await run(HZ, 5);
    /* Arena */
    const hsAt = (keys, L) => { const hs = {}; keys.forEach((k) => { hs[k] = { owned: true, level: 40, stars: 10, skillLevels: { conquest: k === "hanzo" ? [L, L, 1] : [3, 3, 3], expedition: [3, 3, 3] } }; }); return hs; };
    const side = (keys, L, isP) => { const s2 = arenaSideStats(keys, hsAt(keys, L), 15, 0, false, null, null, undefined, ZERO_BONUS); (s2.heroHp || []).forEach((e) => { e.runL = arenaRunDist(400, 240, keys.indexOf(e.id), isP); }); return s2; };
    const ar = (L) => { const tr = { src: {}, aiSrc: {}, perTick: [] }; const pS = side(HZ, L, true), aS = side(BASE, 3, false); pS.maxHp *= 20; aS.maxHp *= 20; const sim = arenaMakeSim(pS, aS, { rng: worldPvpSeededRng("h"), critSeed: "h", trace: tr }); const res = sim.runToEnd(); const hz = sim.pHH.by.hanzo;
      return { res, storm: Math.round(tr.src["skill:hanzo|Shuriken Storm"] || 0), dgN: hz.dgN || 0, dodges: hz.dodges || 0, aiKos: sim.aHH.list.reduce((t, e) => t + e.kos, 0) }; };
    o.ar1 = ar(1); o.ar5 = ar(5);
    return o;
  });
  console.log(JSON.stringify(r));
  const A = assert;
  A.strictEqual(r.recruit, "vip_only", "Hanzo can't be recruited with resources"); A.strictEqual(r.botPool, false, "no Hanzo on bots for now");
  A.deepStrictEqual(r.dodge.map((x) => +x.toFixed(2)), [0.1, 0.2, 0.3, 0.4, 0.5], "Shadow Step 10% per level"); A.deepStrictEqual(r.cd, [8, 5], "Shuriken Storm 8s, 5s at level 5");
  A.ok(r.cqL5.aoe > 0 && r.cqL5.casts > 10, "Conquest: Shuriken Storm fires and hits");
  A.ok(r.cqL5.dgN > 10 && r.cqL5.dodges === Math.floor(r.cqL5.dgN * 0.5), "Conquest: level 5 dodges every 2nd hit"); A.ok(r.cqL1.dodges === Math.floor(r.cqL1.dgN * 0.1 + 1e-9), "Conquest: level 1 dodges 1 hit in 10");
  A.ok(r.cqL5.level >= r.cqBase.level, "Conquest: Hanzo L5 climbs at least as far as Gareth");
  A.ok(r.ar5.storm > 0 && r.ar5.aiKos > r.ar1.aiKos, "Arena: Shuriken Storm lands; L5 knocks out more than L1");
  A.ok(r.ar5.dgN > 4 && r.ar5.dodges === Math.floor(r.ar5.dgN * 0.5), "Arena: level 5 dodges every 2nd hit");
  A.ok(r.ar1.dgN > 4 && r.ar1.dodges === Math.floor(r.ar1.dgN * 0.1 + 1e-9), "Arena: level 1 dodges 1 hit in 10");
  console.log("errs", errs); A.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
