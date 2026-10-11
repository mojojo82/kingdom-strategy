/* v1086: phase 5 - Atlantis loads bases by patch on TEST; the admin switch (registry patchOff) puts a whole kingdom back on the old whole list on its next open (the rollback),
   and bases show either way. Run: node dev/simfork/g263_atlantis_patches.js */
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
  const A = await page(""); await signUp(A, "pp@test.dev", "Pp");
  const a = await A.evaluate(() => ({ mode: patchMode(), home: game.state.homeTileId, uid: PLAYER_ID }));
  /* another Atlantis player next door, so there is a base to see */
  const B = await page(""); await signUp(B, "pq@test.dev", "Pq");
  const near = await B.evaluate((h) => { const [x, y] = h.split(",").map(Number); for (let r = 6; r < 30; r++) { const t = mapTileAt(game.state.map, x + r, y); if (t && t.type === "empty" && !occupiedTileIds[t.id] && !isTileTooCloseToCity(t.id)) return t.id; } }, a.home);
  const tp = await B.evaluate((t) => { setScreen("world"); const vp = document.getElementById("mapviewport"), c = tileCenterPx(mapTileById(game.state.map, t)); vp.scrollLeft = c.x - 200; vp.scrollTop = c.y - 400; renderVisibleTiles(); return new Promise((r) => setTimeout(() => r(teleportTo(t)), 1500)); }, near);
  const bUid = await B.evaluate(() => PLAYER_ID);
  const sees = async (P) => { await P.evaluate(() => { window.__fbNotify(); setScreen("world"); centerMapOnHome(); renderVisibleTiles(); }); await P.waitForTimeout(1500); return P.evaluate(([t, u]) => ({ mode: patchMode(), whole: !patchMode(), seesB: occupiedTileIds[t] === u }), [near, bUid]); };
  const on = await sees(A); console.log("by patch", JSON.stringify(on));
  assert.ok(a.mode && on.mode && on.seesB, "Atlantis by patch sees the neighbour's base");
  /* rollback: admin flips the kingdom to the old whole list; a fresh open picks it up */
  store["envs/test/servers/server0"] = Object.assign({}, store["envs/test/servers/server0"], { patchOff: true });
  const A2 = await page(""); await A2.fill("#ksE", "pp@test.dev"); await A2.fill("#ksP", "secret123"); await A2.click("#ksIn"); await A2.waitForTimeout(7000);
  const off = await sees(A2); console.log("rolled back", JSON.stringify(off));
  assert.ok(!off.mode && off.seesB, "whole list again, base still seen");
  assert.ok(tp && tp.ok, "teleport ok");
  assert.deepStrictEqual(errs, []); console.log("g263 OK"); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
