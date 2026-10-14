/* v1164: Arena - the bot's Laser/Pulse Beam is drawn as a beam (was a missile volley) and its Orbit/Hex Shields are drawn on its fortress (were never shown).
   Bot gets laser_beam + hex_shield + orbit_shield, the player none. Run: node dev/simfork/g292_arena_bot_gfx.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const OUT = process.env.OUT || "/tmp/";
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
async function run() {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "g292@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Arena"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => setScreen("more", "arena")); await P.waitForTimeout(1500);
  await P.evaluate(() => { document.getElementById("arenaQuickMatchBtn").click(); }); await P.waitForTimeout(1000);
  /* the bot gets a Laser Beam, Hex Shield and Orbit Shield; the player has no weapons, so every beam / shield on screen is the bot's */
  await P.evaluate(() => { game.state.equippedWeapons = []; arenaOpponent.weapons = { laser_beam: 20, hex_shield: 20, orbit_shield: 20 }; });
  await P.evaluate(() => { document.getElementById("arenaAttackBtn").click(); });
  const seen = { aiBeams: 0, aiMissiles: 0, aiOrbit: 0, aiHex: 0, playerOrbit: 0, playerHex: 0 };
  for (let i = 0; i < 40; i++) {
    await P.waitForTimeout(250);
    const s = await P.evaluate(() => ({ b: (arenaAnim.beams || []).filter((x) => x.side === "a").length, m: (arenaAnim.weaponMissiles || []).length,
      ao: !!(orbitShieldSets.arenaAI && orbitShieldSets.arenaAI.last > performance.now() - 500), ah: !!(typeof hexShieldSets !== "undefined" && hexShieldSets.arenaAI && hexShieldSets.arenaAI.live),
      po: orbitShieldActive(), ph: hexShieldActive() }));
    seen.aiBeams += s.b; seen.aiMissiles += s.m; seen.aiOrbit += s.ao ? 1 : 0; seen.aiHex += s.ah ? 1 : 0; seen.playerOrbit += s.po ? 1 : 0; seen.playerHex += s.ph ? 1 : 0;
    if (s.b && !seen.shot) { seen.shot = 1; await P.screenshot({ path: path.join(__dirname, "out_g292_arena.png"), clip: { x: 0, y: 140, width: 430, height: 250 } }); }
  }
  await b.close(); return { seen, errs };
}
(async () => {
  const r = await run(); console.log(JSON.stringify(r));
  if (!process.env.NOASSERT) { assert.deepStrictEqual(r.errs, []); assert(r.seen.aiBeams > 0, "the bot's Laser is drawn as a beam"); assert(r.seen.aiMissiles === 0, "no missiles for a bot with only a Laser");
    assert(r.seen.aiOrbit > 0, "bot Orbit Shield drawn"); assert(r.seen.aiHex > 0, "bot Hex Shield drawn"); assert(r.seen.playerOrbit === 0 && r.seen.playerHex === 0, "player has no shields"); console.log("g292 ok"); }
})().catch((e) => { console.error(e); process.exit(1); });
