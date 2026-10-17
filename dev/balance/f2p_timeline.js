/* Free-player timeline (Harley, 11 Oct 2026): does a free player get stronger as fast as Conquest gets harder, from late chapter 5 on?
   A brand-new account in the real TEST engine, run for DAYS days of game time. Conquest fights the whole time (the game catches up offline);
   the player checks in 5 times a day (07:30, 11:00, 14:30, 18:00, 21:30 - Harley: 4-5 check-ins, ~3 h a day) and each time:
   collects the Idle Chest, claims/starts Recon, recruits heroes, levels heroes with Valor (lowest first), stars up with fragments, levels skills
   with Conquest Books (cheapest first), draws weapons with every ticket, levels weapons, equips the best 3, forges gear with Energon + equips the best,
   starts building upgrades (Town Hall first, then the cheapest useful one), starts research when the lane is free (Fortress I cheapest, else normal
   research), and uses every speedup on what's running. No gems, no shop, no Gauntlet / Arena / gathering (so a real player is a bit faster).
   Output: the day each chapter is reached + where the days go. node dev/balance/f2p_timeline.js [days=40] */
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "../.."), DAYS = +process.argv[2] || 40;
(async () => {
  const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
  const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
  const GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8"), FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8");
  const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 } });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => process.stderr.write("PAGEERR " + e.message + "\n")); P.on("console", (m) => { if (m.type() === "error") process.stderr.write("CONSOLE " + m.text().slice(0, 200) + "\n"); });
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "f2p" + process.pid + "@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 20000 }); await P.fill("#ksN", "F2P"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => setScreen("city"));
  await P.evaluate(() => {
    const START = Date.UTC(2026, 0, 5, 0, 0, 0); let simTime = START;
    const g = window.__f2p = createGame({ now: () => simTime, mapSize: 5, seed: 1, combatSeed: 777 }), s = g.state;
    window.__f2pClock = { get: () => simTime, add: (ms) => { simTime += ms; }, start: START };
    s.idle.fortressCannonEnabled = true; s.idle.fortressCannonTargetMode = "front"; setEquipBonus({});
    window.__f2pLog = { reached: {}, days: [] };
  });
  /* v1090 sim fix: Conquest only fights while the game is open (advanceCombat banks at most IDLE_MAX_CATCHUP_SEC = 20 s across a gap), so the day is
     5 sessions of ONLINE_MIN minutes (Harley: 4-5 check-ins, ~3 h a day). Everything else (production, chest, timers) runs on the clock as in the game. */
  const SESSIONS = [7.5, 11, 14.5, 18, 21.5], ONLINE_MIN = +(process.env.ONLINE_MIN || 36);
  const act = () => {
        const g = window.__f2p, s = g.state, H = HERO_DEFS;
        try { g.collectBucket && g.collectBucket(); } catch (e) {}
        try { g.reconSync(); (s.recon.missions || []).forEach((m) => { if (g.reconIsReady(m)) g.reconClaim(m.id); }); (s.recon.missions || []).forEach((m) => { if (m.status === "available") g.reconStart(m.id); }); } catch (e) {}
        Object.keys(H).forEach((k) => { if (!s.heroes[k].owned && !H[k].vipOnly && H[k].class !== "governor") g.recruitHero(k); });
        const fighters = Object.keys(s.heroes).filter((k) => s.heroes[k].owned && H[k].class !== "governor");
        fighters.sort((a, b) => (s.heroes[b].level + 10 * (s.heroes[b].stars || 0)) - (s.heroes[a].level + 10 * (s.heroes[a].stars || 0)));
        s.conquestRoster = fighters.slice(0, 5);
        for (let n = 0; n < 2000; n++) { const lo = s.conquestRoster.slice().sort((a, b) => s.heroes[a].level - s.heroes[b].level)[0]; if (!lo || !g.levelUpHero(lo).ok) break; }
        fighters.forEach((k) => { for (let n = 0; n < 20; n++) if (!g.starUpHero(k).ok) break; });
        for (let n = 0; n < 50; n++) { let best = null; s.conquestRoster.forEach((k) => [0, 1, 2].forEach((i) => { const lv = g.heroSkillLevel ? (s.heroes[k].skillLevels.conquest[i] || 1) : 1; if (lv < 5) { const c = g.heroSkillCost(lv); if (!best || c < best.c) best = { k, i, c }; } })); if (!best || !g.levelUpHeroSkill(best.k, "conquest", best.i).ok) break; }
        if ((s.weaponTickets || 0) > 0) g.weaponDraw(s.weaponTickets);
        WEAPON_DEFS.forEach((w) => { for (let n = 0; n < 50; n++) if (!g.levelUpWeapon(w.id).ok) break; });
        const wl = WEAPON_DEFS.filter((w) => !w.visualOnly && g.weaponLevel(w.id) > 0).sort((a, b) => g.weaponLevel(b.id) - g.weaponLevel(a.id));
        s.equippedWeapons = wl.slice(0, 3).map((w) => w.id);
        for (let n = 0; n < 20000; n++) { const r = g.forgeOnce(); /* v1251: 1 Energon a forge - spend it all, like before */ if (!r.ok) { if (r.reason === "inventory_full") { g.equipBest(); g.dismantleUpTo(1); continue; } break; } }
        g.equipBest(); g.dismantleUpTo(0);
        const BLD = ["academy", "goldmine", "farm", "sawmill", "quarry", "warehouse", "wall", "infirmary"];
        for (let n = 0; n < 3; n++) { if (g.startUpgrade("townhall").ok) continue; const c = BLD.filter((k) => s.buildings[k] && !s.buildings[k].upgrading).sort((a, b) => s.buildings[a].level - s.buildings[b].level); let started = false; for (const k of c) { if (g.startUpgrade(k).ok) { started = true; break; } } if (!started) break; }
        if (!s.researchQueue) {
          const fk = Object.keys(FORTRESS1_TREE).map((k) => ({ k, lv: ((s.fortressTech || {})[k] || 0) + 1 })).filter((x) => x.lv <= FORTRESS1_TREE[x.k].maxLevel).sort((a, b) => fortressNodeCost(a.k, a.lv) - fortressNodeCost(b.k, b.lv));
          let ok = false; for (const x of fk) { if (g.researchFortress(x.k).ok) { ok = true; break; } }
          if (!ok) { const tk = Object.keys(TECH_DEFS).map((k) => ({ k, lv: ((s.tech || {})[k] || 0) + 1 })).filter((x) => x.lv <= TECH_DEFS[x.k].maxLevel).sort((a, b) => g.techCostFor(a.k, a.lv) - g.techCostFor(b.k, b.lv)); for (const x of tk) { if (g.researchTech(x.k).ok) break; } }
        }
        const sp = s.speedups || {};
        for (let n = 0; n < 200 && (sp.general_1h || 0) > 0 && s.researchQueue; n++) g.useSpeedup("general_1h", "research");
        Object.keys(s.buildings).forEach((k) => { for (let n = 0; n < 200 && (sp.construction_1h || 0) > 0 && s.buildings[k].upgrading; n++) g.useSpeedup("construction_1h", "build", k); });
      };
  const t0 = Date.now();
  for (let day = 0; day < DAYS; day++) {
    for (const hr of SESSIONS) {
      await P.evaluate(([day, hr]) => { const C = window.__f2pClock, g = window.__f2p, target = C.start + (day * 24 + hr) * 3600000; if (target > C.get()) { C.add(target - C.get()); g.tick(); } }, [day, hr]); /* offline gap */
      await P.evaluate(act);
      await P.evaluate((mins) => { const g = window.__f2p, s = g.state, C = window.__f2pClock, L = window.__f2pLog;
        for (let i = 0; i < mins * 6; i++) { C.add(10000); g.tick(); const gl = (s.idle.chapter - 1) * 20 + s.idle.levelNum; if (!L.reached[gl]) L.reached[gl] = (C.get() - C.start) / 86400000; } }, ONLINE_MIN);
      await P.evaluate(act);
    }
    const snap = await P.evaluate((day) => {
      const g = window.__f2p, s = g.state, L = window.__f2pLog, r = s.conquestRoster;
      const d = { day: day + 1, level: (s.idle.chapter - 1) * 20 + s.idle.levelNum, label: g.idleLevelLabel(), heroes: r.map((k) => k.slice(0, 3) + s.heroes[k].level + "/" + (s.heroes[k].stars || 0)).join(" "),
        th: s.buildings.townhall.level, acad: s.buildings.academy.level, fort: Object.keys(s.fortressTech || {}).filter((k) => k[0] !== "_").reduce((a, k) => a + s.fortressTech[k], 0),
        weapons: (s.equippedWeapons || []).map((w) => g.weaponLevel(w)).join("/"), skills: r.reduce((a, k) => a + s.heroes[k].skillLevels.conquest.reduce((x, y) => x + y, 0), 0), rp: Math.round(s.researchPoints), valor: Math.round(s.idle.valor), books: s.idle.conquestBooks || 0 };
      L.days.push(d); return d;
    }, day);
    console.log(JSON.stringify(snap) + "  (" + Math.round((Date.now() - t0) / 1000) + "s)");
  }
  const L = await P.evaluate(() => window.__f2pLog);
  const lab = (gl) => (Math.floor((gl - 1) / 20) + 1) + "-" + (((gl - 1) % 20) + 1);
  console.log("\nDay each chapter / milestone was reached:");
  [61, 81, 91, 96, 101, 111, 121, 141, 161, 181, 201].forEach((gl) => { if (L.reached[gl] != null) console.log("  " + lab(gl).padEnd(6) + " day " + L.reached[gl].toFixed(1)); });
  fs.mkdirSync(path.join(__dirname, "results"), { recursive: true }); fs.writeFileSync(path.join(__dirname, "results", "f2p_timeline.json"), JSON.stringify({ when: new Date().toISOString(), days: DAYS, reached: L.reached, daily: L.days }, null, 1));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
