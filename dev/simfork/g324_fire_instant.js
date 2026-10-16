/* v1204 (Harley bug): after beating a base, its fire must show straight away, not only when the server answers the hit (a cold Cloud
   Function can take seconds). The server is slowed down here (DELAY ms); the fire must be up before it answers, stay after, and go away
   again if the server refuses the hit. Run: node dev/simfork/g324_fire_instant.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call0 = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store), DELAY = 2500;
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
  await P.fill("#ksE", "g324@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Fire"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  const ids = await P.evaluate(() => { try { setScreen("world"); } catch (e) {} const h = mapTileById(game.state.map, game.state.homeTileId), out = [];
    for (let r = 6; r < 40 && out.length < 2; r++) for (let dx = -r; dx <= r && out.length < 2; dx++) { const t = mapTileAt(game.state.map, h.x + dx, h.y + r); if (t && t.type === "empty" && !occupiedTileIds[t.id] && !isTileTooCloseToCity(t.id) && !out.some((o) => Math.abs(+o.split(",")[0] - t.x) < 6 && Math.abs(+o.split(",")[1] - t.y) < 6)) out.push(t.id); }
    return out; });
  const key = (id) => Object.keys(store).find((k) => /cities\//.test(k)) ? Object.keys(store).find((k) => /cities\//.test(k)).replace(/cities\/.*$/, "cities/") + id.replace(",", "_") : "envs/test/cities/" + id.replace(",", "_");
  ids.forEach((id) => { store[key(id)] = { owner: "bot_fire" + id.replace(",", "_"), claimedAt: 1, sk: "castle" }; });
  ids.forEach((id) => { const cid = id.replace(",", "_"), [x, y] = cid.split("_").map(Number), pk = key(id).replace(/cities\/.*$/, "patches/") + Math.floor(x / 50) + "_" + Math.floor(y / 50);
    store[pk] = { b: Object.assign({}, (store[pk] && store[pk].b) || {}, { [cid]: { o: "bot_fire" + cid, sk: "castle" } }), t: Date.now() }; }); /* the map reads bases by patch */
  await P.evaluate(() => window.__fbNotify()); await P.waitForTimeout(1200);
  /* 1: a hit while the server is slow */
  const r1 = await P.evaluate((id) => { const before = isBaseBurning(id); window.__hp = hitBase(id); return new Promise((res) => setTimeout(() => res({ before, at300: isBaseBurning(id) }), 300)); }, ids[0]);
  await P.waitForTimeout(DELAY + 800);
  const r1b = await P.evaluate((id) => window.__hp.then((h) => ({ after: isBaseBurning(id), hp: h })), ids[0]);
  /* 2: the server refuses (cooldown) -> the early fire goes away again */
  refuseNext = true;
  const r2 = await P.evaluate((id) => { window.__hp2 = hitBase(id); return new Promise((res) => setTimeout(() => res({ at300: isBaseBurning(id) }), 300)); }, ids[1]);
  await P.waitForTimeout(DELAY + 800);
  const r2b = await P.evaluate((id) => window.__hp2.then(() => ({ after: isBaseBurning(id) })), ids[1]);
  console.log(JSON.stringify({ ids, r1, r1b, r2, r2b, errs }));
  await b.close();
  if (!process.env.NOASSERT) {
    assert.deepStrictEqual(errs, []); assert.strictEqual(r1.before, false);
    assert.strictEqual(r1.at300, true, "fire shows straight away, before the server answers"); assert.strictEqual(r1b.after, true, "and stays once it has");
    assert.strictEqual(r2.at300, true); assert.strictEqual(r2b.after, false, "a refused hit takes the early fire away again");
    console.log("g324 ok");
  }
})().catch((e) => { console.error(e); process.exit(1); });
