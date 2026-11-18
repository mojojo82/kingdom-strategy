/* v1726: Baelgor as built in the game (Aurek's numbers, Fear = Sunforge numbers + 4 s stun on the enemy hero closest to using their skill, landing
   when the sword is planted, Hanzo freezes mid-leap) - real Arena sim, nothing patched. [Gareth, Lyra, Kessa, Sera + X] vs [same 4 + Y], Lv80 / 25* / skill 5,
   no weapons / cards, 20 seeds both sides. Also with a +75% HP bonus on Baelgor (the planned HP card, not in the game yet).  node dev/balance/baelgor_ingame.js */
const fs = require("fs"), path = require("path"), ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const G = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8"), FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome", args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 } });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, require(path.join(ROOT, "dev/tests/siteroute.js"))(G));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/", { waitUntil: "domcontentloaded", timeout: 180000 }); await P.waitForSelector("#ksAuth .box", { timeout: 120000 });
  await P.fill("#ksE", "bg" + process.pid + "@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 120000 }); await P.fill("#ksN", "Sim"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  if (process.env.VARIANTS) await P.evaluate(() => { window.__variants = true; });
  const r = await P.evaluate(() => {
    const BASE = ["gareth", "lyra", "kessa", "sera"], ALL = BASE.concat(["hanzo", "aurek", "baelgor", "pip", "tom", "zarek"]);
    const hs = {}; ALL.forEach((k) => { hs[k] = { owned: true, level: 80, stars: 25, skillLevels: { conquest: [5, 5, 5], expedition: [1, 1, 1] } }; });
    let HPADD = 0, ST = { gaze: 0, onHanzo: 0, frozen: 0, fights: 0, bKo: 0 };
    const side = (keys, isP) => { const s2 = arenaSideStats(keys, hs, 15, 0, false, null, null, undefined, ZERO_BONUS); (s2.heroHp || []).forEach((e) => { if (e.id === "baelgor" && HPADD) { e.max = Math.round(e.max * (1 + HPADD)); e.hp = e.max; } e.runL = arenaRunDist(400, 240, Math.max(0, keys.indexOf(e.id)), isP); }); return s2; };
    const fight = (pK, aK, seed, my) => { const A = side(pK, true), B = side(aK, false); const sim = arenaMakeSim(A, B, { rng: worldPvpSeededRng(seed), critSeed: seed }); let res; ST.fights++;
      for (let t = 0; t < 4000; t++) { res = sim.step(); (res.info.casts || []).forEach((c) => { const m = /^([pa])_baelgor:gaze:(.+)$/.exec(c); if (m && (m[1] === "p") === (my === "P")) { ST.gaze++; if (m[2] === "hanzo") ST.onHanzo++; } }); if (res.done) break; }
      return res.winner || res.result; };
    const rate = (me, opp) => { let w = 0, d = 0, n = 0; ST = { gaze: 0, onHanzo: 0, fights: 0 }; const T = BASE.concat([me]), O = BASE.concat([opp]);
      for (let s = 0; s < 20; s++) { const r1 = fight(T, O, "t" + s, "P"), r2 = fight(O, T, "h" + s, "A"); w += (r1 === "player") + (r2 === "ai"); d += (r1 === "draw") + (r2 === "draw"); n += 2; }
      return { win: Math.round(100 * w / n), draw: Math.round(100 * d / n), fearStunsPerFight: +(ST.gaze / ST.fights).toFixed(2), onHanzo: ST.onHanzo }; };
    const out = {};
    if (window.__variants) { const V = {}; const sk = HERO_DEFS.baelgor.conquestSkills[0], SA = HERO_ANIMS.baelgor_skill, w0 = sk.wave.impact, n0 = SA.rows.skill[1];
      for (const [nm, imp, n, gat] of [["as built (shock + stun at 1.72 s)", w0, n0, null], ["shock at 0.375 s, stun at 1.72 s", 0.375, n0, 1.72], ["shock at 1.72 s, stun at 0.375 s", w0, n0, 0.375], ["shock + stun at 0.375 s", 0.375, n0, null]]) {
        sk.wave.impact = imp; SA.rows.skill[1] = n; sk.gaze.at = gat; for (const hp of [0, 0.75]) { HPADD = hp; V[nm + (hp ? " +75% HP" : "")] = rate("baelgor", "hanzo"); } }
      sk.wave.impact = w0; SA.rows.skill[1] = n0; delete sk.gaze.at; HPADD = 0; return V; }
    for (const hp of [0, 0.75]) { HPADD = hp; const tag = hp ? " (+75% HP card)" : "";
      out["Baelgor team vs Hanzo team" + tag] = rate("baelgor", "hanzo"); out["Baelgor team vs Aurek team" + tag] = rate("baelgor", "aurek"); out["Baelgor team vs Tom team" + tag] = rate("baelgor", "tom"); }
    HPADD = 0; out["(ref) Aurek team vs Hanzo team"] = rate("aurek", "hanzo"); out["(ref) Kessa-less: Aurek team vs Baelgor team"] = rate("aurek", "baelgor");
    return out; });
  console.log(JSON.stringify(r, null, 1)); console.log("page errors:", errs.length ? errs.slice(0, 5) : "none");
  fs.writeFileSync(path.join(ROOT, "dev/balance/results/baelgor_ingame" + (process.env.VARIANTS ? "_variants" : "") + (process.env.TAG ? "_" + process.env.TAG : "") + ".json"), JSON.stringify(r, null, 1)); await b.close();
})();
