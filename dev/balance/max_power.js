/* Power of a fully maxed account (Harley, 17 Oct): every building, research, Fortress I tree, all heroes Lv80 5 stars skills 5, every weapon Lv50,
   10 worn Legendary equipment (average roll), Sword of Power at the Town Hall 30 cap (300 per lane) - then + 100k / 200k / 300k T10 troops. Run: node dev/balance/max_power.js */
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
  await P.fill("#ksE", "pmax@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Rig"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  const out = await P.evaluate(() => {
    const S = game.state;
    Object.keys(BUILDING_DEFS).forEach((k) => { S.buildings[k].level = BUILDING_DEFS[k].maxLevel; S.buildings[k].upgrading = null; });
    Object.keys(TECH_DEFS).forEach((k) => { S.tech[k] = TECH_DEFS[k].maxLevel || 99; });
    S.fortressTech = S.fortressTech || {}; Object.keys(FORTRESS1_TREE).forEach((k) => { S.fortressTech[k] = FORTRESS1_TREE[k].maxLevel; });
    Object.keys(HERO_DEFS).forEach((k) => { const d = HERO_DEFS[k]; if (d.comingSoon) return; const h = S.heroes[k] || (S.heroes[k] = {}); h.owned = true; h.level = HERO_MAX_LEVEL; h.stars = STAR_MAX_ARMS;
      h.skillLevels = { conquest: [5, 5, 5], expedition: [5, 5, 5] }; });
    S.weaponFrags = S.weaponFrags || {}; S.weaponLevels = S.weaponLevels || {};
    WEAPON_DEFS.forEach((w) => { if (w.visualOnly) return; S.weaponFrags[w.id] = 1; S.weaponLevels[w.id] = WEAPON_MAX_LEVEL; });
    S.equipment.slots = []; for (let i = 0; i < 10; i++) S.equipment.slots.push({ rarity: "Legendary", atk: 32.8, hp: 0, def: 0, sec: [] });
    S.training.atk = S.training.hp = S.training.def = 300;
    Object.keys(TROOP_DEFS).forEach((t) => { S.troops[t] = 0; });
    const rows = [];
    const t10 = Object.keys(TROOP_DEFS).filter((t) => /_t10$/.test(t));
    [0, 100000, 200000, 300000].forEach((n) => {
      t10.forEach((t, i) => { S.troops[t] = Math.floor(n / t10.length) + (i < n % t10.length ? 1 : 0); });
      const b = game.powerBreakdown(); rows.push({ troops: n, total: game.governorPower(), b });
    });
    const hc = Object.keys(HERO_DEFS).filter((k) => !HERO_DEFS[k].comingSoon).length;
    return { rows, heroes: hc, weapons: WEAPON_DEFS.filter((w) => !w.visualOnly).length, t10 };
  });
  console.log(JSON.stringify(out, null, 1));
  await b.close();
  if (errs.length) console.log("errors", errs);
})().catch((e) => { console.error(e); process.exit(1); });
