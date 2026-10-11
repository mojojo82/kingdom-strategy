/* v1076: bases near you are drawn together with your own base on opening (remembered on the device), a remembered base that has gone is removed when the live list lands, and a new base is drawn as soon as it arrives (not on the next 1 s tick). Run: node dev/simfork/g257_base_popin.js */
const assert = require("assert");
const fs = require("fs"), path = require("path");
const ROOT = require("path").join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const HOOK = `;(function(){ var db=firebase.firestore(), QP=db.collection("x").constructor.prototype, os=QP.onSnapshot; window.__T={};
 QP.onSnapshot=function(n,e){ var p=this.path; var D=+(window.__DELAY||0), first=true, q=this, W; W=function(s){ if(/cities$/.test(p)&&first&&D){ first=false; var ss=s; setTimeout(function(){ if(!window.__T.citySnap) window.__T.citySnap=performance.now(); n(ss); }, D); return; } first=false; if(/cities$/.test(p)&&!window.__T.citySnap) window.__T.citySnap=performance.now(); n(s); }; if(/cities$/.test(p)) window.__cityPush=async function(){ var st=JSON.parse(await window.__fbstore("dump")); W(q.run(st)); }; return os.call(this,W,e); }; })();`;
const FAKE = fs.readFileSync(ROOT + "/dev/tests/fakefb.js", "utf8") + HOOK, GAME = fs.readFileSync(process.env.GAMEFILE || ROOT + "/test/index.html", "utf8");
let SLOW = 0; const store = {}, call = require(ROOT + "/dev/tests/fnrunner.js")(store);
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  async function page() { const ctx = await b.newContext({ viewport: { width: 430, height: 932 } });
    await ctx.exposeFunction("__fbstore", async (op, k, v) => { if (SLOW) await new Promise((r) => setTimeout(r, SLOW)); if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
    await ctx.exposeFunction("__fbcall", call);
    await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
    await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
    await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message)); await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box"); return P; }
  const A = await page(); await A.fill("#ksE", "pop@test.dev"); await A.fill("#ksP", "secret123"); await A.click("#ksUp");
  await A.waitForSelector("#ksN", { timeout: 15000 }); await A.fill("#ksN", "Pop"); await A.click("#ksGo"); await A.waitForTimeout(6000);
  const home = await A.evaluate(() => { setScreen("world"); return game.state.homeTileId; });
  const [hx, hy] = home.split(",").map(Number); let n = 0;
  for (let dx = -8; dx <= 8; dx += 4) for (let dy = -8; dy <= 8; dy += 4) { if (!dx && !dy) continue; store["envs/test/cities/" + (hx + dx) + "_" + (hy + dy)] = { owner: "bot_pop" + n++, claimedAt: 1, sk: "castle" }; }
  await A.evaluate(() => window.__fbNotify()); await A.waitForTimeout(1500); const cache = await A.evaluate(() => localStorage.getItem("ks_nearbases_v1")); await A.context().close();
  const gone = "envs/test/cities/" + (hx + 4) + "_" + (hy + 4), goneId = (hx + 4) + "," + (hy + 4); delete store[gone];
  const B = await page(); await B.fill("#ksE", "pop@test.dev"); await B.fill("#ksP", "secret123");
  await B.context().addInitScript(([c, d]) => { window.__DELAY = d; if (c && !sessionStorage.getItem("x")) { sessionStorage.setItem("x", 1); localStorage.setItem("ks_nearbases_v1", c); } }, [process.env.NOCACHE ? null : cache, +(process.env.DELAY || 0)]);
  await B.context().addInitScript(() => { window.__T0 = 0; window.__tl = []; setInterval(() => { const m = document.querySelectorAll(".tile.mycity").length, o = document.querySelectorAll(".tile.othercity").length, l = window.__tl[window.__tl.length - 1]; if (!l || l.m !== m || l.o !== o) window.__tl.push({ t: Math.round(performance.now()), m, o }); }, 25); });
  await B.click("#ksIn"); await B.waitForTimeout(9000);
  const lat = [];
  await B.evaluate(() => setScreen("world")); await B.waitForTimeout(1200);
  const spots = await B.evaluate(() => { const vp = document.getElementById("mapviewport"), h = mapTileById(game.state.map, game.state.homeTileId), out = [];
    for (let dy = -12; dy <= 12; dy++) for (let dx = -12; dx <= 12; dx++) { const t = mapTileAt(game.state.map, h.x + dx, h.y + dy); if (!t || t.type !== "empty" || occupiedTileIds[t.id] || isTileTooCloseToCity(t.id)) continue;
      const c = tileCenterPx(t), x = c.x - vp.scrollLeft, y = c.y - vp.scrollTop; if (x > 40 && x < vp.clientWidth - 40 && y > 150 && y < vp.clientHeight - 150) { out.push(t.id); occupiedTileIds[t.id] = "?"; } }
    out.forEach((id) => delete occupiedTileIds[id]); return out.filter((_, i) => i % 3 === 0).slice(0, 6); });
  for (let k = 0; k < spots.length; k++) { const id = spots[k].replace(",", "_"); store["envs/test/cities/" + id] = { owner: "bot_new" + k, claimedAt: 1, sk: "castle" };
    lat.push(await B.evaluate((tid) => new Promise((res) => { const t0 = performance.now(); window.__cityPush(); (function f() { const n = document.querySelectorAll(".tile.othercity").length; if (mapTileEls[tid] && mapTileEls[tid].classList.contains('othercity')) return res(Math.round(performance.now() - t0)); if (performance.now() - t0 > 3000) return res(-1); requestAnimationFrame(f); })(); }), id.replace("_", ","))); await B.waitForTimeout(300 + k * 137); }
  console.log("newBaseMs", JSON.stringify(lat));
  const r = await B.evaluate(() => ({ tl: window.__tl, citySnap: window.__T.citySnap && Math.round(window.__T.citySnap), occ: Object.keys(occupiedTileIds).length, fr: window.__T.firstRender && Math.round(window.__T.firstRender), stack: window.__T.stack }));
  r.goneShown = await B.evaluate((id) => !!occupiedTileIds[id], goneId);
  console.log(JSON.stringify({ bots: n, ...r, errs }));
  const firstMine = r.tl.find((x) => x.m > 0);
  assert.ok(cache && JSON.parse(cache).b && Object.keys(JSON.parse(cache).b).length === n, "nearby bases remembered");
  assert.ok(firstMine && firstMine.o >= n - 1, "other bases drawn together with my base: " + JSON.stringify(r.tl));
  assert.strictEqual(r.goneShown, false, "a remembered base that has gone is removed");
  assert.ok(lat.length >= 1 && lat.every((x) => x >= 0 && x < 300), "new bases drawn as soon as they arrive: " + lat);
  /* v1077: reopening (save + memory on this phone): the nearby bases are there in the first frame, before signing in / Firebase connecting */
  await B.evaluate(() => persist()); SLOW = 1500; /* a slow phone connection: every Firebase answer takes 1.5 s */ await B.reload(); await B.waitForTimeout(400);
  const boot = await B.evaluate(() => ({ auth: !!document.querySelector("#ksAuth .box"), home: game.state.homeTileId, bots: Object.keys(occupiedTileIds).filter((id) => /^bot_/.test(occupiedTileIds[id])).length }));
  console.log("boot", JSON.stringify(boot)); SLOW = 0;
  assert.ok(boot.home && boot.bots >= n - 1, "remembered bases ready at boot: " + JSON.stringify(boot));
  assert.deepStrictEqual(errs, []); console.log("g257 OK");
  await b.close();
})();
