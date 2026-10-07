/* v922: the boss must be alone: no horde enemy in the fight or on screen while the boss is up (Harley saw a few enemies + the boss, chapter 2).
   Plays chapter 2 with Gareth + Lyra (+ cannon, missiles) and samples every frame. Run: node dev/simfork/g181_bossalone.js (GAMEFILE=..., SECS=, NOASSERT=1) */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store), SECS = +process.env.SECS || 150;
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
  await P.fill("#ksE", "g181@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Boss"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const r = await P.evaluate(async (A) => { const SECS = A[0];
    setScreen("conquest"); const st = game.state.idle;
    game.state.conquestRoster = ["gareth", "lyra"]; game.state.equippedWeapons = A[1]; st.fortressCannonEnabled = true;
    st.chapter = 2; st.levelNum = 1; st.enemies = []; st.bossPhase = false; st.enemiesKilledInLevel = 0; st.spawnTimer = null;
    const ev = { engineMix: 0, screenMix: 0, bosses: 0, samples: [] }; let lastBoss = false;
    const iv = setInterval(() => {
      if (st.playerHp != null && st.playerHp < 60) st.playerHp = 1e6;
      const eng = st.enemies || [], bossE = eng.some((e) => e.type === "boss"), othersE = eng.filter((e) => e.type !== "boss").length;
      const vis = Object.values(idleAnim.enemyById || {}), bossV = vis.some((v) => v.type === "boss"), othersV = vis.filter((v) => v.type !== "boss");
      if (bossE && !lastBoss) ev.bosses++; lastBoss = bossE;
      if (bossE && othersE) { ev.engineMix++; if (ev.samples.length < 6) ev.samples.push({ where: "engine", level: st.chapter + "-" + st.levelNum, others: othersE, phase: st.bossPhase, killed: st.enemiesKilledInLevel }); }
      if (bossV && othersV.length) { ev.screenMix++; if (ev.samples.length < 12) ev.samples.push({ where: "screen", level: st.chapter + "-" + st.levelNum, others: othersV.map((v) => v.type + (v.dying ? "(dying)" : "") + "@" + Math.round(v.x) + " gone:" + (v.goneT ? v.goneT.toFixed(2) : 0) + " owed:" + (idleAnim.pendingArrows[v.id] || 0)).join(","), engineOthers: othersE }); }
    }, 20);
    await new Promise((res) => setTimeout(res, SECS * 1000)); clearInterval(iv);
    ev.reached = st.chapter + "-" + st.levelNum; return ev;
  }, [SECS, (process.env.W || "missile_barrage").split(",")]);
  console.log("bosses seen:", r.bosses, "| reached", r.reached, "| frames boss + other enemies IN THE FIGHT:", r.engineMix, "| ON SCREEN:", r.screenMix);
  r.samples.forEach((s) => console.log("  ", JSON.stringify(s)));
  console.log("errs", errs.slice(0, 3));
  if (!process.env.NOASSERT) { assert.ok(r.bosses >= 2, "saw bosses"); assert.strictEqual(r.engineMix, 0, "boss alone in the fight"); assert.strictEqual(r.screenMix, 0, "boss alone on screen"); assert.deepStrictEqual(errs, []); console.log("ALL OK"); }
  await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
