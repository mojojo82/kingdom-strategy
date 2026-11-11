/* v1474: Fortress II (Command) - tree, costs, power, bonus, Conquest + Arena cooldown / hero damage, card 10, pickers, save. Run: node dev/simfork/g255_fortress2esearch.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const OUT = process.env.OUT || "/tmp/";
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
  await P.fill("#ksE", "g255@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Cmd"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const o = await P.evaluate(() => { const st = game.state, r = {};
    const T = FORTRESS2_TREE, keys = Object.keys(T); r.nodes = keys.length; r.levels = keys.reduce((a, k) => a + T[k].maxLevel, 0);
    let tot = 0; for (const k of keys) for (let l = 1; l <= T[k].maxLevel; l++) tot += fortressNodeCost(k, l); r.tot2 = Math.round(tot);
    const p0 = game.governorPower(); st.fortressTech = fortressMaxMap(2); r.powMax2 = game.governorPower() - p0; r.type = fortressTypeOf(st.fortressTech);
    const bMax = fortressBonusFrom(fortressMaxMap(2)), b0 = fortressBonusFrom({ _type: 2 }), b1 = fortressBonusFrom(fortressMaxMap(1));
    r.bonus = { innateCdr: b0.cdr, maxCdr: +bMax.cdr.toFixed(3), maxHeroDmg: +bMax.heroDmg.toFixed(3), f1cdr: b1.cdr, f1heroDmg: b1.heroDmg, crit: bMax.critRate };
    /* Arena / World PvP side stats */
    const hk = Object.keys(st.heroes).filter((k) => st.heroes[k].owned).slice(0, 2); hk.forEach((k) => { st.heroes[k].level = 80; });
    const s1 = arenaSideStats(hk, st.heroes, 1, 0, true, null, fortressMaxMap(1)), s2 = arenaSideStats(hk, st.heroes, 1, 0, true, null, fortressMaxMap(2));
    r.arena = { cdr1: s1.fortCdr, cdr2: +s2.fortCdr.toFixed(3), dmgRatio: +(s2.attackers[0].dmg / s1.attackers[0].dmg).toFixed(2) };
    /* card 10 sees the combined total; cooldown maths uses it too */
    const m = cardModsWithFortCdr(Object.assign(cardModsBlank(), { any: true, cdrDmg: { over: 0.25, pct: 0.25 } }), bMax.cdr);
    r.card10 = { onMax: cardHeroDmgMul(m, hk[0], 1, 2), onInnate: cardHeroDmgMul(cardModsWithFortCdr(Object.assign(cardModsBlank(), { any: true, cdrDmg: { over: 0.25, pct: 0.25 } }), b0.cdr), hk[0], 1, 2), cdMul: +(1 - cardCdBonus(m, 1)).toFixed(3) };
    /* Conquest: hero hit damage and the cooldown the next skill gets */
    st.fortressTech = fortressMaxMap(1); r.conqCd1 = +(1 - cardCdBonus(conqCardMods(st), 1)).toFixed(3);
    st.fortressTech = fortressMaxMap(2); r.conqCd2 = +(1 - cardCdBonus(conqCardMods(st), 1)).toFixed(3);
    return r; });
  /* pickers: Conquest picker has I / II / III, II sets the type; research hub card opens the tree */
  o.ui = await P.evaluate(() => { const st = game.state; st.fortressTech = {}; const d = document.createElement("div"); d.innerHTML = fortPickHtml("conquest"); document.body.appendChild(d);
    const btns = [...d.querySelectorAll("button")].map((b) => b.textContent); d.querySelector('button[data-ft="2"]').click(); const after = fortressTypeOf(st.fortressTech); d.remove();
    st.arenaFort = 2; const arenaT = fortressTypeOf(myArenaFortMap());
    activeTechCategory = "fortress2"; setScreen("city"); try { renderTechs(); } catch (e) {} const title = (document.getElementById("fortressTitle") || {}).textContent || "";
    const hub = RESEARCH_HUB[1].cards.map((c) => c.name + " " + researchHubCardInfo(c.key).total);
    st.researchPoints = 1e6; const q = game.researchFortress("t2_post"); persist();
    return { btns, after, arenaT, title, hub, queued: q.ok, qKey: st.researchQueue && st.researchQueue.key }; });
  await P.reload(); await P.waitForTimeout(6000);
  o.reload = await P.evaluate(() => ({ type: fortressTypeOf(game.state.fortressTech), arena: game.state.arenaFort, q: game.state.researchQueue && game.state.researchQueue.key }));
  console.log(JSON.stringify(o), JSON.stringify(errs.slice(0, 3)));
  assert.strictEqual(o.nodes, 31); assert.strictEqual(o.levels, 143);
  assert.ok(Math.abs(o.tot2 - 100e6) < 2e5, "full tree ~100M RP");
  assert.ok(Math.abs(o.powMax2 - 61.3e6) < 0.5e6, "maxed tree power ~61.3M like I / III");
  assert.strictEqual(o.type, 2);
  assert.strictEqual(o.bonus.innateCdr, 0.1); assert.strictEqual(o.bonus.maxCdr, 0.45); assert.strictEqual(o.bonus.maxHeroDmg, 1); assert.strictEqual(o.bonus.f1cdr, 0); assert.strictEqual(o.bonus.crit, 0);
  assert.strictEqual(o.arena.cdr1, 0); assert.strictEqual(o.arena.cdr2, 0.45); assert.strictEqual(o.arena.dmgRatio, 2);
  assert.strictEqual(o.card10.onMax, 1.25, "card 10 on with a maxed Fortress II (45% > 25%)"); assert.strictEqual(o.card10.onInnate, 1, "card 10 off on the innate alone");
  assert.strictEqual(o.card10.cdMul, 0.55); assert.strictEqual(o.conqCd1, 1); assert.strictEqual(o.conqCd2, 0.55);
  assert.deepStrictEqual(o.ui.btns, ["💣 I", "⚡ II", "🛡️ III"]); assert.strictEqual(o.ui.after, 2); assert.strictEqual(o.ui.arenaT, 2);
  assert.ok(/Command/.test(o.ui.title), "Fortress II tree opens"); assert.ok(o.ui.hub.indexOf("Fortress II 143") >= 0, "hub card");
  assert.ok(o.ui.queued && o.ui.qKey === "t2_post", "Fortress II node researches on the lane");
  assert.strictEqual(o.reload.type, 2); assert.strictEqual(o.reload.arena, 2); assert.strictEqual(o.reload.q, "t2_post");
  assert.strictEqual(errs.length, 0, "no page errors");
  console.log("g255 OK"); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
