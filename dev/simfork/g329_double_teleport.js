/* v1213 (Harley's screenshot: "Teleport failed (That isn't your city.)"): a second teleport started while the server was still moving the city
   for the first one sent the server a "from" spot it didn't know about yet. Server slowed to DELAY ms here.
   Expect: the second tap waits for the first move to finish, both moves land, the server and the game agree on where the city is.
   Run: node dev/simfork/g329_double_teleport.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call0 = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store), DELAY = 1500;
let nReloc = 0, refuseFirst = false; /* the FIRST move is slow to reach the server (cold start / bad signal), later ones are quick - so a second move can land first, like on a phone */
const call = async (name, data, auth) => { if (name === "relocateCity") { const n = nReloc++; if (process.env.DBG) console.log("reloc", n, JSON.stringify(data).slice(0, 120)); await new Promise((r) => setTimeout(r, n === 0 || n === 2 ? DELAY : 50)); if (refuseFirst && n === 2) return JSON.stringify({ error: { code: "failed-precondition", message: "taken" } }); } return call0(name, data, auth); };
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
  await P.fill("#ksE", "g329@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Hop"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  const ids = await P.evaluate(() => { try { setScreen("world"); } catch (e) {} const h = mapTileById(game.state.map, game.state.homeTileId), out = [];
    for (let r = 8; r < 40 && out.length < 2; r++) for (let dx = -r; dx <= r && out.length < 2; dx++) { const t = mapTileAt(game.state.map, h.x + dx, h.y + r); if (t && t.type === "empty" && !isTileOccupied(t.id) && !isTileTooCloseToCity(t.id) && !out.some((o) => Math.abs(mapTileById(game.state.map, o).x - t.x) < 5)) out.push(t.id); }
    window.__toasts = []; const mt = window.miniToast; window.miniToast = function (t) { window.__toasts.push(t); return mt.apply(this, arguments); };
    return { home: game.state.homeTileId, to: out }; });
  const tap = (id) => P.evaluate((id) => { selectedTile = id; renderTileInfo(); const btn = document.getElementById("teleportBtn"); if (!btn || btn.disabled) return "nobtn"; btn.click(); return "ok"; }, id);
  const t1 = await tap(ids.to[0]); await P.waitForTimeout(300); const t2 = await tap(ids.to[1]);
  await P.waitForTimeout(DELAY * 2 + 1500);
  const r = await P.evaluate(() => ({ home: game.state.homeTileId, toasts: window.__toasts }));
  /* part 2: the first of two quick moves is refused -> the second is dropped and the city goes back to where the server has it */
  const ids2 = await P.evaluate(() => { const h = mapTileById(game.state.map, game.state.homeTileId), out = [];
    for (let r = 8; r < 40 && out.length < 2; r++) for (let dx = -r; dx <= r && out.length < 2; dx++) { const t = mapTileAt(game.state.map, h.x + dx, h.y - r); if (t && t.type === "empty" && !isTileOccupied(t.id) && !isTileTooCloseToCity(t.id) && !out.some((o) => Math.abs(mapTileById(game.state.map, o).x - t.x) < 5)) out.push(t.id); }
    window.__toasts = []; return { home: game.state.homeTileId, to: out }; });
  refuseFirst = true; nReloc = 2;
  await tap(ids2.to[0]); await P.waitForTimeout(300); await tap(ids2.to[1]); await P.waitForTimeout(DELAY + 1500);
  const r2 = await P.evaluate(() => ({ home: game.state.homeTileId, toasts: window.__toasts, mine: Object.keys(occupiedTileIds).filter((k) => occupiedTileIds[k] === PLAYER_ID) }));
  const server = Object.keys(store).filter((k) => /cities\//.test(k) && store[k] && store[k].owner).map((k) => k.split("/").pop().replace("_", ","));
  console.log(JSON.stringify({ ids, t1, t2, r, ids2, r2, server, errs }));
  await b.close();
  assert.deepStrictEqual(errs, []);
  assert(!r.toasts.some((t) => /failed/i.test(t)), "no failed teleport");
  assert.strictEqual(r.home, ids.to[1], "ends up at the second spot");
  assert.strictEqual(r2.home, ids.to[1], "refused: back to the spot the server has"); assert.deepStrictEqual(r2.mine, [ids.to[1]], "only one city of mine on the map");
  assert.strictEqual(r2.toasts.filter((t) => /failed/i.test(t)).length, 1, "one failure message");
  assert.deepStrictEqual(server.filter((k) => [ids.to[1], ids.to[0], ids.home, ids2.to[0], ids2.to[1]].includes(k)), [ids.to[1]], "the server has the city at one spot only");
  console.log("g329 ok");
})().catch((e) => { console.error(e); process.exit(1); });
