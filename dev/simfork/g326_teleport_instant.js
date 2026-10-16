/* v1206 (Harley): teleport is instant (other games are) - the city moves at once with a beam-in animation while the server is told in the
   background; a refused move puts it back. Server slowed to DELAY ms here. SHOTS=dir saves animation frames. Run: node dev/simfork/g326_teleport_instant.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call0 = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store), DELAY = 2500;
let refuseNext = false;
const call = async (name, data, auth) => { if (name === "relocateCity") { await new Promise((r) => setTimeout(r, DELAY)); if (refuseNext) { refuseNext = false; return JSON.stringify({ error: { code: "failed-precondition", message: "taken" } }); } } return call0(name, data, auth); };
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
  await P.fill("#ksE", "g326@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Fire"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  const ids = await P.evaluate(() => { try { setScreen("world"); } catch (e) {} const h = mapTileById(game.state.map, game.state.homeTileId), out = [];
    for (let r = 8; r < 40 && out.length < 3; r++) for (let dx = -r; dx <= r && out.length < 3; dx++) { const t = mapTileAt(game.state.map, h.x + dx, h.y + r); if (t && t.type === "empty" && !isTileOccupied(t.id) && !isTileTooCloseToCity(t.id) && !out.some((o) => Math.abs(+o.split(",")[0] - t.x) < 6 && Math.abs(+o.split(",")[1] - t.y) < 6)) out.push(t.id); }
    return { home: game.state.homeTileId, to: out }; });
  const tp = (id) => P.evaluate((id) => { window.__t0 = performance.now(); return teleportTo(id).then((res) => { if (res.ok) { armTeleportDropEffect(id); persist(); render(); try { centerMapOnHome(); } catch (e) {} spawnTeleportDropExtras(id); }
    return { ok: res.ok, ms: Math.round(performance.now() - window.__t0), home: game.state.homeTileId, fx: document.querySelectorAll(".tpx").length }; }); }, id);
  const r1 = await tp(ids.to[0]);
  if (process.env.SHOTS) { const bb = await P.evaluate(() => { const e = document.querySelector(".tpx"); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width }; });
    for (let i = 0; i < 8; i++) { await P.screenshot({ path: process.env.SHOTS + "/tp_" + i + ".png", clip: bb ? { x: Math.max(0, bb.x - bb.w * 0.8), y: Math.max(0, bb.y - bb.w * 1.6), width: Math.min(430, bb.w * 2.6), height: bb.w * 2.4 } : undefined }); await P.waitForTimeout(160); } }
  await P.waitForTimeout(DELAY + 600);
  const r1b = await P.evaluate((id) => ({ home: game.state.homeTileId, mine: occupiedTileIds[id] === PLAYER_ID }), ids.to[0]);
  /* v1207: teleport through the real button - the tapped tile becomes my base, but its card must NOT open */
  const r3 = await P.evaluate((id) => { selectedTile = id; renderTileInfo(); const btn = document.getElementById("teleportBtn"); if (!btn) return { nobtn: true }; btn.click(); return {}; }, ids.to[2]);
  await P.waitForTimeout(DELAY + 600);
  Object.assign(r3, await P.evaluate(() => { const el = document.getElementById("tileinfo"); return { home: game.state.homeTileId, sel: selectedTile, card: !!(el && el.classList.contains("has-sel") && el.innerHTML.trim()) }; }));
  refuseNext = true;
  const r2 = await tp(ids.to[1]);
  await P.waitForTimeout(DELAY + 600);
  const r2b = await P.evaluate(() => ({ home: game.state.homeTileId }));
  console.log(JSON.stringify({ ids, r1, r1b, r3, r2, r2b, errs }));
  await b.close();
  if (!process.env.NOASSERT) {
    assert.deepStrictEqual(errs, []);
    assert(r1.ok && r1.ms < 200 && r1.home === ids.to[0], "the city moves at once, not after the server"); assert(r1.fx >= 1, "beam-in effect plays");
    assert.strictEqual(r1b.home, ids.to[0]); assert(r1b.mine, "still there after the server agrees");
    assert(!r3.nobtn && r3.home === ids.to[2], "Teleport button moves the city"); assert(r3.sel == null && !r3.card, "no base card after teleporting");
    assert(r2.ok && r2.home === ids.to[1], "moves at once again"); assert.strictEqual(r2b.home, ids.to[2], "a refused move puts the city back");
    console.log("g326 ok");
  }
})().catch((e) => { console.error(e); process.exit(1); });
