/* v1079: server actions happen in the right kingdom. A Vanaheim player's attack hits the Vanaheim base and teleport moves within Vanaheim (Atlantis untouched);
   an Atlantis player can't act on a Vanaheim base, even by forging the kingdom (borders closed). Run: node dev/simfork/g258_kingdom_actions.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  async function page(query) {
    const ctx = await b.newContext({ viewport: { width: 430, height: 932 } });
    await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
    await ctx.exposeFunction("__fbcall", call);
    await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
    await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
    await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
    await P.goto("https://mojojo82.github.io/kingdom-strategy/test/" + (query || "")); await P.waitForSelector("#ksAuth .box");
    return P;
  }
  async function signUp(P, email, name) {
    await P.fill("#ksE", email); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
    await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", name); await P.click("#ksGo"); await P.waitForTimeout(6000);
  }
  async function info(P) {
    return P.evaluate(() => { try { setScreen("world"); } catch (e) {} mapWorldSizedForTiles = null; try { render(); } catch (e) {}
      return { sid: game.state.serverId, home: game.state.homeTileId, uid: PLAYER_ID }; });
  }
  const V = await page("?k=vanaheim"); await signUp(V, "kv@test.dev", "Kv"); const v = await info(V);
  assert.strictEqual(v.sid, "server1");
  const [vx, vy] = v.home.split(",").map(Number);
  /* a bot base in Vanaheim near the player, and a free tile to teleport to */
  const spots = await V.evaluate(() => { const h = mapTileById(game.state.map, game.state.homeTileId), out = [];
    for (let r = 6; r < 40 && out.length < 2; r++) for (let dx = -r; dx <= r && out.length < 2; dx++) { const t = mapTileAt(game.state.map, h.x + dx, h.y + r); if (t && t.type === "empty" && !occupiedTileIds[t.id] && !isTileTooCloseToCity(t.id) && !out.some((o) => Math.abs(+o.split(",")[0] - t.x) < 6)) out.push(t.id); }
    return out; });
  const botId = spots[0], botKey = "envs/test/servers/server1/cities/" + botId.replace(",", "_");
  store[botKey] = { owner: "bot_k1", claimedAt: 1, sk: "castle" }; await V.evaluate(() => window.__fbNotify()); await V.waitForTimeout(500);
  const hit = await V.evaluate((id) => KS_BACKEND.call("hitBase", { tileId: id }).then((r) => ({ ok: true, after: r.after }), (e) => ({ err: e.message })), botId);
  const hpV = store[botKey].hp, inAtlantis = Object.keys(store).some((k) => k === "envs/test/cities/" + botId.replace(",", "_"));
  /* teleport within Vanaheim keeps the skin and stays in Vanaheim */
  const tp = await V.evaluate((to) => teleportTo(to), spots[1]);
  const newKey = "envs/test/servers/server1/cities/" + spots[1].replace(",", "_"), oldKey = "envs/test/servers/server1/cities/" + v.home.replace(",", "_");
  const moved = { tp, newDoc: store[newKey], oldGone: !store[oldKey], atlantisNew: !!store["envs/test/cities/" + spots[1].replace(",", "_")] };
  /* an Atlantis player */
  const A = await page(""); await signUp(A, "ka@test.dev", "Ka"); const a = await info(A);
  const auth = JSON.stringify({ uid: a.uid, token: { firebase: { sign_in_provider: "password" } } });
  const plain = JSON.parse(await call("hitBase", JSON.stringify({ env: "test", srv: "server0", home: a.home, tileId: botId }), auth));
  const forged = JSON.parse(await call("hitBase", JSON.stringify({ env: "test", srv: "server1", home: a.home, tileId: botId }), auth));
  const bad = JSON.parse(await call("hitBase", JSON.stringify({ env: "test", srv: "../x", home: a.home, tileId: botId }), auth));
  const o = { hit, hpV, inAtlantis, moved, plain: plain.error && plain.error.message, forged: forged.error && forged.error.message, bad: bad.error && bad.error.message, hpAfter: store[botKey].hp, errs };
  console.log(JSON.stringify(o));
  assert.ok(hit.ok && typeof hpV === "number" && hpV < 10000 && !inAtlantis, "Vanaheim attack hits the Vanaheim base");
  assert.ok(moved.tp && moved.tp.ok && moved.newDoc && moved.newDoc.owner === v.uid && moved.newDoc.sk && moved.oldGone && !moved.atlantisNew, "teleport stays in Vanaheim and keeps the skin");
  assert.strictEqual(o.plain, "no_city"); assert.strictEqual(o.forged, "other_kingdom"); assert.strictEqual(o.bad, "bad_kingdom");
  assert.strictEqual(o.hpAfter, hpV, "Atlantis player couldn't touch it");
  assert.deepStrictEqual(errs, []);
  console.log("g258 OK"); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
