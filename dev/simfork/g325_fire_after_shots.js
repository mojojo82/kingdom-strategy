/* v1205 (Harley): after a win the base's new fire waits until the ship's volleys are done (the 5 s acting phase + the last shells landing),
   while the hit itself reaches the server straight away. Run: node dev/simfork/g325_fire_after_shots.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call0 = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store), DELAY = 300;
let refuseNext = false;
const call = async (name, data, auth) => { if (name === "hitBase") { await new Promise((r) => setTimeout(r, DELAY)); if (refuseNext) { refuseNext = false; return JSON.stringify({ error: { code: "failed-precondition", message: "hit_cooldown" } }); } } return call0(name, data, auth); };
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
  await P.fill("#ksE", "g325@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Fire"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  const ids = await P.evaluate(() => { try { setScreen("world"); } catch (e) {} const h = mapTileById(game.state.map, game.state.homeTileId), out = [];
    for (let r = 6; r < 40 && out.length < 2; r++) for (let dx = -r; dx <= r && out.length < 2; dx++) { const t = mapTileAt(game.state.map, h.x + dx, h.y + r); if (t && t.type === "empty" && !occupiedTileIds[t.id] && !isTileTooCloseToCity(t.id) && !out.some((o) => Math.abs(+o.split(",")[0] - t.x) < 6 && Math.abs(+o.split(",")[1] - t.y) < 6)) out.push(t.id); }
    return out; });
  const key = (id) => Object.keys(store).find((k) => /cities\//.test(k)) ? Object.keys(store).find((k) => /cities\//.test(k)).replace(/cities\/.*$/, "cities/") + id.replace(",", "_") : "envs/test/cities/" + id.replace(",", "_");
  ids.forEach((id) => { store[key(id)] = { owner: "bot_fire" + id.replace(",", "_"), claimedAt: 1, sk: "castle" }; });
  ids.forEach((id) => { const cid = id.replace(",", "_"), [x, y] = cid.split("_").map(Number), pk = key(id).replace(/cities\/.*$/, "patches/") + Math.floor(x / 50) + "_" + Math.floor(y / 50);
    store[pk] = { b: Object.assign({}, (store[pk] && store[pk].b) || {}, { [cid]: { o: "bot_fire" + cid, sk: "castle" } }), t: Date.now() }; }); /* the map reads bases by patch */
  await P.evaluate(() => window.__fbNotify()); await P.waitForTimeout(1200);
  const r = await P.evaluate((id) => { const m = { id: 9999, tileId: id, action: "attack", army: { infantry_t1: 50 }, heroKeys: [], arriveAt: vnow(), status: "resolving" };
    window.__m = m; window.__p = cityAttackOutcome(game, m, { undefended: true, army: {} }, occupiedTileIds[id], null);
    return new Promise((res) => setTimeout(() => res({ actIn: Math.round(m.actionEnd - vnow()), burning: isBaseBurning(id), held: baseFireHeld(id) }), 1200)); }, ids[0]);
  await P.waitForTimeout(5600);
  const r2 = await P.evaluate((id) => ({ burning: isBaseBurning(id), held: baseFireHeld(id) }), ids[0]);
  /* a base that was already burning keeps showing its fire */
  const r3 = await P.evaluate((id) => { holdBaseFire(id, 3000); return { held: baseFireHeld(id) }; }, ids[0]);
  console.log(JSON.stringify({ ids, r, r2, r3, errs }));
  await b.close();
  if (!process.env.NOASSERT) {
    assert.deepStrictEqual(errs, []); assert(r.actIn > 3000, "the ship is still firing");
    assert.strictEqual(r.burning, true, "the hit is already applied (server told)"); assert.strictEqual(r.held, true, "but the fire is held back during the volleys");
    assert.strictEqual(r2.burning, true); assert.strictEqual(r2.held, false, "fire shows once the volleys are done");
    assert.strictEqual(r3.held, false, "an already burning base is never hidden");
    console.log("g325 ok");
  }
})().catch((e) => { console.error(e); process.exit(1); });
