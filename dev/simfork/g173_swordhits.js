/* v917: Gareth's sword deals damage only when it lands. Gareth alone on the roster (no other damage source); every enemy HP loss is checked against
   his swing (time since the swing started; the impact frame is 5/22 s = 227 ms) and the distance from his sword. Also: kill rewards only at a sword hit,
   kill speed, and the page-hidden fallback (hits still land when the scene isn't drawn).
   Run: node dev/simfork/g173_swordhits.js        (GAMEFILE=other.html to measure another version; NOASSERT=1 to just print) */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store), SECS = +process.env.SECS || 40;
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
  await P.fill("#ksE", "g173@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Sword"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const r = await P.evaluate(async (SECS) => {
    setScreen("conquest"); const st = game.state.idle;
    game.state.conquestRoster = ["gareth"]; st.skillAuto = false; /* his skill is out of scope here: basic sword hits only */
    st.chapter = 1; st.levelNum = 1; st.enemies = []; st.bossPhase = false; st.enemiesKilledInLevel = 0; st.spawnTimer = null; st.playerHp = 1e6;
    const T0 = performance.now(), now = () => performance.now() - T0, hits = [], kills = [];
    const reach = IDLE_BLOCK_GAP + meleeReachExtra;
    let lastHp = {}, lastDef = st.defeated;
    let lastCan = st.fortressCannonHitCount || 0, lastW = JSON.stringify(st.weaponFireCounts || {});
    function sample() {
      const can = st.fortressCannonHitCount || 0, wNow = JSON.stringify(st.weaponFireCounts || {}), other = can > lastCan || wNow !== lastW; lastCan = can; lastW = wNow;
      const gv = idleAnim.heroVis.gareth, sw = idleAnim.swingRun && idleAnim.swingRun.gareth;
      (st.enemies || []).forEach((e) => {
        if (lastHp[e.id] == null && !e._t173) { e._t173 = 1; e.hp *= 6; e.maxHp *= 6; } /* test only: tougher enemies so each takes several sword hits */
        const prev = lastHp[e.id];
        if (prev != null && e.hp < prev - 1e-9) { const ev = idleAnim.enemyById[e.id]; hits.push({ t: now(), dist: gv && ev ? meleeD(gv, ev) : null, sinceSwing: sw ? performance.now() - sw.t0 : null, inSwing: !!(sw && performance.now() < sw.until + 5), boss: e.type === "boss", other }); }
        lastHp[e.id] = e.hp;
      });
      const alive = {}; (st.enemies || []).forEach((e) => (alive[e.id] = 1));
      Object.keys(lastHp).forEach((id) => { if (!alive[id]) { const ev = idleAnim.enemyById[id]; if (st.defeated > lastDef) { kills.push({ t: now(), dist: gv && ev ? meleeD(gv, ev) : null, sinceSwing: sw ? performance.now() - sw.t0 : null, vis: !!ev }); } delete lastHp[id]; } });
      lastDef = st.defeated;
    }
    /* sample right after every place HP can change: each frame (the sword lands in the frame) and every engine call */
    const oTick = game.tick; game.tick = function () { const x = oTick.apply(this, arguments); sample(); return x; };
    const iv = setInterval(sample, 4); const raf = () => { sample(); if (now() < SECS * 1000) requestAnimationFrame(raf); }; requestAnimationFrame(raf);
    const lands = []; if (game.idleMeleeLand) { const oL = game.idleMeleeLand; game.idleMeleeLand = function (aid, blade) { const gv = idleAnim.heroVis[aid], sw = idleAnim.swingRun && idleAnim.swingRun[aid], ev = blade != null ? idleAnim.enemyById[blade] : null, t = now();
      const res = oL.apply(this, arguments); lands.push({ t, n: res.length, dist: gv && ev ? meleeD(gv, ev) : null, sinceSwing: sw ? performance.now() - sw.t0 : null }); return res; }; }
    const a0 = (st.attackHitCounts && st.attackHitCounts.gareth) || 0;
    const d0 = st.defeated;
    await new Promise((res) => setTimeout(res, SECS * 1000));
    clearInterval(iv);
    const killsShown = st.defeated - d0, attacks = ((st.attackHitCounts && st.attackHitCounts.gareth) || 0) - a0, dealt = lands.reduce((a, l) => a + l.n, 0);
    /* page hidden: no drawing -> hits must still land (old instant way) */
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    const dH = st.defeated; st.enemies.forEach((e) => (e.arrived = true, e.engaged = true));
    await new Promise((res) => setTimeout(res, 12000));
    const killsHidden = st.defeated - dH;
    hits.forEach((h) => { h.sword = lands.some((l) => l.n > 0 && Math.abs(l.t - h.t) < 6); });
    kills.forEach((k) => { k.sword = lands.some((l) => l.n > 0 && Math.abs(l.t - k.t) < 6); });
    return { attacks, dealt, lands, hits, kills, killsShown, killsHidden, reach, impactMs: (HERO_ANIMS.gareth.impact / HERO_ANIMS.gareth.fps.attack) * 1000 };
  }, SECS);
  const OTHER = r.hits.filter((h) => !h.boss && h.other && !h.sword), H = r.hits.filter((h) => !h.boss && !(h.other && !h.sword)), far = H.filter((h) => h.dist == null || h.dist > r.reach + 18 || h.dist < -8), early = H.filter((h) => h.sinceSwing == null || h.sinceSwing < r.impactMs - 25 || h.sinceSwing > r.impactMs + 60);
  const pct = (a) => H.length ? Math.round((100 * a.length) / H.length) + "%" : "-";
  console.log("(fortress cannon / weapon hits, not Gareth, left out:", OTHER.length + ")");
  console.log("HP losses:", H.length, "| sword reach", r.reach, "px (+ up to 18 stagger) | impact frame at", Math.round(r.impactMs), "ms into the swing");
  console.log("  away from the sword (out of reach):", far.length, pct(far), far.slice(0, 6).map((h) => Math.round(h.dist)).join(" "));
  console.log("  not on the impact frame:", early.length, pct(early), "| time into swing ms (first 12):", H.slice(0, 12).map((h) => h.sinceSwing == null ? "none" : Math.round(h.sinceSwing)).join(" "));
  if (r.lands.length) { const L = r.lands.filter((l) => l.n > 0); console.log("  sword landings:", L.length, "| ms into swing min/max:", Math.round(Math.min(...L.map((l) => l.sinceSwing))), Math.round(Math.max(...L.map((l) => l.sinceSwing))), "| dist min/max:", Math.round(Math.min(...L.map((l) => l.dist))), Math.round(Math.max(...L.map((l) => l.dist))), "| misses (nothing at blade):", r.lands.filter((l) => l.n === 0).length);
    console.log("  HP losses NOT from a sword landing:", H.filter((h) => !h.sword).length, JSON.stringify(H.filter((h) => !h.sword).slice(0, 5).map((h) => ({ ms: Math.round(h.sinceSwing), d: Math.round(h.dist) })))); }
  if (r.lands.length) console.log("  attacks started:", r.attacks, "| hits that landed:", r.dealt, "(" + Math.round(100 * r.dealt / Math.max(1, r.attacks)) + "%) | kills at a sword landing:", r.kills.filter((k) => k.sword).length, "of", r.kills.length, "(the rest: cannon)");
  console.log("kills while watching:", r.killsShown, "in", SECS, "s");
  console.log("page hidden 12s -> kills still happen:", r.killsHidden);
  console.log("errs", errs.slice(0, 3));
  if (!process.env.NOASSERT) {
    assert.ok(H.length >= 20, "enough hits measured"); assert.strictEqual(far.length, 0, "no damage away from the sword"); if (r.lands.length) assert.strictEqual(H.filter((h) => !h.sword).length, 0, "every Gareth HP loss is a sword landing"); assert.strictEqual(early.length, 0, "damage only on the impact frame");
    assert.ok(r.killsHidden >= 2, "hidden page still fights"); assert.deepStrictEqual(errs, []); console.log("ALL OK");
  }
  await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
