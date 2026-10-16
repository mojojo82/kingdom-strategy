/* v1236 (Harley: "fps is bad with marches out, back to 60 when they are home"): frame time with 3 marches out on the world map, CPU throttled 4x,
   switching one thing off at a time (water, 3D ships, route arrows, march list) + no marches. Also time inside the march code per frame.
   Headless WebGL is software (CPU), so GPU-heavy parts look worse than on a phone - compare the rows, not the absolute fps. GAMEFILE=old build. */
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
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: +(process.env.DPR || 1) });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "perf" + Date.now() + "@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Hunter"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  await P.evaluate(() => { try { setScreen("world"); } catch (e) {} centerMapOnHome(); });
  await P.waitForTimeout(2000);
  const sent = await P.evaluate(() => {
    const s = game.state, h = mapTileById(s.map, s.homeTileId), tk = Object.keys(s.troops).find((k) => /infantry/.test(k)) || Object.keys(s.troops)[0]; s.troops[tk] = 5000;
    const res = s.map.filter((t) => t.type === "resource" && Math.abs(t.x - h.x) + Math.abs(t.y - h.y) >= 4 && Math.abs(t.x - h.x) + Math.abs(t.y - h.y) <= 9).slice(0, 3);
    const out = []; res.forEach((t) => { const a = {}; a[tk] = 100; const r = game.sendMarch(a, t.id, "gather", []); if (r && r.march) { const m = r.march; m.travelSec = 600; m.arriveAt = Date.now() + 600000; out.push(m.id); } });
    try { startMarchAnim(); } catch (e) {} return { n: out.length, tk };
  });
  await P.waitForTimeout(1500);
  const cdp = await P.context().newCDPSession(P); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await P.evaluate(() => {
    window.__T = { um: 0, gl: 0, wb: 0, rm: 0 };
    const wrap = (name, key) => { const o = window[name]; if (typeof o !== "function") return; window[name] = function () { const t = performance.now(); try { return o.apply(this, arguments); } finally { window.__T[key] += performance.now() - t; } }; };
    wrap("marchGLDraw", "gl"); wrap("marchWaterBuild", "wb"); wrap("renderMarches", "rm");
    const om = window.updateMarchMarkers; window.updateMarchMarkers = function (manual) { const t = performance.now(); try { return om.call(this, manual); } finally { window.__T.um += performance.now() - t; } };
  });
  async function measure(label, setup) {
    await P.evaluate(setup); await P.waitForTimeout(800);
    const r = await P.evaluate(() => new Promise((done) => { const T0 = Object.assign({}, window.__T), ft = []; let last = performance.now();
      (function f(t) { ft.push(t - last); last = t; if (ft.length < 240) requestAnimationFrame(f); else { const a = ft.slice(5), avg = a.reduce((x, y) => x + y, 0) / a.length, n = a.length; const per = (k) => +((window.__T[k] - T0[k]) / n).toFixed(2);
        done({ fps: Math.round(1000 / avg), avgMs: +avg.toFixed(1), marchJsMs: per("um"), glMs: per("gl"), waterMs: per("wb"), listMs: per("rm"), ships: Object.keys(marchMarkerEls).length }); } })(performance.now()); }));
    console.log(label.padEnd(28) + JSON.stringify(r)); return r;
  }
  const R = {};
  R.all = await measure("3 marches, everything on", () => {});
  if (process.env.NODRAW) { R.nd = await measure("ships not drawn (canvas only)", () => { window.__nodraw = true; march3dWater = false; }); console.log("triangles per ship", JSON.stringify(await P.evaluate(() => window.__tri))); await P.evaluate(() => { window.__nodraw = false; march3dWater = true; }); }
  R.noWater = await measure("water off", () => { march3dWater = false; });
  R.no3d = await measure("3D ships off (+water off)", () => { march3dOn = false; });
  R.only3d = await measure("3D on, water off", () => { march3dOn = true; march3dWater = false; });
  R.noPaths = await measure("route arrows hidden", () => { march3dWater = true; const st = document.createElement("style"); st.id = "__np"; st.textContent = ".march-path{display:none!important}"; document.head.appendChild(st); });
  R.noList = await measure("march list hidden", () => { document.getElementById("__np").remove(); const st = document.createElement("style"); st.id = "__nl"; st.textContent = "#worldMarchesPanel,#marchesDock,.wm-marches{display:none!important}"; document.head.appendChild(st); });
  R.none = await measure("no marches", () => { document.getElementById("__nl").remove(); window.__keep = game.state.marches.slice(); game.state.marches.length = 0; });
  console.log(JSON.stringify({ build: (GAME.match(/var KS_BUILD = "(v\d+)"/) || [])[1], sent, errs: errs.slice(0, 3) }));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
