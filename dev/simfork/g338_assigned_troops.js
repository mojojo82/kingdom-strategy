/* v1241 (Harley): troops + heroes belong to one formation; Reserve; auto-refill (home first); other tiers when short; Equalise; 5 presets with heroes;
   old saves migrate; City Guard defends with its own troops. SHOTS=dir. Run: node dev/simfork/g338_assigned_troops.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call0 = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store), DELAY = 1500;
 /* the FIRST move is slow to reach the server (cold start / bad signal), later ones are quick - so a second move can land first, like on a phone */
const call = call0;
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
  await P.fill("#ksE", "g338@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Assigner"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  const SH = process.env.SHOTS;
  const r = await P.evaluate(() => {
    const g = game, s = g.state, out = {}, F = s.formations, sum = (o) => Object.values(o || {}).reduce((a, b) => a + b, 0);
    s.marches.length = 0; Object.keys(s.troops).forEach((k) => { s.troops[k] = 0; }); F.forEach((f) => { f.troops = {}; f.held = {}; f.heroKeys = []; });
    s.buildings.townhall.level = 10; s.buildings.commandcenter.level = 10; /* march size 8,500 + heroes */
    s.troops.infantry = 6000; s.troops.archer = 3000;
    /* 1. a formation takes its troops; the rest stay in the Reserve */
    g.saveFormation(0, { infantry: 4000, archer: 2000 }); out.f0 = Object.assign({}, F[0].held); out.res1 = g.reserveAll();
    g.saveFormation(1, { infantry: 3000 }); out.f1 = Object.assign({}, F[1].held); out.res2 = g.reserveAll();
    /* 2. a formation can't be over its march size */
    g.saveFormation(2, { infantry: 20000 }); out.f2set = sum(F[2].troops); g.releaseFormation(2);
    /* 3. send formation 0: its own troops leave */
    const res = s.map.filter((t) => t.type === "resource")[0];
    const m = g.sendMarch(g.formationArmy(0), res.id, "gather", F[0].heroKeys, null, null, 0);
    out.sent = m.ok ? sum(m.march.army) : m.reason; out.f0out = sum(F[0].held); out.again = g.sendMarch({ infantry: 10 }, res.id, "gather", [], null, null, 0).reason;
    out.reserveSend = g.sendMarch({ infantry: 1 }, res.id, "gather", []).reason; /* Reserve is empty of infantry */
    /* 4. it comes back 1,000 infantry short; meanwhile 1,500 new infantry trained -> formation 1 (home longest) refills first, then 0 */
    m.march.army.infantry = 3000; m.march.status = "returning"; m.march.returnAt = Date.now() - 10; s.troops.infantry += 1500; g.tick();
    out.after = { f0: Object.assign({}, F[0].held), f1: Object.assign({}, F[1].held), res: g.reserveAll() };
    /* 5. out of that tier: uses the same type's other tiers, best first */
    s.troops.infantry_t3 = 300; s.troops.infantry_t2 = 900; g.tick(); out.tiers = Object.assign({}, F[0].held);
    /* 6. heroes in one formation only */
    const hk = Object.keys(s.heroes).filter((k) => s.heroes[k].owned && HERO_DEFS[k].class !== "governor");
    g.toggleFormationHero(0, hk[0]); g.toggleFormationHero(1, hk[0]); out.heroMove = [F[0].heroKeys.slice(), F[1].heroKeys.slice()];
    /* 7. Equalise (formation 2, Reserve: archer 1000 + new troops) */
    s.troops.cavalry = 5000; s.troops.archer += 5000; g.tick();
    g.equaliseFormation(2); out.eq = {}; Object.keys(F[2].held).forEach((k) => { const b = troopBase(k); out.eq[b] = (out.eq[b] || 0) + F[2].held[k]; }); out.eqCap = g.marchCapacity(F[2].heroKeys);
    /* 8. preset with a hero: hero moves to formation 2, troops 50/20/30 of the march size */
    g.releaseFormation(2); s.troops.infantry += 8000; g.tick(); g.savePreset(0, { name: "Siege", mode: "ratio", mix: { infantry: 50, archer: 20, cavalry: 30 }, heroKeys: [hk[0]] });
    const ap = g.applyPreset(2, 0); out.preset = { ok: ap.ok, heroes: [F[1].heroKeys.slice(), F[2].heroKeys.slice()], cap: g.marchCapacity(F[2].heroKeys) }; out.preset.mix = {}; Object.keys(F[2].held).forEach((k) => { const b = troopBase(k); out.preset.mix[b] = (out.preset.mix[b] || 0) + F[2].held[k]; });
    /* 9. old save (no held, same hero in two formations) loads: formations take their numbers in order, hero kept in the first */
    const old = JSON.parse(JSON.stringify(stateForOwnSave())); old.marches = []; old.troops = { infantry: 5000, archer: 1000 };
    old.formations.forEach((f) => { delete f.held; delete f.homeAt; f.troops = {}; f.heroKeys = []; }); old.formations[0].troops = { infantry: 3000, archer: 500 }; old.formations[1].troops = { infantry: 4000 }; old.formations[0].heroKeys = [hk[0]]; old.formations[1].heroKeys = [hk[0]];
    const g2 = createGame({ mapSize: 3, seed: 1 }); g2.loadState(old); out.mig = { f0: g2.state.formations[0].held, f1: g2.state.formations[1].held, h: [g2.state.formations[0].heroKeys, g2.state.formations[1].heroKeys], res: g2.reserveAll() };
    /* 10. the City Guard defends with its own troops */
    const sv = JSON.parse(JSON.stringify(stateForOwnSave())); const gi = sv.formations.findIndex((f) => f.guard); sv.guardOn = true; sv.formations[gi].troops = { infantry: 700 }; sv.formations[gi].held = { infantry: 700 };
    out.guard = sum(defenderFromSave(sv, { cityGuard: true }).army);
    out.typeTot = {}; Object.keys(F[0].held).forEach((k) => { const b = troopBase(k); out.typeTot[b] = (out.typeTot[b] || 0) + F[0].held[k]; });
    return out;
  });
  await P.evaluate(() => { persist(); setScreen("city", "formations"); }); await P.waitForTimeout(800);
  await P.evaluate(() => render()); await P.waitForSelector(".formation-card.fm2", { timeout: 5000 });
  const ui = await P.evaluate(() => { const c = document.querySelector(".formation-card.fm2"); return { reserve: (document.getElementById("fmReserve") || {}).textContent, quick: document.querySelectorAll(".fm-q").length, rows: c.querySelectorAll(".fm-row").length, slots: c.querySelectorAll(".fm-slot").length, tag: c.querySelector(".fm-tag").textContent, have: [...c.querySelectorAll(".fm-have")].map((e) => e.textContent) }; });
  /* hero picker: tap slot 1 of formation 1 (empty) -> pick the first hero -> it moves in */
  const hp = await P.evaluate(async () => { const F = game.state.formations; F[0].heroKeys = []; render(); const c = document.querySelectorAll(".formation-card.fm2")[0]; c.querySelectorAll(".fm-slot")[0].click(); await new Promise((r) => setTimeout(r, 200));
    const sh = document.getElementById("heroPickSheet"), open = sh.style.display; const b = sh.querySelector(".hp-h:not([disabled])"); const hk = b.getAttribute("data-hk"); b.click(); await new Promise((r) => setTimeout(r, 100)); document.getElementById("hpOk").click(); await new Promise((r) => setTimeout(r, 200));
    return { open, hk, f0: F[0].heroKeys.slice(), others: F.slice(1).some((f) => (f.heroKeys || []).indexOf(hk) !== -1), slotTitle: document.querySelectorAll(".formation-card.fm2")[0].querySelectorAll(".fm-slot")[0].title }; });
  if (SH) await P.screenshot({ path: SH + "/af_formations.png" });
  if (SH) { await P.evaluate(() => { document.querySelectorAll(".formation-card.fm2")[0].querySelectorAll(".fm-slot")[4].click(); }); await P.waitForTimeout(300); await P.screenshot({ path: SH + "/af_heropick.png" }); await P.evaluate(() => closeHeroPick()); }
  await P.evaluate(() => { document.querySelector(".fm-qp").click(); }); await P.waitForTimeout(300);
  if (SH) await P.screenshot({ path: SH + "/af_presets.png" });
  await P.evaluate(() => { document.querySelector("#presetSheet [data-ed='1']").click(); }); await P.waitForTimeout(300);
  if (SH) await P.screenshot({ path: SH + "/af_preset_edit.png" });
  console.log(JSON.stringify({ r, ui, hp, errs }, null, 0));
  await b.close();
  assert.deepStrictEqual(errs, []);
  assert.deepStrictEqual([r.f0, r.res1], [{ infantry: 4000, archer: 2000 }, { infantry: 2000, archer: 1000 }], "formation takes its troops, rest in Reserve");
  assert.deepStrictEqual([r.f1, r.res2], [{ infantry: 2000 }, { archer: 1000 }], "second formation gets what's left");
  assert.strictEqual(r.f2set, 8500, "set numbers capped to the march size");
  assert.strictEqual(r.sent, 6000); assert.strictEqual(r.f0out, 0); assert.strictEqual(r.again, "formation_out"); assert.strictEqual(r.reserveSend, "not_enough_infantry");
  assert.deepStrictEqual(r.after, { f0: { infantry: 3500, archer: 2000 }, f1: { infantry: 3000 }, res: { archer: 1000 } }, "home first (formation 1) refilled first, then the returning one");
  assert.deepStrictEqual(r.tiers, { infantry: 3500, archer: 2000, infantry_t3: 300, infantry_t2: 200 }, "short infantry filled with T3 then T2");
  assert.deepStrictEqual(r.heroMove[0], []); assert.strictEqual(r.heroMove[1].length, 1, "hero moved to formation 2");
  assert.strictEqual(r.eq.infantry + r.eq.archer + r.eq.cavalry, r.eqCap, "Equalise fills to the march size"); assert(Math.abs(r.eq.archer - r.eq.cavalry) <= 1, "even split");
  assert(r.preset.ok && r.preset.heroes[0].length === 0 && r.preset.heroes[1].length === 1, "preset hero moved in");
  assert(Math.abs(r.preset.mix.infantry - r.preset.cap * 0.5) <= 2 && Math.abs(r.preset.mix.cavalry - r.preset.cap * 0.3) <= 2, "preset 50/20/30");
  assert.deepStrictEqual(r.mig.f0, { infantry: 3000, archer: 500 }); assert.deepStrictEqual(r.mig.f1, { infantry: 2000 }); assert.strictEqual(r.mig.h[0].length, 1); assert.strictEqual(r.mig.h[1].length, 0); assert.deepStrictEqual(r.mig.res, { archer: 500 });
  assert.strictEqual(r.guard, 700, "City Guard defends with its own troops");
  assert.deepStrictEqual(r.typeTot, { infantry: 4000, archer: 2000 }, "stand-in tiers count toward the type - never over the set numbers");
  assert(ui.reserve && /Reserve/.test(ui.reserve) && ui.quick >= 6 && ui.rows === 3 && ui.slots === 5, "Formations screen (mockup): Reserve, 3 troop rows, 5 hero slots, Equalise + Preset");
  assert(hp.open === "block" && hp.f0.length === 1 && hp.f0[0] === hp.hk && !hp.others, "hero picker puts the hero in the slot (and nowhere else)");
  console.log("g338 ok");
})().catch((e) => { console.error(e); process.exit(1); });
