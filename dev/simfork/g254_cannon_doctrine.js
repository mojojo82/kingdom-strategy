/* v1072: Cannon Doctrine card - text in card slot 17, +70% damage in Conquest only on a Fortress I, and in World PvP it turns an early Fortress I vs Fortress III loss into a win. Run: node dev/simfork/g254_cannon_doctrine.js */
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
  await P.fill("#ksE", "g254@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Emp"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => { game.state.researchPoints = 5e6; game.state.buildings.academy.level = 5; setScreen("city", "research"); renderTechs(); }); await P.waitForTimeout(600);
  const o = await P.evaluate(() => { const st = game.state, r = {};
    r.card = st.cards[16] && [st.cards[16].name, st.cards[16].type];
    const hk = Object.keys(st.heroes).find((k) => st.heroes[k].owned) || Object.keys(HERO_DEFS)[0];
    st.fortressTech = {}; st.equippedCards = []; const d0 = game.idleAttackerDamage(hk);
    st.equippedCards = [16]; const d1 = game.idleAttackerDamage(hk);
    st.fortressTech = { _type: 3 }; const d3 = game.idleAttackerDamage(hk); st.fortressTech = {};
    r.conquest = [d0, d1, d3];
    /* World PvP: fresh Fortress I vs fresh Fortress III, 5 heroes Lv40 2*, 300 of each troop */
    const HK = pvpSimHeroKeys();
    const mk = (fort) => { const c = pvpSimDefaultSide(true); c.fort = fort; c.th = 20; c.cannon = true; c.baseHp = 0; Object.keys(c.troops).forEach((t) => { c.troops[t] = 0; }); ["infantry", "archer", "cavalry"].forEach((t) => { c.troops[t] = 300; }); HK.forEach((k, i) => { c.heroes[k] = { on: i < 5, level: 40, arms: 10, c: [3, 3, 3], e: [3, 3, 3] }; }); c.weapons = {}; return c; };
    const fight = (ac, dc, seed, card) => { const a = pvpSimBuildSide(ac, false), d = pvpSimBuildSide(dc, true); if (card) { a.sim.state.cards = st.cards; a.sim.state.equippedCards = [16]; } return pvpSimRunOnce(a, d, ac, dc, seed, 0, 0, 0, 0, false).r.win; };
    let wNo = 0, wCard = 0, wCardOnF3 = 0; for (let s = 1; s <= 10; s++) { if (fight(mk("base"), mk("t3"), s, false)) wNo++; if (fight(mk("base"), mk("t3"), s, true)) wCard++; if (fight(mk("t3"), mk("base"), s, true)) wCardOnF3++; }
    r.pvp = { noCard: wNo, card: wCard, cardOnF3: wCardOnF3 };
    st.equippedCards = []; return r; });
  console.log(JSON.stringify(o), errs);
  assert.deepStrictEqual(o.card, ["Cannon Doctrine", "Fortress I"], "card text in slot 17");
  assert.ok(o.conquest[1] > o.conquest[0] && Math.abs(o.conquest[1] - o.conquest[0] * 1.7) <= 1, "Conquest: +70% on Fortress I (rounded)");
  assert.strictEqual(o.conquest[2], o.conquest[0], "Conquest: nothing on Fortress III");
  assert.ok(o.pvp.noCard <= 1 && o.pvp.card >= 9, "World PvP: early Fortress I loses without it, wins with it");
  assert.ok(o.pvp.cardOnF3 >= 9, "the card does nothing for a Fortress III attacker (it still wins as before)");
  assert.deepStrictEqual(errs, []); console.log("g254 OK"); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
