/* Weapon loop test (meta / counter / counter-counter). Headless, real TEST game engine, deterministic seeds, no game changes.
   node dev/balance/loop.js [--cond '{"lvl":40,"arms":10,"wl":30,"per":100}'] [--save name]
   - Every 3-weapon build (Salvo left out: it needs Fortress I research, these fights use none).
   - Duplicate copies a weapon you already have: every Duplicate build is tried once per copy target ("dup>hex" = Duplicate copying Hex Shield).
   - Each build fights a fixed sample of the field both ways (once as attacker, once as defender) -> overall score 0-100 and rank.
   - Loop checks: META = EMP + Railgun + Clone Task. COUNTER = EMP + Status Wave + any. COUNTER-COUNTER = Hex Shield + Railgun + any.
   Optional overrides in --cond for "what if" runs (sim only): noShieldDup = Duplicate cannot copy Hex Shield; srf = Status Wave Reflect seconds; cm/ccd = Clone mult/cooldown, sd/scd = Status Wave duration/cooldown. */
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "../..");
const args = process.argv.slice(2), arg = (k, d) => { const i = args.indexOf("--" + k); return i >= 0 ? args[i + 1] : d; };
const COND = Object.assign({ lvl: 40, arms: 10, wl: 30, per: 100, base: 0 }, JSON.parse(arg("cond", "{}"))), SAVE = arg("save", "");
(async () => {
  const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
  const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
  const GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8"), FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8");
  const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }); const ctx = await b.newContext();
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); }); await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" })); await ctx.route(/fonts\./, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => process.stderr.write("PAGEERR " + e.message + "\n"));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "loop" + process.pid + "@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp"); await P.waitForSelector("#ksN", { timeout: 20000 }); await P.fill("#ksN", "Loop"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const R = JSON.parse(await P.evaluate((COND) => {
    const SHORT = { missile_barrage: "missile", laser_beam: "laser", orbit_shield: "orbit", hex_shield: "hex", emp_gun: "emp", railgun: "railgun", clone_task: "clone", droid_call: "droid", duplicate: "dup", deflector_dome: "dome", io_repair: "io", status_wave: "wave", projection_wall: "wall", flak_burst: "flak", scatter_rounds: "scatter", pulse_beam: "pulse" };
    const sh = (id) => SHORT[id] || id;
    const W = WEAPON_DEFS.filter((w) => !w.visualOnly && w.id !== "salvo_loader").map((w) => w.id);
    const tick = ARENA_TICK_MS / 1000;
    /* a build's sim kit; `want` = what Duplicate copies (same rules as the game: simApplyDup / simDupTarget) */
    const kitFor = (ids, want) => {
      const specs = [], used = []; let dupEff = null, hex = 0;
      WEAPON_DEFS.forEach((wdef) => { if (!ids.includes(wdef.id)) return; used.push(wdef.id); const st = game.weaponStatsAtLevel(wdef, COND.wl);
        if (wdef.kind === "shield") { hex = Math.max(hex, st.shieldPct || 0); return; } if (wdef.fx === "dup") { dupEff = st.p.eff; return; } if (wdef.fx === "salvo") return;
        specs.push(simSpecOf(wdef, st, wdef.kind === "fx" ? 0 : st.dmg)); });
      simApplyDup(specs, used, dupEff, want);
      if (dupEff != null && hex > 0 && simDupTarget(used, want) === "hex_shield") hex += hex * dupEff / 100;
      specs.forEach((sp) => { const cdf = (s) => { sp.cooldownSec = s; sp.cooldownTicks = Math.max(1, Math.round(s / tick)); };
        if (sp.fx === "clone") { if (COND.cm != null) sp.p.mult = COND.cm; if (COND.ccd != null) cdf(COND.ccd); }
        if (sp.fx === "emp" && COND.ecd != null) cdf(COND.ecd);
        if (sp.fx === "sw" && COND.srf != null) sp.p.reflect = COND.srf; /* Status Wave Reflect seconds at any level */
        if (sp.fx === "sw") { if (COND.sd != null) sp.p.dur = COND.sd; if (COND.scd != null) cdf(COND.scd); if (COND.lob != null) sp.p.lob = COND.lob; } });
      if (COND.hex != null) hex *= COND.hex; /* sim-only Hex Shield strength multiplier */
      return { specs, shieldPct: hex };
    };
    const E = [];
    for (let a = 0; a < W.length; a++) for (let c = a + 1; c < W.length; c++) for (let d = c + 1; d < W.length; d++) {
      const ids = [W[a], W[c], W[d]], base = ids.map(sh).join("+");
      if (!ids.includes("duplicate")) { E.push({ ids, name: base, kit: kitFor(ids, null) }); continue; }
      ids.filter((id) => id !== "duplicate" && id !== "orbit_shield" && !(COND.noShieldDup && id === "hex_shield")).forEach((t) => E.push({ ids, dup: t, name: base.replace("dup", "dup>" + sh(t)), kit: kitFor(ids, t) }));
    }
    const FIVE = ["gareth", "lyra", "roran", "kessa", "sera"], hs = {}; FIVE.forEach((k) => { hs[k] = { owned: true, level: COND.lvl, stars: COND.arms, skillLevels: { conquest: [3, 3, 3], expedition: [3, 3, 3] } }; });
    const keepPer = ARENA_FORT_HP_PER_POWER; ARENA_FORT_HP_PER_POWER = COND.per;
    const side = (isP) => { const st = arenaSideStats(FIVE, hs, 15, COND.base, false, null, null, undefined, ZERO_BONUS); (st.heroHp || []).forEach((e) => { e.runL = arenaRunDist(400, 240, FIVE.indexOf(e.id), isP); }); return st; };
    const memo = new Map();
    const fight = (i, j, sd) => { const k = i + "_" + j + "_" + sd; if (memo.has(k)) return memo.get(k); const ka = E[i].kit, kb = E[j].kit, seed = "L" + sd;
      const r = arenaMakeSim(side(true), side(false), { rng: worldPvpSeededRng(seed), critSeed: seed, weapons: ka.specs, aiWeapons: kb.specs, shieldPct: ka.shieldPct, aiShieldPct: kb.shieldPct }).runToEnd();
      const v = r === "player" ? 1 : r === "ai" ? 0 : 0.5; memo.set(k, v); return v; };
    const pair = (i, j) => fight(i, j, 1) + (1 - fight(j, i, 2)); /* 0..2 for i: 2 = wins both ways */
    const field = E.map((_, i) => i).filter((i) => i % 9 === 0);
    const score = E.map((_, i) => { let s = 0; field.forEach((j) => { s += pair(i, j); }); return Math.round(50 * s / field.length); });
    const order = E.map((_, i) => i).sort((x, y) => score[y] - score[x]);
    const rank = (i) => order.indexOf(i) + 1, idx = (name) => E.findIndex((e) => e.name === name);
    const has = (e, a, b2) => e.ids.includes(a) && e.ids.includes(b2);
    const M = idx("emp+railgun+clone");
    const beatMeta = E.map((_, i) => i).filter((i) => i !== M && pair(i, M) >= 1.5);
    const counters = E.map((_, i) => i).filter((i) => has(E[i], "emp_gun", "status_wave"));
    const ccs = E.map((_, i) => i).filter((i) => has(E[i], "hex_shield", "railgun") && !E[i].ids.includes("status_wave"));
    const ccRows = ccs.map((i) => ({ name: E[i].name, score: score[i], beatsCounters: counters.filter((c) => pair(i, c) >= 1.5).length + "/" + counters.length, vsMeta: pair(i, M) }));
    /* best copy target for each Duplicate build */
    const dupBest = {}; E.forEach((e, i) => { if (!e.dup) return; const k = e.ids.map(sh).join("+"); if (!dupBest[k] || score[i] > dupBest[k][1]) dupBest[k] = [e.name, score[i], rank(i)]; });
    const metaLoss = E.map((_, i) => i).filter((j) => j !== M && pair(M, j) < 2).map((j) => [E[j].name, pair(M, j), field.includes(j), fight(M, j, 1)]);
    const cBeat = counters.filter((c) => pair(c, M) >= 1.5).length;
    const ccBest = ccRows.slice().sort((a, b2) => b2.score - a.score)[0];
    const summary = { metaScore: score[M], metaRank: rank(M), top: [E[order[0]].name, score[order[0]]], countersBeatMeta: cBeat + "/" + counters.length, otherBeatMeta: beatMeta.filter((i) => !counters.includes(i)).map((i) => E[i].name),
      ccBeatCounters: ccRows.filter((r) => r.vsMeta === 0).map((r) => r.beatsCounters), metaLossCount: metaLoss.length, splitsWonAsAttacker: metaLoss.filter((x) => x[1] === 1 && x[3] === 1).length + "/" + metaLoss.filter((x) => x[1] === 1).length };
    /* who beats the meta, and how hard each build is to get (Legendary count). Easy counter = beats the meta both ways with few Legendaries. */
    const CC = idx(COND.noShieldDup ? "hex+railgun+dup>railgun" : "hex+railgun+dup>hex"), legN = (e) => e.ids.filter((id) => (WEAPON_DEFS_BY_ID[id] || {}).rarity === "Legendary").length;
    const beaters = E.map((_, i) => i).filter((i) => i !== M && pair(i, M) >= 1.5).map((i) => ({ name: E[i].name, legendaries: legN(E[i]), score: score[i], rank: rank(i), vsMeta: pair(i, M), vsCounterCounter: pair(i, CC) }))
      .sort((a, b2) => a.legendaries - b2.legendaries || b2.score - a.score);
    ARENA_FORT_HP_PER_POWER = keepPer;
    return JSON.stringify({ cond: COND, summary, metaLoss, beaters, entries: E.length, fieldSize: field.length,
      meta: { name: E[M].name, score: score[M], rank: rank(M) },
      watch: ["emp+railgun+clone", "emp+railgun+wave", "hex+railgun+wave", "hex+railgun+dup>hex", "railgun+dup>railgun+wave"].map((n) => { const i = idx(n); return [n, score[i], rank(i)]; }),
      top15: order.slice(0, 15).map((i) => [rank(i), E[i].name, score[i]]),
      beatMeta: beatMeta.map((i) => E[i].name),
      counterCounter: ccRows.sort((a, b2) => b2.score - a.score),
      dupBuildsTop: Object.values(dupBest).sort((a, b2) => b2[1] - a[1]).slice(0, 12) });
  }, COND));
  await b.close();
  const pr = (s) => console.log(s);
  pr("WEAPON LOOP  (heroes Lv" + COND.lvl + ", weapons Lv" + COND.wl + ", no research; " + R.entries + " builds incl. every Duplicate copy choice; field sample " + R.fieldSize + ")");
  pr("\nMETA " + R.meta.name + ": score " + R.meta.score + ", rank " + R.meta.rank + (R.meta.rank === 1 ? "  OK" : "  !! not on top"));
  pr("\nMeta drops points to (" + R.metaLoss.length + "; 1 = split, 0 = loses both ways, * = in field sample): " + R.metaLoss.map((x) => x[0] + " " + x[1] + (x[2] ? "*" : "")).join(", "));
  pr("\nSUMMARY " + JSON.stringify(R.summary));
  pr("\nBEATERS " + JSON.stringify(R.beaters));
  pr("\nWatch list:"); R.watch.forEach((r) => pr("  " + r[0].padEnd(28) + "score " + r[1] + "  rank " + r[2]));
  pr("\nTop 15:"); R.top15.forEach((r) => pr("  " + String(r[0]).padStart(3) + ". " + r[1].padEnd(28) + r[2]));
  pr("\nBuilds that beat the meta both ways (" + R.beatMeta.length + "): " + R.beatMeta.join(", "));
  pr("\nCounter-counter candidates (Hex + Railgun + X): counters beaten / beat-meta? (vsMeta 2 = wins both ways, 0 = loses both)");
  R.counterCounter.forEach((r) => pr("  " + r.name.padEnd(28) + "score " + r.score + "  beats counters " + r.beatsCounters + "  vsMeta " + r.vsMeta));
  pr("\nBest Duplicate builds (best copy choice):"); R.dupBuildsTop.forEach((r) => pr("  " + r[0].padEnd(28) + "score " + r[1] + "  rank " + r[2]));
  if (SAVE) { fs.mkdirSync(path.join(__dirname, "results"), { recursive: true }); fs.writeFileSync(path.join(__dirname, "results", "loop_" + SAVE + ".json"), JSON.stringify(R, null, 1)); }
})();
