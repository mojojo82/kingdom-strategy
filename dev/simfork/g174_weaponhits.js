/* v918: fortress cannon + weapons deal damage only when the shot visibly lands. Measures, per damage source, every enemy HP loss in the engine
   against the visible landing (applyDisplayedHit on that enemy at the same moment), and kill rewards against the killing shot.
   Run: node dev/simfork/g174_weaponhits.js   env: SET=a|b|c (a: cannon+missiles/flak/scatter, b: laser+pulse beams, c: drone+railgun with Lyra)
        GAMEFILE=other.html  NOASSERT=1  SECS=30 */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store), SECS = +process.env.SECS || 30, SET = process.env.SET || "a";
const SETS = { a: { w: ["missile_barrage", "flak_burst", "scatter_rounds"], roster: [], cannon: true }, b: { w: ["laser_beam", "pulse_beam"], roster: [], cannon: false }, c: { w: ["droid_call", "railgun"], roster: ["lyra"], cannon: false }, d: { w: ["droid_call", "railgun"], roster: ["lyra"], cannon: false, lyraOff: true } };
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
  await P.fill("#ksE", "g174" + SET + "@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Guns"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const r = await P.evaluate(async (a) => {
    const [SECS, S] = a; setScreen("conquest"); const st = game.state.idle;
    if (S.lyraOff) { const oD = game.idleAttackerDamage; game.idleAttackerDamage = function (k) { return 0; }; } /* note: engine-internal, may not apply */
    game.state.conquestRoster = S.roster; game.state.equippedWeapons = S.w.slice(); st.fortressCannonEnabled = S.cannon; st.skillAuto = false;
    st.chapter = 1; st.levelNum = 1; st.enemies = []; st.bossPhase = false; st.enemiesKilledInLevel = 0; st.spawnTimer = null; st.playerHp = 1e7;
    const T0 = performance.now(), now = () => performance.now() - T0, losses = [], shows = [], pops = [], kills = [];
    const oA = window.applyDisplayedHit; window.applyDisplayedHit = function (id, amt) { shows.push({ t: now(), id: String(id), amt }); return oA.apply(this, arguments); };
    const oP = idleAnim.particles; /* kill reward popups */
    let lastHp = {}, lastDef = st.defeated, popSeen = 0, bodies = {}, gone = [], engLost = 0, shownAmt = 0;
    window.applyDisplayedHit = (function (f) { return function (id, amt) { shownAmt += amt; return f.apply(this, arguments); }; })(window.applyDisplayedHit);
    function sample() {
      if (st.playerHp < 1e6) st.playerHp = 1e7;
      Object.keys(idleAnim.enemyById).forEach((id) => { bodies[id] = 1; }); Object.keys(bodies).forEach((id) => { if (!idleAnim.enemyById[id]) { gone.push({ t: now(), id }); delete bodies[id]; } });
      (st.enemies || []).forEach((e) => { if (!e._t174) { e._t174 = 1; e.hp *= 8; e.maxHp *= 8; const d = idleAnim.displayedHp[e.id]; if (d) { d.hp = e.hp; d.maxHp = e.maxHp; } } const p = lastHp[e.id]; if (p != null && e.hp < p - 1e-9) { losses.push({ t: now(), id: String(e.id), amt: p - e.hp }); engLost += p - e.hp; } lastHp[e.id] = e.hp; });
      const alive = {}; (st.enemies || []).forEach((e) => (alive[e.id] = 1));
      Object.keys(lastHp).forEach((id) => { if (!alive[id]) { if (st.defeated > lastDef) kills.push({ t: now(), id }); delete lastHp[id]; } });
      lastDef = st.defeated;
      (idleAnim.particles || []).forEach((p) => { if (!p._s && /🎖/.test(p.text || "")) { p._s = 1; pops.push({ t: now(), n: +(String(p.text).match(/\+(\d+)/) || [0, 1])[1] }); } });
    }
    const oT = game.tick; game.tick = function () { const x = oT.apply(this, arguments); sample(); return x; };
    const iv = setInterval(sample, 4); const raf = () => { sample(); if (now() < SECS * 1000) requestAnimationFrame(raf); }; requestAnimationFrame(raf);
    await new Promise((res) => setTimeout(res, SECS * 1000)); clearInterval(iv);
    const fx = { droneBolts: (idleAnim.projectiles || []).length, rails: window.__rails || 0 };
    return { losses, shows, kills, pops, gone, engLost, shownAmt, fx };
  }, [SECS, SETS[SET]]);
  /* an HP loss "lands visibly" if the same enemy's bar drop (applyDisplayedHit) happens within 30 ms */
  const L = r.losses, vis = L.filter((l) => r.shows.some((s) => s.id === l.id && Math.abs(s.t - l.t) < 30));
  const early = L.filter((l) => !vis.includes(l)).map((l) => { const s = r.shows.find((x) => x.id === l.id && x.t > l.t); return s ? s.t - l.t : null; });
  const shown = early.filter((d) => d != null), never = early.filter((d) => d == null).length;
  const med = (a) => { if (!a.length) return "-"; const s = a.slice().sort((x, y) => x - y); return Math.round(s[Math.floor(s.length / 2)]); };
  console.log("SET", SET, "| HP losses:", L.length, "| at the visible hit:", vis.length, "(" + Math.round(100 * vis.length / Math.max(1, L.length)) + "%)",
    "| BEFORE the visible hit:", shown.length, "(median", med(shown), "ms early, max", shown.length ? Math.round(Math.max(...shown)) : "-", "ms) | never shown:", never);
  /* what the player sees: each "+N 🎖️" reward should pop in the same frame a body goes down (not while the enemy is still standing) */
  const popEarly = r.pops.filter((p) => !r.gone.some((g) => Math.abs(g.t - p.t) <= 40));
  const lostPct = r.engLost > 0 ? Math.round(100 * Math.min(r.shownAmt, r.engLost) / r.engLost) : 100;
  console.log("  reward popups:", r.pops.length, "| popped while no body went down:", popEarly.length, "| damage drawn as hits:", lostPct + "% of", Math.round(r.engLost));
  const killEarly = r.kills.map((k) => { const s = r.shows.find((x) => x.id === k.id && x.t >= k.t - 30); return s ? s.t - k.t : null; });
  console.log("kills:", r.kills.length, "| kill before its visible hit by >30ms:", killEarly.filter((d) => d == null || d > 30).length, "| reward popups:", r.pops.length);
  console.log("errs", errs.slice(0, 3));
  if (!process.env.NOASSERT) { assert.ok(r.pops.length >= 5, "enough kills"); assert.ok(popEarly.length <= 1, "rewards only when a body goes down"); assert.ok(lostPct >= 95, "damage is drawn"); assert.deepStrictEqual(errs, []); console.log("ALL OK"); }
  await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
