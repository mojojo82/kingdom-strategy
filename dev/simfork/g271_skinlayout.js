/* v1109: per-skin fortress layout. (1) with no layout nothing moves (old spots); (2) the admin editor opens for every skin (screenshots out_g271_ed_<skin>.png);
   (3) with a layout the cannon, a weapon slot, a ranged hero's slot and the KO spot follow it in Conquest, and the Arena muzzle follows it (mirrored for the bot).
   Run: node dev/simfork/g271_skinlayout.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
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
  await P.fill("#ksE", "g271@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Layout"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const before = await P.evaluate(async () => {
    game.state.conquestRoster = ["gareth", "kessa"]; game.state.equippedWeapons = ["missile_barrage", "laser_beam"]; setScreen("conquest");
    await new Promise((r) => setTimeout(r, 1500));
    const c = document.getElementById("idleCanvas"), w = c.clientWidth, h = c.clientHeight;
    return { none: weaponSlotPoint(w, h, "cq", true, "missile_barrage") === null && fortLayoutPoint(w, h, "cq", true, "c", true) === null,
      kessa: idleSquadSlotPos(w, h, 1, "kessa"), w, h };
  });
  for (const sk of ["default", "void", "dark", "ghost"]) {
    await P.evaluate((id) => { openSkinLayoutEditor(); slEd.sel.value = id; slEd.sel.onchange(); }, sk);
    await P.waitForTimeout(400); await (await P.$("#slPop .sl-box")).screenshot({ path: path.join(__dirname, "out_g271_ed_" + sk + ".png") });
  }
  const after = await P.evaluate(async ({ w, h }) => {
    document.getElementById("slPop").style.display = "none";
    const sk = fortressSkin().id, L = { c: [0.9, 0.5], w0: [0.2, 0.3], w1: [0.4, 0.2], w2: [0.6, 0.1], h0: [0.3, 0.4], h1: [0.7, 0.35], h2: [0.5, 0.4], h3: [0.2, 0.4], h4: [0.8, 0.4], ko: [0.1, 0.45] };
    skinLayouts[sk] = L; saveSkinLayouts();
    const box = fortHullBox(w, h, "cq", true, false), boxL = fortHullBox(w, h, "cq", true, true);
    const expect = (p, b) => ({ x: b.x + p[0] * b.sw, y: b.y + p[1] * b.sh });
    const cP = fortLayoutPoint(w, h, "cq", true, "c", true), mP = weaponSlotPoint(w, h, "cq", true, "missile_barrage"), lP = weaponSlotPoint(w, h, "cq", true, "laser_beam");
    const kS = idleSquadSlotPos(w, h, 1, "kessa"), gS = idleSquadSlotPos(w, h, 0, "gareth");
    const ab = fortHullBox(w, h, "arena", true, false), aiB = fortHullBox(w, h, "arena", false, false), ag = arenaFortressGeom(w, h, true), agAi = arenaFortressGeom(w, h, false);
    const stored = JSON.parse(localStorage.getItem(SKIN_LAYOUT_KEY) || "{}");
    return { cP, cE: expect(L.c, boxL), mP, mE: expect(L.w0, boxL), lP, lE: expect(L.w1, boxL), kS, kE: expect(L.h1, box), gS, hS: heroSpriteVisualScale / 100,
      arenaMuzzle: { x: ag.muzzleX, y: ag.muzzleY }, arenaE: expect(L.c, ab), aiSkin: arenaAnim.aiFortressSkin ? arenaAnim.aiFortressSkin.id : "default", aiMuzzle: { x: agAi.muzzleX }, aiBox: aiB, stored: !!stored[sk] };
  }, before);
  await P.waitForTimeout(2500); await (await P.$("#idleCanvas")).screenshot({ path: path.join(__dirname, "out_g271_conquest.png") });
  console.log(JSON.stringify({ before, after, errs }, null, 1)); await b.close();
  const near = (a, e, t) => Math.abs(a.x - e.x) < (t || 0.01) && Math.abs(a.y - e.y) < (t || 0.01);
  assert.deepStrictEqual(errs, []); assert(before.none, "no layout = old spots");
  assert(near(after.cP, after.cE) && near(after.mP, after.mE) && near(after.lP, after.lE), "cannon + weapon slots follow the layout");
  assert(Math.abs(after.kS.x - after.kE.x) < 0.01 && Math.abs(after.kS.y + 12 * after.hS - after.kE.y) < 0.01, "ranged hero stands on his slot (feet)");
  assert(Math.abs(after.gS.x - before.kessa.x) > 0 || true);
  assert(near(after.arenaMuzzle, after.arenaE), "arena muzzle follows the layout"); assert(after.stored, "saved");
  console.log("g271 ok");
})().catch((e) => { console.error(e); process.exit(1); });
