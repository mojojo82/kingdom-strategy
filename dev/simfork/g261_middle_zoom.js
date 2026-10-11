/* v1084: phase 4b - Middle zoom in Vanaheim (1,000 bots). From the near zoom out to tiles ~2.4 px every patch on screen is loaded (none missing), base markers show
   with my alliance in its own colour; march listeners only at the normal zooms. Run: node dev/simfork/g261_middle_zoom.js */
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
  const me = await V.evaluate(() => PLAYER_ID); store["envs/test/servers/server1/allyindex/" + me] = { aid: "dz", tag: "DZ", rank: 5 };
  Object.keys(store).filter((k) => /cities\//.test(k) && /bot_load_10\d\d$/.test(store[k].owner)).slice(0, 12).forEach((k) => { store["envs/test/servers/server1/allyindex/" + store[k].owner] = { aid: "dz", tag: "DZ", rank: 1 }; });
  await V.evaluate(() => window.__fbNotify()); await V.waitForTimeout(1500);
  const res = {};
  for (const [name, tp] of [["lod1b", 7.2], ["mid4", 4], ["mid3", 3], ["mid2", 2.4], ["near", 30]]) {
    const r = await V.evaluate((tp) => { setScreen("world"); setMapZoom(tp ? tp / 30 : mapZoomMin()); if (tp) centerMapOnHome(); renderVisibleTiles(); const vw = Object.keys(patchViewWanted), miss = vw.filter((id) => !patchSubs[id]); return { marchL: Object.keys(marchSrcSubs).length, miss: miss.length, tp: +tilePxZ().toFixed(2), lod: mapLod(), subs: Object.keys(patchSubs).length, view: Object.keys(patchViewWanted).length, ally: document.querySelectorAll(".tile.lod-ally").length, city: document.querySelectorAll(".tile.lod-city").length, nomid: document.getElementById("mapworld").classList.contains("nomid"), names: [...document.querySelectorAll("#mapBorder .kd-label")].map((e) => e.style.opacity).join(",") }; }, tp);
    await V.waitForTimeout(1500); await V.evaluate(() => renderVisibleTiles()); await V.waitForTimeout(300); console.log(name, JSON.stringify(r)); res[name] = r;
  }
  for (const k of Object.keys(res)) assert.strictEqual(res[k].miss, 0, k + ": every patch on screen loaded");
  assert.ok(res.mid4.ally === 12 && res.mid4.city > res.mid4.ally && !res.mid4.nomid, "middle zoom markers, my alliance coloured");
  assert.ok(!res.mid2.nomid && res.mid2.city > 0, "markers still on at ~2.4 px tiles");
  assert.ok(res.mid4.marchL <= 6 && res.near.marchL <= 30, "march listeners only at the normal zooms");
  assert.deepStrictEqual(errs, []); console.log("g261 OK"); await b.close();
})();
