/* v1012: other players see your base skin (city doc field "sk") and your current avatar (profile re-read after a minute, not once per session).
   Two players, one shared fake backend. Run: node dev/simfork/g232_shared_look.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  const mk = async (email, name) => {
    const ctx = await b.newContext({ viewport: { width: 430, height: 932 } });
    await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
    await ctx.exposeFunction("__fbcall", call);
    await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
    await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
    await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(name + ": " + e.message));
    await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
    await P.fill("#ksE", email); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
    await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", name); await P.click("#ksGo"); await P.waitForTimeout(5000);
    return P;
  };
  const dot = (P, col) => P.evaluate((col) => { const c = document.createElement("canvas"); c.width = c.height = 32; const x = c.getContext("2d"); x.fillStyle = col; x.fillRect(0, 0, 32, 32); return c.toDataURL("image/png"); }, col);
  const A = await mk("g232a@test.dev", "Alpha"), B = await mk("g232b@test.dev", "Bravo");
  const red = await dot(A, "#f00"), blue = await dot(A, "#00f");
  const home = await A.evaluate((red) => { saveAvatarDataUrl(red); game.state.skins.city_titan = 1; setMapCitySkin("titan"); return game.state.homeTileId; }, red);
  await A.waitForTimeout(2500);
  const o = {};
  o.doc = Object.keys(store).filter((k) => /\/cities\//.test(k)).map((k) => store[k]).find((d) => d && d.sk === "titan") ? "titan" : null;
  /* the fake backend only pushes live updates on a write from the same page, so B makes a tiny write of its own first (real Firestore pushes them by itself) */
  const look = () => B.evaluate((home) => { cloudDb.doc("players/" + PLAYER_ID + "/assetitems/g232ping").set({ data: String(Date.now()) }); setScreen("world"); goToWorldTile(home); return new Promise((res) => setTimeout(() => { const t = mapTileEls[home]; const im = t && t.querySelector("img.city-icon-img, img");
    res({ skin: citySkinIdAt(home), cls: t && t.className, imgW: im ? im.style.width : null, avatar: (fetchOwnerProfile(occupiedTileIds[home]) || {}).avatar }); }, 2500)); }, home);
  const s1 = await look(); o.skin1 = s1.skin; o.av1 = s1.avatar === red; o.imgW = s1.imgW;
  /* A changes avatar while B's game stays open: B sees it after the minute is up (the minute is skipped here) */
  await A.evaluate((blue) => saveAvatarDataUrl(blue), blue); await A.waitForTimeout(1500);
  await B.evaluate((home) => { const p = ownerProfileCache[occupiedTileIds[home]]; if (p) p.at = 0; }, home);
  const s2 = await look(); await B.waitForTimeout(800); const s3 = await look(); o.av2 = s3.avatar === blue;
  /* back to the default skin */
  await A.evaluate(() => setMapCitySkin("tower")); await A.waitForTimeout(2000); const s4 = await look(); o.skin4 = s4.skin;
  /* v1016: world chat shows the other player's avatar */
  await A.evaluate(() => postWorldChat("hello from Alpha")); await A.waitForTimeout(1200);
  o.chat = await B.evaluate(() => new Promise((res) => { cloudDb.doc("players/" + PLAYER_ID + "/assetitems/g232ping2").set({ data: "1" }); setScreen("more", "chat"); setTimeout(() => { try { renderWorldChat(); } catch (e) {} setTimeout(() => {
    const row = [...document.querySelectorAll("#chatMessages .chat-msg")].find((r) => /hello from Alpha/.test(r.textContent)); const im = row && row.querySelector("img.chat-avatar"); res({ row: !!row, img: !!im, src: im ? im.getAttribute("src").slice(0, 30) : null }); }, 1500); }, 1500); }));
  console.log(JSON.stringify(o));
  assert.strictEqual(o.doc, "titan", "the city doc carries the skin");
  assert.ok(o.skin1 === "titan", "the other player draws Titan Fountain");
  assert.ok(o.av1, "the other player sees the avatar");
  assert.ok(o.av2, "a changed avatar shows up without a reload");
  assert.strictEqual(o.skin4, "tower", "switching back is seen too");
  assert.ok(o.chat.row && o.chat.img && /^data:image/.test(o.chat.src), "chat shows the other player's avatar");
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
