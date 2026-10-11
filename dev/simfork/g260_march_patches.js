/* v1082: phase 3 gate - marches by patch in Vanaheim. Wherever you are looking: an attack sent at you from far away is seen (even sent at a base the attacker had not loaded),
   your own and your alliance's marches stay live, a march crossing your screen is seen, one far away is not loaded. Run: node dev/simfork/g260_march_patches.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const { routePatches } = require(path.join(__dirname, "../load/crowd.js"));
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
  const info = (P) => P.evaluate(() => ({ sid: game.state.serverId, home: game.state.homeTileId, uid: PLAYER_ID }));
  const nudge = () => Promise.all([V, W, X].map((P) => P.evaluate(() => window.__fbNotify()))).then(() => V.waitForTimeout(1200));
  const lookAt = (P, x, y) => P.evaluate(([x, y]) => { setScreen("world"); const vp = document.getElementById("mapviewport"), c = tileCenterPx({ x, y }); vp.scrollLeft = c.x - vp.clientWidth / 2; vp.scrollTop = c.y - vp.clientHeight / 2; renderVisibleTiles(); }, [x, y]);
  const freeTileNear = (P, x, y) => P.evaluate(([x, y]) => { for (let r = 0; r < 60; r++) for (let d = -r; d <= r; d++) for (const [a, b] of [[x + d, y - r], [x + d, y + r], [x - r, y + d], [x + r, y + d]]) { const t = mapTileAt(game.state.map, a, b); if (t && t.type === "empty" && !occupiedTileIds[t.id] && !isTileTooCloseToCity(t.id)) return t.id; } return null; }, [x, y]);
  const send = (P, to, action) => P.evaluate(([to, action]) => { game.state.troops.infantry = 5000; const r = game.sendMarch({ infantry: 10 }, to, action, []); syncMyMarchRecords(); return r.ok ? marchRecordKey(PLAYER_ID, r.march.id) : r.reason; }, [to, action]);
  const has = (P, key) => P.evaluate((k) => !!worldMarches[k], key);
  var V = await page("?k=vanaheim"); await signUp(V, "mv@test.dev", "Mv");
  var W = await page("?k=vanaheim"); await signUp(W, "mw@test.dev", "Mw");
  var X = await page("?k=vanaheim"); await signUp(X, "mx@test.dev", "Mx");
  let v = await info(V), w = await info(W), x = await info(X);
  assert.ok(v.sid === "server1" && w.sid === "server1" && x.sid === "server1");
  assert.ok(await V.evaluate(() => patchMode()), "patch mode");
  /* put W far from V (600 tiles away on the diagonal), and V looking at a third spot */
  const [vx, vy] = v.home.split(",").map(Number), fx = vx < 600 ? vx + 500 : vx - 500, fy = vy < 600 ? vy + 500 : vy - 500;
  await lookAt(W, fx, fy); await W.waitForTimeout(800);
  const wTo = await freeTileNear(W, fx, fy); const tp = await W.evaluate((t) => teleportTo(t), wTo); w = await info(W);
  assert.ok(tp && tp.ok, "W teleported far away " + JSON.stringify(tp));
  const lx = vx < 600 ? vx + 250 : vx - 250, ly = vy; await lookAt(V, lx, ly); await nudge();
  /* 1. W attacks V's base from 700 tiles away - W never loaded V's patch */
  const wLoadedV = await W.evaluate((h) => { const xy = tileXY(h); return !!(patchSubs[patchIdOfTile(xy[0], xy[1])] || {}).loaded; }, v.home);
  const atk = await send(W, v.home, "attack"); await W.waitForTimeout(800); await nudge();
  const atkRec = store["envs/test/servers/server1/marches/" + atk];
  const r1 = { atk, wLoadedV, targetOwner: atkRec && atkRec.targetOwner, vSees: await has(V, atk), patches: atkRec && atkRec.patches.length };
  console.log("attack at me", JSON.stringify(r1));
  assert.ok(!wLoadedV && atkRec && atkRec.targetOwner === v.uid && r1.vSees, "an attack at me from far away is seen while I look elsewhere");
  /* 2. a bot march crossing what V is looking at is seen; one far away isn't loaded */
  const viewP = await V.evaluate(() => Object.keys(patchViewWanted).sort());
  const K = "envs/test/servers/server1/marches/", now = Date.now(), rec = (from, to, extra) => Object.assign({ skin: "voidspire", ownerId: "bot_mx", ownerName: "Bot", mid: "m", tileId: to, homeTileId: from, action: "gather", travelSec: 600, arriveAt: now + 300000, actionEnd: now + 305000, returnAt: now + 905000, resolved: true, patches: routePatches(from, to), targetOwner: null, aid: null }, extra || {});
  store[K + "bot_mx_cross"] = rec((lx - 120) + "," + ly, (lx + 120) + "," + ly);
  const farX = lx < 600 ? 1100 : 60, farY = ly < 600 ? 1100 : 60; store[K + "bot_mx_far"] = rec(farX + "," + farY, (farX + 20) + "," + farY);
  await nudge();
  const r2 = { cross: await has(V, "bot_mx_cross"), far: await has(V, "bot_mx_far"), crossesView: store[K + "bot_mx_cross"].patches.some((p) => viewP.includes(p)), farInView: store[K + "bot_mx_far"].patches.some((p) => viewP.includes(p)) };
  console.log("passing", JSON.stringify(r2));
  assert.ok(r2.crossesView && r2.cross, "a march crossing my screen is seen"); assert.ok(!r2.farInView && !r2.far, "a march far away is not loaded");
  /* 3. my own march stays live when I look away */
  const myTo = await freeTileNear(V, lx + 5, ly + 5); const mine = await send(V, myTo, "gather"); await nudge();
  await lookAt(V, farX, farY); await V.waitForTimeout(500); await V.evaluate(() => { Object.keys(patchSubs).forEach((id) => { patchSubs[id].wantedAt = 0; }); syncPatchSubs(); }); await nudge();
  const r3 = { mine: await has(V, mine), crossAfterLeaving: await has(V, "bot_mx_cross") };
  console.log("own", JSON.stringify(r3));
  assert.ok(r3.mine, "my own march stays live"); assert.ok(!r3.crossAfterLeaving, "a passing march is dropped once I've left that area");
  /* 4. alliance: V and X in one alliance; X's march far away is seen by V */
  store["envs/test/servers/server1/allyindex/" + v.uid] = { aid: "gx", tag: "GX", rank: 5 }; store["envs/test/servers/server1/allyindex/" + x.uid] = { aid: "gx", tag: "GX", rank: 1 };
  await nudge(); await V.waitForTimeout(3500); /* the alliance listener is (re)checked every 3 s */
  const xTo = await X.evaluate(() => { const h = mapTileById(game.state.map, game.state.homeTileId); for (let r = 4; r < 40; r++) { const t = mapTileAt(game.state.map, h.x + r, h.y); if (t && t.type === "empty" && !occupiedTileIds[t.id]) return t.id; } });
  const ally = await send(X, xTo, "gather"); await X.waitForTimeout(800); await nudge();
  const r4 = { aid: store[K + ally] && store[K + ally].aid, vSees: await has(V, ally), listeners: await V.evaluate(() => Object.keys(marchSrcSubs).length) };
  console.log("alliance", JSON.stringify(r4));
  assert.ok(r4.aid === "gx" && r4.vSees, "my alliance's march is seen"); assert.ok(r4.listeners <= 33);
  assert.deepStrictEqual(errs, []);
  console.log("g260 OK"); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
