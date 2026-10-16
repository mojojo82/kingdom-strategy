/* v1223: where the march ship points vs its route (Harley: the ship doesn't point straight at its target). SHOTS=dir saves pictures + aim.json */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call0 = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store), DELAY = 1500;
 /* the FIRST move is slow to reach the server (cold start / bad signal), later ones are quick - so a second move can land first, like on a phone */
const call = call0;
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
  await P.fill("#ksE", "shipaim@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Aim"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  const SH = process.env.SHOTS, out = []; if (process.env.ZOOM) await P.evaluate((z) => { window.__Z = +z; }, process.env.ZOOM);
  for (const [dx, dy, skin] of (process.env.CASES ? JSON.parse(process.env.CASES) : [[-14, -2, "ghost_galleon"], [-10, -12, "ghost_galleon"], [-3, -14, "ghost_galleon"], [-10, -12, "voidspire"]])) {
    const info = await P.evaluate(([dx, dy, skin]) => {
      try { setScreen("world"); } catch (e) {} if (window.__Z) { setMapZoom(window.__Z); }
      game.state.marches = []; game.state.troops.infantry = 1000;
      const h = mapTileById(game.state.map, game.state.homeTileId), t = mapTileAt(game.state.map, h.x + dx, h.y + dy);
      const r = game.sendMarch({ infantry: 100 }, t.id, "gather", []); r.march.skin = skin; r.march.travelSec = 600; r.march.arriveAt = Date.now() + 600000 * 0.6; /* 40% of the way */
      const hp = tileCenterPx(h), tp = tileCenterPx(t), vp = document.getElementById("mapviewport");
      const mx = hp.x + (tp.x - hp.x) * 0.4, my = hp.y + (tp.y - hp.y) * 0.4; vp.scrollLeft = mx - vp.clientWidth / 2; vp.scrollTop = my - vp.clientHeight / 2;
      return { hp, tp, sl: vp.scrollLeft, st: vp.scrollTop, vr: vp.getBoundingClientRect(), m3d: !!(march3dOn && mapIso) };
    }, [dx, dy, skin]);
    await P.waitForTimeout(1500);
    const f = SH + "/aim_" + skin + "_" + dx + "_" + dy + ".png"; await P.screenshot({ path: f });
    out.push(Object.assign({ f, dx, dy, skin }, info));
  }
  require("fs").writeFileSync(SH + "/aim.json", JSON.stringify(out));
  console.log(JSON.stringify(out.map((o) => ({ f: o.f, m3d: o.m3d })))); console.log(JSON.stringify(errs));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
