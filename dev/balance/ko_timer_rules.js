/* v1720 (Harley): what if a knocked-out hero's skill timer did NOT reset? Three rules compared in the real Arena sim (game patched in memory only):
   reset = today (timer goes back to full and waits while he is down), pause = the timer freezes where it was and carries on after the revive,
   ready = he revives with the skill ready. Same random 5-v-5 teams (all heroes, same level both sides, no weapons + 2 weapon builds) under each rule.
   Per hero: casts / KOs / time alive per fight and the win rate of teams that have him. Run: node dev/balance/ko_timer_rules.js [fights per level] */
const fs = require("fs"), path = require("path"), ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "playwright");
let GAME = fs.readFileSync(path.join(ROOT, "test/index.html"), "utf8");
const PK = "if (isKo(pHH, a.key)) { playerCd[a.key] = a.cooldown; return; }", AK = "if (isKo(aHH, a.key)) { aiCd[a.key] = a.cooldown; return; }";
if (GAME.split(PK).length !== 2 || GAME.split(AK).length !== 2) throw new Error("patch points moved");
GAME = GAME.replace(PK, "if (isKo(pHH, a.key)) { if (window.__koRule === 'pause') return; playerCd[a.key] = window.__koRule === 'ready' ? dtS : a.cooldown; return; }")
           .replace(AK, "if (isKo(aHH, a.key)) { if (window.__koRule === 'pause') return; aiCd[a.key] = window.__koRule === 'ready' ? dtS : a.cooldown; return; }");
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
const N = +(process.argv[2] || 150);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome", args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 } });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, require(path.join(ROOT, "dev/tests/siteroute.js"))(GAME));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/", { waitUntil: "domcontentloaded", timeout: 180000 }); await P.waitForSelector("#ksAuth .box", { timeout: 120000 });
  await P.fill("#ksE", "ko" + process.pid + "@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 120000 }); await P.fill("#ksN", "Sim"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const r = await P.evaluate((N) => {
    const H = Object.keys(HERO_DEFS).filter((k) => !HERO_DEFS[k].comingSoon);
    const kit = (ids, wl) => { const specs = []; let hex = 0; WEAPON_DEFS.forEach((w) => { if (!ids.includes(w.id)) return; const s = game.weaponStatsAtLevel(w, wl); if (w.kind === "shield") { hex = Math.max(hex, s.shieldPct || 0); return; } specs.push(s); }); return { specs, hex }; };
    const hsAt = (L) => { const hs = {}; H.forEach((k) => { hs[k] = { owned: true, level: L[0], stars: L[1], skillLevels: { conquest: [L[2], L[2], L[2]], expedition: [1, 1, 1] } }; }); return hs; };
    const side = (keys, L, isP) => { const s2 = arenaSideStats(keys, hsAt(L), 15, 0, false, null, null, undefined, ZERO_BONUS); (s2.heroHp || []).forEach((e) => { e.runL = arenaRunDist(400, 240, Math.max(0, keys.indexOf(e.id)), isP); }); return s2; };
    const BUILDS = [[], ["hex_shield", "railgun", "status_wave"], ["missile_barrage", "laser_beam", "orbit_shield"]];
    let sd = 12345; const rnd = () => { sd = (sd * 1103515245 + 12345) % 2147483648; return sd / 2147483648; };
    const pick = () => { const a = H.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, 5); };
    const out = {};
    [["Lv40", [40, 10, 3, 15]], ["Lv80", [80, 25, 5, 30]]].forEach(([nm, L]) => {
      const fights = []; for (let i = 0; i < N; i++) fights.push({ A: pick(), B: pick(), w: BUILDS[i % BUILDS.length], seed: "k" + i });
      out[nm] = {};
      ["reset", "pause", "ready"].forEach((rule) => { window.__koRule = rule; const per = {}, gen = { fights: 0, sec: 0, kos: 0, heroSec: 0, aliveSec: 0, casts: 0 };
        H.forEach((k) => { per[k] = { n: 0, win: 0, casts: 0, kos: 0, alive: 0, sec: 0 }; });
        fights.forEach((f) => { const K = kit(f.w, L[3]); const sim = arenaMakeSim(side(f.A, L, true), side(f.B, L, false), { rng: worldPvpSeededRng(f.seed), critSeed: f.seed, weapons: K.specs, aiWeapons: K.specs, shieldPct: K.hex, aiShieldPct: K.hex });
          const st = {}; f.A.forEach((k) => { st["p" + k] = { casts: 0, kos: 0, alive: 0, was: false }; }); f.B.forEach((k) => { st["a" + k] = { casts: 0, kos: 0, alive: 0, was: false }; });
          let t = 0, res; for (; t < 3000; t++) { res = sim.step(); const I = res.info;
            (I.playerFlash || []).forEach((k) => { if (st["p" + k]) st["p" + k].casts++; }); (I.aiFlash || []).forEach((k) => { if (st["a" + k]) st["a" + k].casts++; });
            [["p", I.playerHeroes], ["a", I.aiHeroes]].forEach(([s, list]) => (list || []).forEach((e) => { const o = st[s + e.id]; if (!o) return; if (e.ko) { if (!o.was) o.kos++; } else o.alive++; o.was = !!e.ko; }));
            if (res.done) break; }
          const secs = (t + 1) * ARENA_TICK_MS / 1000, win = res.winner || res.result; gen.fights++; gen.sec += secs;
          [["p", f.A, "player"], ["a", f.B, "ai"]].forEach(([s, team, wn]) => team.forEach((k) => { const o = st[s + k], q = per[k]; q.n++; if (win === wn) q.win++; q.casts += o.casts; q.kos += o.kos; q.alive += o.alive * ARENA_TICK_MS / 1000; q.sec += secs;
            gen.kos += o.kos; gen.casts += o.casts; gen.aliveSec += o.alive * ARENA_TICK_MS / 1000; gen.heroSec += secs; })); });
        const heroes = {}; H.forEach((k) => { const q = per[k]; if (!q.n) return; heroes[k] = { teams: q.n, win: Math.round(100 * q.win / q.n), castsPerMin: +(60 * q.casts / q.sec).toFixed(1), kosPerMin: +(60 * q.kos / q.sec).toFixed(2), alivePct: Math.round(100 * q.alive / q.sec) }; });
        out[nm][rule] = { avgFightSec: +(gen.sec / gen.fights).toFixed(1), heroAlivePct: Math.round(100 * gen.aliveSec / gen.heroSec), kosPerHeroPerMin: +(60 * gen.kos / gen.heroSec).toFixed(2), castsPerHeroPerMin: +(60 * gen.casts / gen.heroSec).toFixed(2), heroes }; });
    });
    window.__koRule = "reset"; return JSON.stringify(out);
  }, N);
  fs.writeFileSync(path.join(__dirname, "results", "ko_timer_rules.json"), r); console.log(r.slice(0, 400)); if (errs.length) console.log("ERRS", errs.slice(0, 3)); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
