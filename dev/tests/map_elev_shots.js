/* v1737: world map at a given elevation (headless, fake Firebase, 430x932 @2x - not a phone): my city, 3 neighbour skins, two gather marches out.
   node dev/tests/map_elev_shots.js OUT.png [ELEV]   (ELEV overrides MAP_ELEV_DEG in the page for a before/after) */
const fs = require("fs"), path = require("path"), ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const OUT = process.argv[2], ELEV = process.argv[3];
let G = fs.readFileSync(path.join(ROOT, "test/index.html"), "utf8"); if (ELEV) G = G.replace("var MAP_ELEV_DEG = 44;", "var MAP_ELEV_DEG = " + (+ELEV) + ";");
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome", args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-webgl"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, require(path.join(ROOT, "dev/tests/siteroute.js"))(G));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/", { timeout: 180000 }); await P.waitForSelector("#ksAuth .box", { timeout: 120000 });
  await P.fill("#ksE", "elev" + process.pid + "@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 120000 }); await P.fill("#ksN", "Elev"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  const res = await P.evaluate(async () => {
    document.querySelectorAll(".ks-update, #ksUpdate").forEach((e) => e.remove());
    ["gareth", "lyra", "kessa"].forEach((k) => { game.state.heroes[k].owned = true; });
    setScreen("world"); await new Promise((r) => setTimeout(r, 2500));
    const home = game.state.homeTileId, h = tileXY(home), out = [];
    [["ironsent", 5, -5], ["frostgate", 5, 5], ["castle", 10, 0]].forEach((q, i) => { const id = (h[0] + q[1]) + "," + (h[1] + q[2]); occupiedTileIds[id] = "eb_" + i; citySkinByTile[id] = q[0]; ownerProfileCache["eb_" + i] = { name: q[0], avatar: null, bot: true }; });
    const res = game.state.map.filter((t) => t.type === "resource").map((t) => [t, Math.hypot(t.x - h[0], t.y - h[1])]).filter((q) => q[1] > 4 && q[1] < 12).sort((a, b) => a[1] - b[1]).slice(0, 2);
    const keys = ["gareth", "lyra"]; game.state.troops.infantry = (game.state.troops.infantry || 0) + 500; res.forEach((q, i) => { const r = game.sendMarch({ infantry: 50 }, q[0].id, "gather", keys[i]); out.push(r && (r.ok !== false ? "ok" : r.reason)); });
    centerMapOnTile((h[0] + 4) + "," + h[1]); renderVisibleTiles(); return { out, iso: ISO_K, deg: MAP_ELEV_DEG };
  });
  await P.waitForTimeout(6000);
  await P.screenshot({ path: OUT });
  console.log(JSON.stringify(res), "errors", errs.length ? errs.slice(0, 5) : "none"); await b.close();
})();
