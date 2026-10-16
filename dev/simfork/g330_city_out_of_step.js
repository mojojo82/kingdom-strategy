/* v1214 (Harley: still "Teleport failed (That isn't your city.)" on v1213): the game's idea of where my city is can be out of step with the server.
   Expect: a teleport still works (the game asks the server where the city is and moves it from there), and the load-time check puts the city
   back on the server's spot. Run: node dev/simfork/g330_city_out_of_step.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call0 = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store), DELAY = 1500;
 /* the FIRST move is slow to reach the server (cold start / bad signal), later ones are quick - so a second move can land first, like on a phone */
const call = async (name, data, auth) => { if (name === "relocateCity") await new Promise((r) => setTimeout(r, 300)); return call0(name, data, auth); };
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
  await P.fill("#ksE", "g330@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Hop"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  const ids = await P.evaluate(() => { try { setScreen("world"); } catch (e) {} const h = mapTileById(game.state.map, game.state.homeTileId), out = [];
    for (let r = 8; r < 40 && out.length < 2; r++) for (let dx = -r; dx <= r && out.length < 2; dx++) { const t = mapTileAt(game.state.map, h.x + dx, h.y + r); if (t && t.type === "empty" && !isTileOccupied(t.id) && !isTileTooCloseToCity(t.id) && !out.some((o) => Math.abs(mapTileById(game.state.map, o).x - t.x) < 5)) out.push(t.id); }
    window.__toasts = []; const mt = window.miniToast; window.miniToast = function (t) { window.__toasts.push(t); return mt.apply(this, arguments); };
    return { home: game.state.homeTileId, to: out }; });
  const tap = (id) => P.evaluate((id) => { selectedTile = id; renderTileInfo(); const btn = document.getElementById("teleportBtn"); if (!btn || btn.disabled) return "nobtn"; btn.click(); return "ok"; }, id);
  const serverMine = () => Object.keys(store).filter((k) => /cities\//.test(k) && store[k] && store[k].owner && !/^bot_/.test(store[k].owner)).map((k) => k.split("/").pop().replace("_", ","));
  /* the game thinks my city is at X, the server has it at home */
  const s0 = serverMine();
  await P.evaluate((x) => { ksAdoptHome(x); }, ids.to[0]);
  const t1 = await tap(ids.to[1]); await P.waitForTimeout(2500);
  const r = await P.evaluate(() => ({ home: game.state.homeTileId, toasts: window.__toasts, mine: Object.keys(occupiedTileIds).filter((k) => occupiedTileIds[k] === PLAYER_ID) }));
  const s1 = serverMine();
  /* out of step again; the load-time check puts it right */
  const r2 = await P.evaluate((x) => { ksAdoptHome(x); return ksCheckMyCity().then((ch) => ({ ch, home: game.state.homeTileId })); }, ids.to[0]);
  console.log(JSON.stringify({ ids, s0, t1, r, s1, r2, errs }));
  await b.close();
  assert.deepStrictEqual(errs, []);
  assert.deepStrictEqual(s0, [ids.home], "server had the city at home");
  assert(!r.toasts.some((t) => /failed/i.test(t)), "teleport works even though the game was out of step");
  assert.strictEqual(r.home, ids.to[1]); assert.deepStrictEqual(s1, [ids.to[1]], "server moved it"); assert.deepStrictEqual(r.mine, [ids.to[1]], "one city of mine on the map");
  assert(r2.ch && r2.home === ids.to[1], "load-time check moves the city back to the server's spot");
  console.log("g330 ok");
})().catch((e) => { console.error(e); process.exit(1); });
