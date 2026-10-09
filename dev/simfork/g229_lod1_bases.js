/* v1009: one zoom step further out (LOD 1) bases keep their real art (only resources become dots); alliance tags hide below 13 px tiles; LOD 2 still dots. Run: node dev/simfork/g229_lod1_bases.js */
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
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "g229@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Emp"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(async () => { setScreen("world"); const h = mapTileById(game.state.map, game.state.homeTileId); await generateBotAlliance({ count: 6, name: "Bots", tag: "BOT", x: h.x + 6, y: h.y }); });
  await P.waitForTimeout(3000);
  const o = {};
  for (const px of [30, 15, 9, 5]) { await P.evaluate((px) => { setMapZoom(mapZoom * px / tilePxZ()); centerMapOnTile(game.state.homeTileId); }, px); await P.waitForTimeout(1200);
    o["px" + px] = await P.evaluate(() => { const tag = document.querySelector("#mapworld .city-tag"); return { lod: mapLod(), art: document.querySelectorAll("#mapworld .tile.mycity img, #mapworld .tile.othercity img").length, dots: document.querySelectorAll("#mapworld .tile.lod-city, #mapworld .tile.lod-mine").length, resDots: document.querySelectorAll("#mapworld .tile.lod-res").length, tagShown: !!tag && getComputedStyle(tag).display !== "none" }; }); }
  console.log(JSON.stringify(o));
  assert.ok(o.px30.lod === 0 && o.px30.art >= 7 && o.px30.tagShown, "zoomed in: art + tags");
  assert.ok(o.px15.lod === 1 && o.px15.art >= 7 && o.px15.dots === 0 && o.px15.resDots > 0 && o.px15.tagShown, "LOD 1: bases keep their art, resources are dots, tags still shown at 15 px");
  assert.ok(o.px9.lod === 1 && o.px9.art >= 7 && o.px9.dots === 0 && !o.px9.tagShown, "LOD 1 at 9 px: art, tags hidden");
  assert.ok(o.px5.lod === 2 && o.px5.art === 0 && o.px5.dots >= 7, "LOD 2: dots as before");
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
