/* v1085: phase 4c - crossing the border. From Vanaheim you pan up into Atlantis (and from Atlantis down into Vanaheim): the other kingdom's bases near the
   border are drawn from its patch lists, "Entering <kingdom>" shows, and a base over there gets an info card with attack / teleport / gather greyed out
   (borders closed) - the game itself refuses a march there too. Run: node dev/simfork/g262_border.js */
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
  const ADMIN = require(path.join(ROOT, "functions/admins.json"))[0];
  const rebuild = async (srv) => JSON.parse(await call("adminRebuildPatches", JSON.stringify({ env: "test", srv }), JSON.stringify({ uid: ADMIN, token: { firebase: { sign_in_provider: "google.com" } } })));
  const A = await page(""); await signUp(A, "ba@test.dev", "Ba");
  const V = await page("?k=vanaheim"); await signUp(V, "bv@test.dev", "Bv");
  const n = await V.evaluate(() => mapSizeTiles());
  /* bot bases either side of the border: Atlantis's bottom edge (y = n-1) meets Vanaheim's top edge (y = 0) */
  const atl = [], van = [];
  for (let i = 0; i < 4; i++) { const x = 590 + i * 6; atl.push(x + "," + (n - 4)); van.push(x + "," + 3); }
  atl.forEach((t, i) => { store["envs/test/cities/" + t.replace(",", "_")] = { owner: "bot_atl" + i, claimedAt: 1, sk: "castle", bn: "Atl Bot " + i }; });
  van.forEach((t, i) => { store["envs/test/servers/server1/cities/" + t.replace(",", "_")] = { owner: "bot_van" + i, claimedAt: 1, sk: "tower", bn: "Van Bot " + i }; });
  const r0 = await rebuild("server0"), r1 = await rebuild("server1"); console.log("rebuild", JSON.stringify([r0.data, r1.data]));
  async function look(P, gx, gy) {
    await P.evaluate(([x, y]) => { setScreen("world"); setMapZoom(1); const vp = document.getElementById("mapviewport"), c = tileCenterPx({ x, y }); vp.scrollLeft = c.x - vp.clientWidth / 2; vp.scrollTop = c.y - vp.clientHeight / 2; renderVisibleTiles(); }, [gx, gy]);
    await P.waitForTimeout(1500); await P.evaluate(() => { window.__fbNotify(); renderVisibleTiles(); }); await P.waitForTimeout(800);
    return P.evaluate(() => ({ banner: (document.getElementById("kdBanner") || {}).textContent || "", bannerOn: !!(document.getElementById("kdBanner") || { classList: { contains: () => false } }).classList.contains("on"),
      foreignBases: Object.keys(mapTileEls).filter((id) => isForeignTile(id) && mapTileEls[id].classList.contains("othercity")).sort(), nbrSubs: Object.keys(nbrSubs).length }));
  }
  /* Vanaheim player looks up into Atlantis: Atlantis tile (x,y) is at (x, y - n) for them */
  const v1 = await look(V, 600, -6); console.log("V->Atlantis", JSON.stringify(v1));
  const want = atl.map((t) => { const [x, y] = t.split(",").map(Number); return x + "," + (y - n); }).sort();
  assert.ok(v1.banner === "Entering Atlantis" && v1.bannerOn, "banner"); assert.deepStrictEqual(v1.foreignBases, want, "Atlantis bases near the border drawn");
  /* tap one: closed-border card; the game refuses a march there */
  const card = await V.evaluate((id) => { mapTileEls[id].click(); const el = document.getElementById("tileinfo"); return { text: el.textContent, disabled: [...el.querySelectorAll("button")].filter((b) => b.disabled).length,
    march: (game.state.troops.infantry = 100, game.sendMarch({ infantry: 10 }, id, "attack", []).reason) }; }, want[0]);
  console.log("card", JSON.stringify(card));
  assert.ok(/Atl Bot/.test(card.text) && /Atlantis/.test(card.text) && /Borders are closed/.test(card.text) && card.disabled === 3, "closed-border card");
  assert.ok(card.march && card.march !== "ok", "march into another kingdom refused: " + card.march);
  /* Atlantis player looks down into Vanaheim: Vanaheim tile (x,y) is at (x, y + n) */
  const a1 = await look(A, 600, n + 6); console.log("A->Vanaheim", JSON.stringify(a1));
  const wantV = van.map((t) => { const [x, y] = t.split(",").map(Number); return x + "," + (y + n); }).sort();
  assert.ok(a1.banner === "Entering Vanaheim", "banner"); assert.deepStrictEqual(a1.foreignBases, wantV, "Vanaheim bases near the border drawn");
  /* an Atlantis base snapshot doesn't wipe the neighbour's bases; Atlantis's own claim went through the server (patch written) */
  await A.evaluate(() => window.__fbNotify()); await A.waitForTimeout(800);
  assert.ok(await A.evaluate((id) => !!occupiedTileIds[id], wantV[0]), "neighbour bases survive our own base list updates");
  const aHome = await A.evaluate(() => game.state.homeTileId), [hx, hy] = aHome.split(",").map(Number);
  assert.strictEqual((store["envs/test/patches/" + Math.floor(hx / 50) + "_" + Math.floor(hy / 50)] || { b: {} }).b[aHome.replace(",", "_")].o, await A.evaluate(() => PLAYER_ID), "Atlantis claim kept its patch list right");
  /* back home: banner says so */
  const a2 = await look(A, 600, n - 20); assert.strictEqual(a2.banner, "Entering Atlantis");
  assert.deepStrictEqual(errs, []); console.log("g262 OK"); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
