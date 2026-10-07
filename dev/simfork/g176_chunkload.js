/* v919: the World map only loads chunks near you / in view, and the 5-minute fade sweep no longer re-reads every chunk.
   A kingdom with 300 changed chunks spread over the map + 9 around the player's city. Counts chunk documents read; checks data near the city
   and in view still arrive. Run: node dev/simfork/g176_chunkload.js (GAMEFILE=..., NOASSERT=1) */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 } });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  /* a busy kingdom: 300 chunks changed somewhere on the map (recent, not fade-eligible) */
  const now = Date.now();
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "g176@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Maps"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  const pfx = await P.evaluate(() => "envs/test/" + serverPrefix());
  for (let i = 0; i < 300; i++) { const cx = (i * 7) % 60, cy = Math.floor(i * 7 / 60) % 60; store[pfx + "chunks/" + cx + "_" + cy] = { tiles: { ["far" + i]: { amountLeft: 1, updatedAt: now } } }; }
  /* a NEW session in that busy kingdom */
  await P.reload(); await P.waitForTimeout(7000);
  const r = await P.evaluate(async () => {
    const out = {};
    const home = mapTileById(game.state.map, game.state.homeTileId);
    out.home = home && [home.x, home.y];
    /* a resource tile right next to home: change it in the db, it must reach this session */
    let res = null; for (let dy = -10; dy <= 10 && !res; dy++) for (let dx = -10; dx <= 10 && !res; dx++) { const t = mapTileAt(game.state.map, home.x + dx, home.y + dy); if (t && t.type === "resource") res = t; }
    out.resFound = !!res;
    if (res) { const cid = Math.floor(res.x / 20) + "_" + Math.floor(res.y / 20), pfx = serverPrefix(); await cloudDb.doc(pfx + "chunks/" + cid).set({ tiles: { [res.id]: { amountLeft: 4321, updatedAt: Date.now() } } }); }
    await new Promise((r) => setTimeout(r, 1500));
    out.nearDataArrived = res ? res.amountLeft === 4321 : null;
    /* reads: chunk docs held by live listeners (each = 1 read at start), and docs read by one fade sweep */
    out.listened = typeof chunkSubs !== "undefined" ? Object.keys(chunkSubs).length : "all";
    let swept = 0; const oc = cloudDb.collection.bind(cloudDb);
    cloudDb.collection = function (p) { const q = oc(p); if (/chunks$/.test(p)) { const og = q.get.bind(q); q.get = function () { return og().then((s) => { swept += s.docs.length; return s; }); }; } return q; };
    await runWorldFadeSweep(); out.sweepReads = swept; cloudDb.collection = oc;
    /* open the World map and scroll far away: the chunks in view load (only while the map is open) */
    setScreen("world"); await new Promise((r) => setTimeout(r, 1500));
    const vp = document.getElementById("mapviewport"), before = Object.keys(chunkSubs || {});
    const far = mapTileAt(game.state.map, (home.x + 400) % 1100 + 40, (home.y + 300) % 1100 + 40); out.farChunk = Math.floor(far.x / 20) + "_" + Math.floor(far.y / 20);
    centerMapOnTile(far.id); try { renderVisibleTiles(); } catch (e) {}
    await new Promise((r) => setTimeout(r, 1500));
    const after = Object.keys(chunkSubs || {}), added = after.filter((k) => before.indexOf(k) < 0);
    out.viewAdded = added.length; out.farLoaded = after.indexOf(out.farChunk) >= 0; out.viewList = Object.keys(worldViewChunks || {}).length; out.lod = mapLod();
    return out;
  });
  const totalChunks = Object.keys(store).filter((k) => /^envs\/test\/(servers\/[^/]+\/)?chunks\//.test(k)).length;
  const listened = r.listened === "all" ? totalChunks : r.listened;
  console.log("chunks changed in the kingdom:", totalChunks, "| chunk docs this session listens to:", listened, "| docs re-read by each 5-min sweep:", r.sweepReads);
  console.log("World map open, scrolled far: chunk listeners added for the view:", r.viewAdded, "(chunks in view:", r.viewList + ", zoom level", r.lod + ") | the far chunk I'm looking at is loaded:", r.farLoaded);
  console.log("change next to my city reached me:", r.nearDataArrived, "| errs", errs.slice(0, 3));
  if (!process.env.NOASSERT) { assert.ok(listened <= 20, "nearby only"); assert.strictEqual(r.sweepReads, 0, "sweep reads nothing new"); assert.strictEqual(r.nearDataArrived, true, "nearby data still arrives"); assert.ok(r.farLoaded, "the chunk in view loads"); assert.deepStrictEqual(errs, []); console.log("ALL OK"); }
  await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
