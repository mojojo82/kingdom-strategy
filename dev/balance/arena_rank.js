/* Arena ranking of the WHOLE roster (v1575). Every hero appears equally often in random 5-hero teams; team pairs fight both sides with fixed seeds.
   A hero's score = win rate of the teams he was in (draws = half). Usage: node dev/balance/arena_rank.js [--rounds 40] [--seeds 2] [--cards kessa:2,3]
   --cards hero:#,#[;hero2:#] = a team that includes that hero equips those cards (card numbers as in the game, e.g. Kessa's #2 and #3). */
const fs = require("fs"), path = require("path"), ROOT = path.join(__dirname, "../..");
const args = process.argv.slice(2), arg = (k, d) => { const i = args.indexOf("--" + k); return i >= 0 ? args[i + 1] : d; };
const ROUNDS = +arg("rounds", 40), SEEDS = +arg("seeds", 2), CARDS = arg("cards", "");
(async () => {
  const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
  const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome";
  const GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8"), FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8");
  const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 } });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, require(path.join(ROOT, "dev/tests/siteroute.js"))(GAME));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => process.stderr.write("PAGEERR " + e.message + "\n"));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/", { timeout: 180000 }); await P.waitForSelector("#ksAuth .box", { timeout: 120000 });
  await P.fill("#ksE", "rank" + process.pid + "@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 120000 }); await P.fill("#ksN", "Sim"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => setScreen("city"));
  const res = await P.evaluate(async ({ ROUNDS, SEEDS, CARDS }) => {
    const CARDMAP = {}; CARDS.split(";").filter(Boolean).forEach((e) => { const [h, l] = e.split(":"); CARDMAP[h] = l.split(",").map((n) => +n - 1); });
    const cardsFor = (team) => { const idx = []; team.forEach((k) => { (CARDMAP[k] || []).forEach((i) => { if (!idx.includes(i)) idx.push(i); }); }); return idx.length ? cardModsFrom(Object.assign({}, game.state, { equippedCards: idx })) : null; };
    const ALL = Object.keys(HERO_DEFS), out = { cardsCheck: JSON.stringify(cardsFor(["kessa"])),  heroes: ALL.map((k) => [k, HERO_DEFS[k].name, HERO_DEFS[k].rarity, HERO_DEFS[k].class]), levels: {} };
    let rs = 12345; const rnd = () => { rs = (rs * 1103515245 + 12345) & 0x7fffffff; return rs / 0x7fffffff; };
    for (const [tag, lvl, arms, sk] of [["Lv40 2*", 40, 10, 3], ["Lv80 5*", 80, 25, 5]]) {
      const hs = {}; ALL.forEach((k) => { hs[k] = { owned: true, level: lvl, stars: arms, skillLevels: { conquest: [sk, sk, sk], expedition: [sk, sk, sk] } }; });
      const sc = {}; ALL.forEach((k) => { sc[k] = { w: 0, l: 0, d: 0 }; });
      const mk = (roster, isP) => { const st = arenaSideStats(roster, hs, 20, arenaBaseHpPlayer, false, null, null, undefined, ZERO_BONUS); (st.heroHp || []).forEach((e) => { const ix = roster.indexOf(e.id); if (ix >= 0) e.runL = arenaRunDist(400, 240, ix, isP); }); return st; };
      let fights = 0;
      for (let r = 0; r < ROUNDS; r++) {
        const deck = ALL.slice(); for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
        const teams = []; for (let i = 0; i + 5 <= deck.length; i += 5) teams.push(deck.slice(i, i + 5));
        for (let i = 0; i < teams.length; i++) for (let j = 0; j < teams.length; j++) { if (i === j) continue;
          for (let s = 0; s < SEEDS; s++) { const seed = tag + "|" + r + "|" + i + "|" + j + "|" + s; const sim = arenaMakeSim(mk(teams[i], true), mk(teams[j], false), { rng: worldPvpSeededRng(seed), critSeed: seed, cardMods: cardsFor(teams[i]), aiCardMods: cardsFor(teams[j]) }); const w = sim.runToEnd(); fights++;
            teams[i].forEach((k) => { if (w === "player") sc[k].w++; else if (w === "ai") sc[k].l++; else sc[k].d++; });
            teams[j].forEach((k) => { if (w === "ai") sc[k].w++; else if (w === "player") sc[k].l++; else sc[k].d++; }); } }
        await new Promise((r2) => setTimeout(r2, 0));
      }
      out.levels[tag] = { sc, fights };
    }
    return out;
  }, { ROUNDS, SEEDS, CARDS });
  if (CARDS) console.log("cards for a Kessa team:", res.cardsCheck);
  const info = {}; res.heroes.forEach(([k, n, r, c]) => { info[k] = { n, r, c }; });
  for (const tag of Object.keys(res.levels)) {
    const { sc, fights } = res.levels[tag];
    const rows = Object.keys(sc).map((k) => { const s = sc[k], g = s.w + s.l + s.d; return [k, g ? (s.w + s.d / 2) / g : 0, g]; }).sort((a, b) => b[1] - a[1]);
    console.log("\n" + tag + "  (" + fights + " fights)");
    rows.forEach(([k, p, g], i) => console.log(String(i + 1).padStart(2) + ". " + (info[k].n + "            ").slice(0, 12) + " " + (info[k].r + "          ").slice(0, 10) + " " + (info[k].c + "        ").slice(0, 9) + " " + (p * 100).toFixed(1).padStart(5) + "%  (" + g + " fights)"));
  }
  fs.writeFileSync(path.join(__dirname, "results", CARDS ? "arena_rank_cards.json" : "arena_rank_latest.json"), JSON.stringify(res, null, 1));
  await b.close();
})();
