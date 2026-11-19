/* City skin mockup on the real world map (headless Chromium, fake Firebase, 430x932 @2x - not a phone). My city + 3 neighbours in a row, any
   skins (existing ids or new pictures), no other bases on screen.  node dev/tests/city_skin_mock.js OUT.png "tower,new:PATH.webp:Label,titan,..." */
const fs = require("fs"), path = require("path"), ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const OUT = process.argv[2], LIST = (process.argv[3] || "tower,titan").split(",");
const G = fs.readFileSync(path.join(ROOT, "test/index.html"), "utf8");
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome", args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, require(path.join(ROOT, "dev/tests/siteroute.js"))(G));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/", { timeout: 180000 }); await P.waitForSelector("#ksAuth .box", { timeout: 120000 });
  await P.fill("#ksE", "skin" + process.pid + "@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 120000 }); await P.fill("#ksN", "Mock"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  const skins = LIST.map((s, i) => { if (s.indexOf("new:") !== 0) return { id: s }; const [, p, label] = s.split(":"); return { id: "mock" + i, label: label || "Mock " + i, src: "data:image/webp;base64," + fs.readFileSync(p).toString("base64") }; });
  const res = await P.evaluate(async (skins) => {
    document.querySelectorAll(".ks-update, #ksUpdate").forEach((e) => e.remove());
    skins.forEach((s) => { if (s.src) CITY_SKINS[s.id] = { id: s.id, label: s.label, scale: 1.0, src: s.src }; });
    setScreen("world"); await new Promise((r) => setTimeout(r, 2500));
    const home = game.state.homeTileId, h = tileXY(home);
    Object.keys(occupiedTileIds).forEach((id) => { if (id !== home) { delete occupiedTileIds[id]; delete citySkinByTile[id]; } }); /* no other bases on screen */
    mapCitySkin = skins[0].id; citySkinByTile[home] = skins[0].id; try { localStorage.setItem("kingdomMapCitySkin_v1", skins[0].id); } catch (e) {}
    if (!game.state.skins) game.state.skins = {}; game.state.skins.city_titan = 1;
    const spots = [[5, -5], [5, 5], [10, 0], [-5, 5], [15, -15]]; /* 2x2: me top-left, right, below, below-right */ const placed = [];
    skins.slice(1).forEach((s, i) => { const id = (h[0] + spots[i][0]) + "," + (h[1] + spots[i][1]); occupiedTileIds[id] = "mockbot_" + i; citySkinByTile[id] = s.id; ownerProfileCache["mockbot_" + i] = { name: s.label || s.id, avatar: null, bot: true }; placed.push(id); });
    centerMapOnTile((h[0] + 5) + "," + h[1]); renderVisibleTiles(); await new Promise((r) => setTimeout(r, 3000)); renderVisibleTiles();
    return { home, placed };
  }, skins);
  await P.waitForTimeout(2500);
  await P.screenshot({ path: OUT });
  console.log(JSON.stringify(res), "errors", errs.length ? errs.slice(0, 5) : "none"); await b.close();
})();
