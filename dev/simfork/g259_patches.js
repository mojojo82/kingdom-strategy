/* v1081: phase 2 gate - bases by patch in Vanaheim with 1,000 bots. While panning around, every base in the loaded patches matches the server exactly (none missing, none extra, no owner twice);
   another player's teleport and an attack show up through the patches; Atlantis still uses the whole list. Run: node dev/simfork/g259_patches.js */
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
  const { makeCrowd } = require(path.join(ROOT, "dev/load/crowd.js")), C = require(path.join(ROOT, "functions/core.js"));
  const ADMIN = require(path.join(ROOT, "functions/admins.json"))[0], K = "envs/test/servers/server1/";
  const adminCall = async (n, d) => JSON.parse(await call(n, JSON.stringify(Object.assign({ env: "test", srv: "server1" }, d || {})), JSON.stringify({ uid: ADMIN, token: { firebase: { sign_in_provider: "google.com" } } })));
  const V = await page("?k=vanaheim"); await signUp(V, "pv@test.dev", "Pv"); const v = await info(V);
  assert.strictEqual(v.sid, "server1"); assert.ok(await V.evaluate(() => patchMode() && patchSyncStarted), "Vanaheim uses patches");
  /* 1,000 labelled bots, then the admin rebuild writes their patch lists */
  const tiles = await V.evaluate((count) => { const n = mapSizeTiles(), out = [], held = []; let tries = 0;
    while (out.length < count && tries++ < 400000) { const t = mapTileAt(game.state.map, Math.floor(Math.random() * n), Math.floor(Math.random() * n));
      if (t && t.type === "empty" && !occupiedTileIds[t.id] && !isTileTooCloseToCity(t.id)) { occupiedTileIds[t.id] = "?"; held.push(t.id); out.push({ id: t.id }); } }
    /* and 30 right around the player, so the screen isn't empty */
    const h = mapTileById(game.state.map, game.state.homeTileId); for (let r = 4; r < 30 && out.length < count + 30; r++) for (let d = -r; d <= r; d += 4) { const t = mapTileAt(game.state.map, h.x + d, h.y + r); if (t && t.type === "empty" && !occupiedTileIds[t.id] && !isTileTooCloseToCity(t.id)) { occupiedTileIds[t.id] = "?"; held.push(t.id); out.push({ id: t.id }); } }
    held.forEach((id) => { delete occupiedTileIds[id]; }); return out; }, 1000);
  const crowd = makeCrowd(tiles, { prefix: K, marches: 0 }); Object.assign(store, crowd);
  const rb = await adminCall("adminRebuildPatches"); console.log("rebuild", JSON.stringify(rb.data || rb));
  assert.ok(rb.data && rb.data.bases === tiles.length + 1);
  await V.evaluate(() => { Object.keys(patchSubs).forEach((id) => { try { patchSubs[id].unsub(); } catch (e) {} delete patchSubs[id]; }); syncPatchSubs(); }); await V.waitForTimeout(1500);
  /* server truth for the patches the game has loaded vs what the game knows */
  async function compare(label) {
    const g = await V.evaluate(() => ({ loaded: Object.keys(patchSubs).filter((id) => patchSubs[id].loaded), occ: Object.assign({}, occupiedTileIds), view: Object.keys(patchViewWanted).length }));
    const inP = (tid, pids) => { const [x, y] = tid.split(",").map(Number); return pids.includes(Math.floor(x / 50) + "_" + Math.floor(y / 50)); };
    const truth = {}; Object.keys(store).forEach((k) => { if (k.startsWith(K + "cities/")) { const tid = k.slice((K + "cities/").length).replace("_", ","); if (inP(tid, g.loaded)) truth[tid] = store[k].owner; } });
    const mine = {}; Object.keys(g.occ).forEach((tid) => { if (inP(tid, g.loaded) && g.occ[tid] !== "?") mine[tid] = g.occ[tid]; });
    const missing = Object.keys(truth).filter((t) => mine[t] !== truth[t]), extra = Object.keys(mine).filter((t) => !truth[t]);
    const owners = {}; Object.values(g.occ).forEach((o) => { if (o !== "?") owners[o] = (owners[o] || 0) + 1; }); const twice = Object.keys(owners).filter((o) => owners[o] > 1);
    const r = { label, loaded: g.loaded.length, view: g.view, bases: Object.keys(truth).length, missing: missing.length, extra: extra.length, twice: twice.length };
    console.log(JSON.stringify(r)); assert.ok(r.bases > 0 && !r.missing && !r.extra && !r.twice, "patches match the server: " + JSON.stringify(r)); assert.ok(r.loaded <= 72); /* v1084: cap PATCH_SUB_MAX */ return r;
  }
  const res = [await compare("home")];
  /* pan to 6 random spots */
  for (let i = 0; i < 6; i++) {
    await V.evaluate((i) => { const vp = document.getElementById("mapviewport"), n = mapSizeTiles(), t = { x: 60 + ((i * 397) % (n - 120)), y: 60 + ((i * 613) % (n - 120)) }, c = tileCenterPx(t); vp.scrollLeft = c.x - vp.clientWidth / 2; vp.scrollTop = c.y - vp.clientHeight / 2; renderVisibleTiles(); }, i);
    await V.waitForTimeout(900); res.push(await compare("pan" + i));
  }
  /* back home; another Vanaheim player teleports next to us and attacks a bot on our screen */
  await V.evaluate(() => { const vp = document.getElementById("mapviewport"), c = tileCenterPx(mapTileById(game.state.map, game.state.homeTileId)); vp.scrollLeft = c.x - vp.clientWidth / 2; vp.scrollTop = c.y - vp.clientHeight / 2; renderVisibleTiles(); });
  await V.waitForTimeout(1500);
  const W = await page("?k=vanaheim"); await signUp(W, "pw@test.dev", "Pw"); const w = await info(W);
  const near = await V.evaluate(() => { const h = mapTileById(game.state.map, game.state.homeTileId); for (let r = 5; r < 25; r++) for (let d = -r; d <= r; d++) { const t = mapTileAt(game.state.map, h.x - r, h.y + d); if (t && t.type === "empty" && !occupiedTileIds[t.id] && !isTileTooCloseToCity(t.id)) return t.id; } return null; });
  const tp = await W.evaluate((to) => teleportTo(to), near);
  const botNear = await V.evaluate(() => Object.keys(occupiedTileIds).find((id) => /^bot_load_/.test(occupiedTileIds[id]) && mapTileEls[id]));
  const hit = await W.evaluate((id) => KS_BACKEND.call("hitBase", { tileId: id }).then((r) => r.after, (e) => "err " + e.message), botNear);
  await V.evaluate(() => window.__fbNotify()); await V.waitForTimeout(1500); /* the fake server only tells pages about changes made from a page; server-side writes need a nudge */
  const seen = await V.evaluate(([to, wid, old, bot]) => ({ newBase: occupiedTileIds[to] === wid, oldGone: !occupiedTileIds[old], hp: cityHp[bot] && cityHp[bot].hp, drawn: !!(mapTileEls[to] && mapTileEls[to].classList.contains("othercity")) }), [near, w.uid, w.home, botNear]);
  console.log("teleport+hit", JSON.stringify({ tp, hit, seen }));
  res.push(await compare("after teleport"));
  assert.ok(tp && tp.ok && seen.newBase && seen.oldGone && seen.drawn, "teleport seen through the patches");
  assert.strictEqual(seen.hp, hit, "attack seen through the patches");
  /* Atlantis still uses the whole list */
  const A = await page(""); await signUp(A, "pa@test.dev", "Pa");
  assert.strictEqual(await A.evaluate(() => patchMode()), false);
  assert.deepStrictEqual(errs, []);
  console.log("g259 OK"); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
