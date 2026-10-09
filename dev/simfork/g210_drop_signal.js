/* v973: Drop Signal card - each time your Railgun fires, fallen summons are redeployed and switched-off drones come back online. Player's own equipped card only. Run: node dev/simfork/g210_drop_signal.js */
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
  await P.fill("#ksE", "g210@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Emp"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const r = await P.evaluate(() => {
    const FIVE = ["gareth", "lyra", "roran", "kessa", "sera"], hs = {}; FIVE.forEach((k) => { hs[k] = { owned: true, level: 40, stars: 10, skillLevels: { conquest: [3, 3, 3], expedition: [3, 3, 3] } }; });
    const side = (isP) => { const st = arenaSideStats(FIVE, hs, 15, 0, false, null, null, undefined, ZERO_BONUS); (st.heroHp || []).forEach((e) => { e.runL = arenaRunDist(400, 240, FIVE.indexOf(e.id), isP); }); return st; };
    const kit = (ids) => { const m = {}; ids.forEach((id) => { m[id] = 30; }); return botWeaponsToSim(m); };
    const o = {};
    /* the card is read from the player's own equipped cards by name */
    const st0 = { cards: [{ name: "Drop Signal" }, { name: "Regen" }], equippedCards: [0] };
    o.found = !!equippedSummonCall(st0); o.notEquipped = !equippedSummonCall({ cards: st0.cards, equippedCards: [1] });
    /* meta vs an EMP build: clones summoned with and without the card */
    const fight = (card) => { const ka = kit(["emp_gun", "railgun", "clone_task"]), kb = kit(["emp_gun", "laser_beam", "missile_barrage"]);
      const sim = arenaMakeSim(side(true), side(false), { rng: worldPvpSeededRng("s"), critSeed: "s", weapons: ka.specs, aiWeapons: kb.specs, summonCall: card ? CARD_EFFECTS_BY_NAME["drop signal"] : null });
      let x; do { x = sim.step(); } while (!x.done); return { clones: sim.fxState.P.casts.clone || 0, rails: sim.fxState.P.casts.rail || 0, winner: x.winner }; };
    o.without = fight(false); o.with = fight(true);
    /* drones: an enemy Railgun switches my drone off; my own Railgun shot with the card turns it back on */
    const dsim = (card) => { const ka = kit(["railgun", "droid_call"]), kb = kit(["railgun"]); ka.specs.forEach((sp) => { if (sp.fx === "rail") sp.p = Object.assign({}, sp.p, { countdown: 15 }); }); /* mine fires after theirs has landed */ const sim = arenaMakeSim(side(true), side(false), { rng: worldPvpSeededRng("d"), critSeed: "d", weapons: ka.specs, aiWeapons: kb.specs, summonCall: card ? CARD_EFFECTS_BY_NAME["drop signal"] : null });
      let x, t = 0, before = null, after = null; do { x = sim.step(); t++; if (t === 30) before = sim.fxState.P.droneOff; if (t === 36) after = sim.fxState.P.droneOff; } while (!x.done && t < 40); return [before, after]; };
    o.droneOffWithout = dsim(false); o.droneOffWith = dsim(true);
    return o;
  });
  console.log(JSON.stringify(r));
  assert.ok(r.found && r.notEquipped, "the card works only while equipped, found by name");
  assert.ok(r.with.clones > r.without.clones, "with Drop Signal more clones are summoned against EMP");
  assert.ok(r.droneOffWith[0] > 0 && r.droneOffWith[1] === 0 && r.droneOffWithout[1] > 0, "Drop Signal brings a switched-off drone back online");
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
