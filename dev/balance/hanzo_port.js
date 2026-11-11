/* v1504: Hanzo's Shadow Step teleport (HANZO_PORT_PX) - before (0) vs after: solo Kessa (cards 11,2,3,4,5) vs maxed Hanzo + Lone Wolf, with/without Projection Wall, and Hanzo team tiers. node dev/balance/hanzo_port.js */
/* v985: Harley's cards 1-11 work (Conquest + Arena). Run: node dev/simfork/g215_card_effects.js */
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
  await ctx.route(/mojojo82\.github\.io/, require(require("path").join(__dirname, "../tests/siteroute.js"))(GAME));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "hzp@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Emp"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.waitForTimeout(1500);
  const r = await P.evaluate((__PX__) => {
    const st = game.state, FIVE = ["gareth", "lyra", "roran", "kessa", "sera"], HZ5 = ["hanzo", "lyra", "roran", "kessa", "sera"], out = {};
    const kit = (ids) => { const specs = []; let hex = 0; WEAPON_DEFS.forEach((w) => { if (!ids.includes(w.id)) return; const s = game.weaponStatsAtLevel(w, 30); if (w.kind === "shield") { hex = Math.max(hex, s.shieldPct || 0); return; } specs.push(simSpecOf(w, s, w.kind === "fx" ? 0 : s.dmg)); }); simApplyDup(specs, ids, null, null); return { specs, hex }; };
    const hsAt = (keys, lvl, sk) => { const hs = {}; keys.forEach((k) => { hs[k] = { owned: true, level: lvl, stars: lvl >= 80 ? 25 : lvl >= 40 ? 10 : 0, skillLevels: { conquest: k === "hanzo" ? [5, 5, 5] : sk, expedition: [3, 3, 3] } }; }); return hs; };
    const ORDER = ["gareth", "hanzo", "lyra", "roran", "kessa", "sera"];
    const side = (keys, lvl, isP, sk) => { const s2 = arenaSideStats(keys, hsAt(keys, lvl, sk), 15, 0, false, null, null, undefined, ZERO_BONUS); (s2.heroHp || []).forEach((e) => { e.runL = arenaRunDist(400, 240, Math.max(0, keys.indexOf(e.id)), isP); }); return s2; };
    const BUILDS = [[], ["emp_gun", "railgun", "clone_task"], ["hex_shield", "railgun", "status_wave"], ["hex_shield", "emp_gun", "railgun"], ["missile_barrage", "laser_beam", "orbit_shield"]];
    const cm = (ids) => { st.equippedCards = ids; return cardModsFrom(st); };
    const KC = cm([10, 1, 2, 3, 4]), HC = cm([10]);
    const one = (pS, aS, K, pC, aC, aK, seed) => { const r = arenaMakeSim(pS, aS, { rng: worldPvpSeededRng(seed), critSeed: seed, weapons: K.specs, aiWeapons: (aK || K).specs, shieldPct: K.hex, aiShieldPct: (aK || K).hex, cardMods: pC, aiCardMods: aC }).runToEnd(); return r === "player" ? 1 : r === "ai" ? 0 : 0.5; };
    /* A's win % vs B: every weapon build, A attacks + A defends, 3 seeds */
    const rate = (mkA, mkB, aC, bC, wallA) => { let w = 0, n = 0; BUILDS.forEach((ids) => { const KA = kit(wallA ? ids.slice(0, 2).concat(["projection_wall"]) : ids), KB = kit(ids); for (let s = 0; s < 3; s++) { w += one(mkA(true), mkB(false), KA, aC, bC, KB, "a" + s); w += 1 - one(mkB(true), mkA(false), KB, bC, aC, KA, "d" + s); n += 2; } }); return Math.round(100 * w / n); };
    const run = () => { const o = {};
      [40, 80].forEach((L) => { [[3, 3, 3], [5, 5, 5]].forEach((sk) => {
        o["Kessa(sk" + sk[0] + ") solo vs Hanzo+LoneWolf Lv" + L] = rate((p) => side(["kessa"], L, p, sk), (p) => side(["hanzo"], L, p, sk), KC, HC, false);
        o["  ...Kessa with Projection Wall Lv" + L + " sk" + sk[0]] = rate((p) => side(["kessa"], L, p, sk), (p) => side(["hanzo"], L, p, sk), KC, HC, true); }); });
      [40, 80].forEach((L) => { o["Hanzo team vs normal team Lv" + L + " (+0/+5/+10/+15/+20)"] = [0, 5, 10, 15, 20].map((up) => rate((p) => side(HZ5, L, p, [3, 3, 3]), (p) => side(FIVE, L + up, p, [3, 3, 3]), null, null, false)).join("/"); });
      return o; };
    const keepPx = __PX__ || HANZO_PORT_PX;
    HANZO_PORT_PX = 0; out.before = run();
    HANZO_PORT_PX = keepPx; out.after = run();
    out.portPx = keepPx;
    return JSON.stringify(out, null, 1);
  }, +(process.env.PX || 0));
  console.log(r); if (errs.length) console.log("ERRS", errs.slice(0, 3)); await b.close();
})();
