/* v1074: world map plan phase 1 - baseline load measurement on the fake server.
   Fills Vanaheim with the labelled 1,000-bot crowd (dev/load/crowd.js) and measures today's whole-kingdom sync:
   Firestore reads when a player opens the game, reads per change, and the phone-side time to process each update.
   Reads are counted the way Firestore bills a listener: every doc in the first snapshot, then each added/changed/removed doc.
   Headless Chromium on a server - times are for comparing before/after, not phone numbers.
   Run: node dev/load/baseline.js [bases=1000] [marches=300] [changes=150] */
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const { makeCrowd, removeCrowd } = require("./crowd.js");
const arg = (i, d) => (process.argv[i] === undefined ? d : +process.argv[i]);
const PATCH = process.env.MODE === "patch"; /* v1081: MODE=patch measures bases by patch (phase 2); default = the whole-list way */
const C = require(path.join(ROOT, "functions/core.js")), ADMIN = require(path.join(ROOT, "functions/admins.json"))[0];
const BASES = arg(2, 1000), MARCHES = arg(3, 300), CHANGES = arg(4, 150);
const HOOK = `;(function () { /* load meter: wraps listeners and one-off reads */
  var M = window.__ksLoad = { reads: 0, listens: {} }, db = firebase.firestore();
  function L(p) { return M.listens[p] || (M.listens[p] = { first: 0, snaps: 0, billed: 0, ms: [] }); }
  var QP = db.collection("x").constructor.prototype, DP = db.doc("x/y").constructor.prototype;
  var qos = QP.onSnapshot, qget = QP.get, dos = DP.onSnapshot, dget = DP.get;
  QP.onSnapshot = function (next, e) { var self = this, last = null, rec = L(self.path + (self.f.length ? "?" + JSON.stringify(self.f) : ""));
    return qos.call(this, function (s) { var cur = {}, n = 0; s.docs.forEach(function (d) { cur[d.id] = JSON.stringify(d.data()); });
      if (!last) n = s.docs.length; else { for (var k in cur) if (last[k] !== cur[k]) n++; for (var k2 in last) if (!(k2 in cur)) n++; }
      last = cur; if (rec.snaps && !n) return; /* Firestore sends nothing when nothing in the result changed */
      if (!rec.snaps) rec.first = s.docs.length; rec.snaps++; rec.billed += Math.max(n, rec.snaps === 1 ? 1 : 0); M.reads += Math.max(n, rec.snaps === 1 ? 1 : 0);
      var t = performance.now(); next(s); rec.ms.push(performance.now() - t); }, e); };
  DP.onSnapshot = function (next, e) { var self = this, last, rec = L(self.path);
    return dos.call(this, function (s) { var j = JSON.stringify(s.data() || null); if (rec.snaps && j === last) return; last = j; rec.snaps++; rec.billed++; M.reads++;
      var t = performance.now(); next(s); rec.ms.push(performance.now() - t); }, e); };
  QP.get = function () { var self = this; return qget.call(this).then(function (s) { M.reads += Math.max(1, s.docs.length); L("get:" + self.path).billed += Math.max(1, s.docs.length); return s; }); };
  DP.get = function () { M.reads++; return dget.call(this); };
  M.lt = 0; M.ltMs = 0; try { new PerformanceObserver(function (l) { l.getEntries().forEach(function (x) { M.lt++; M.ltMs += x.duration; }); }).observe({ entryTypes: ["longtask"] }); } catch (e) {}
})();`;
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8") + HOOK, GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
const pct = (a, p) => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const r1 = (x) => Math.round(x * 10) / 10;
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [], pages = [];
  async function player(email) {
    const ctx = await b.newContext({ viewport: { width: 430, height: 932 } });
    await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
    await ctx.exposeFunction("__fbcall", call);
    await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
    await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
    await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    await ctx.addInitScript((off) => { try { localStorage.setItem("ks_patch_off_v1", off ? "1" : "0"); } catch (e) {} }, !PATCH);
    const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message)); pages.push(P);
    await P.goto("https://mojojo82.github.io/kingdom-strategy/test/?k=vanaheim"); await P.waitForSelector("#ksAuth .box");
    await P.fill("#ksE", email); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
    await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", email.split("@")[0]); await P.click("#ksGo"); await P.waitForTimeout(8000);
    await P.evaluate(() => { setScreen("world"); }); await P.waitForTimeout(1500);
    return P;
  }
  const snapOf = (P) => P.evaluate(() => { const M = window.__ksLoad, o = { reads: M.reads, longTasks: M.lt, longTaskMs: Math.round(M.ltMs), listens: {} };
    Object.keys(M.listens).forEach((k) => { const l = M.listens[k]; o.listens[k] = { first: l.first, snaps: l.snaps, billed: l.billed, ms: l.ms.slice() }; }); return o; });
  const fps = (P, ms) => P.evaluate((ms) => new Promise((res) => { let n = 0; const t0 = performance.now(); (function f() { n++; if (performance.now() - t0 < ms) requestAnimationFrame(f); else res(Math.round(n * 1000 / ms)); })(); }), ms);
  const notifyAll = () => Promise.all(pages.map((P) => P.evaluate(() => window.__fbNotify && window.__fbNotify()).catch(() => {})));
  const out = { bases: BASES, marches: MARCHES, changes: CHANGES };

  /* 1. empty Vanaheim: what opening the game costs today with nobody else there */
  const A = await player("load-a@test.dev");
  const sA = await snapOf(A);
  out.emptyOpen = { reads: sA.reads, fps: await fps(A, 4000), sid: await A.evaluate(() => CURRENT_SERVER_ID) };
  if (out.emptyOpen.sid !== "server1") throw new Error("not in Vanaheim");

  /* 2. the crowd: spaced free land tiles picked by the game itself */
  const tiles = await A.evaluate((count) => { const n = mapSizeTiles(), out = [], held = []; let tries = 0;
    while (out.length < count && tries++ < 400000) { const t = mapTileAt(game.state.map, Math.floor(Math.random() * n), Math.floor(Math.random() * n));
      if (t && t.type === "empty" && !occupiedTileIds[t.id] && !isTileTooCloseToCity(t.id)) { occupiedTileIds[t.id] = "?"; held.push(t.id); out.push({ id: t.id }); } }
    held.forEach((id) => { delete occupiedTileIds[id]; }); return out; }, BASES);
  const crowd = makeCrowd(tiles, { prefix: "envs/test/servers/server1/", marches: MARCHES });
  Object.assign(store, crowd);
  if (PATCH) { const r = JSON.parse(await call("adminRebuildPatches", JSON.stringify({ env: "test", srv: "server1" }), JSON.stringify({ uid: ADMIN, token: { firebase: { sign_in_provider: "google.com" } } }))); out.rebuild = r.data || r; }
  await notifyAll(); await A.waitForTimeout(3000);
  out.crowdDocs = Object.keys(crowd).length;

  await A.context().close(); pages.splice(pages.indexOf(A), 1); /* only one game running while measuring */
  /* 3. a new player opens the game in the crowded kingdom */
  const B = await player("load-b@test.dev");
  const sB = await snapOf(B);
  const cityKey = Object.keys(sB.listens).find((k) => /server1\/cities$/.test(k)), marchKey = Object.keys(sB.listens).find((k) => /server1\/marches$/.test(k));
  const baseKeys = Object.keys(sB.listens).filter((k) => /server1\/(cities$|patches\/)/.test(k)), sum = (f) => baseKeys.reduce((a, k) => a + f(sB.listens[k]), 0);
  out.crowdedOpen = { reads: sB.reads, baseListeners: baseKeys.length, baseReads: sum((l) => l.billed), cityDocs: cityKey ? sB.listens[cityKey].first : null,
    marchListeners: Object.keys(sB.listens).filter((k) => /server1\/marches/.test(k)).length, marchesKnown: await B.evaluate(() => Object.keys(worldMarches).length), marchReads: Object.keys(sB.listens).filter((k) => /server1\/marches/.test(k)).reduce((a, k) => a + sB.listens[k].billed, 0), /* v1082: marches by patch = several listeners */
    baseFirstMs: r1(sum((l) => l.ms[0] || 0)), longTasks: sB.longTasks, longTaskMs: sB.longTaskMs,
    topListens: Object.entries(sB.listens).map(([k, l]) => [k.replace("envs/test/", ""), l.billed]).sort((x, y) => y[1] - x[1]).slice(0, 8) };
  out.crowdedFpsIdle = await fps(B, 4000);
  out.drawn = await B.evaluate(() => ({ marches: foreignMarchList(vnow()).length + game.state.marches.length, shipMarkers: Object.keys(marchMarkerEls).length, routeArrows: Object.keys(marchPathEls).length }));
  if (process.env.PROFILE) { const cdp = await B.context().newCDPSession(B); await cdp.send("Profiler.enable"); await cdp.send("Profiler.start"); await B.waitForTimeout(3000);
    const { profile } = await cdp.send("Profiler.stop"); const self = {}, dt = profile.timeDeltas, byId = {}; profile.nodes.forEach((n) => { byId[n.id] = n; });
    profile.samples.forEach((id, i) => { const n = byId[id], k = n.callFrame.functionName + ":" + n.callFrame.lineNumber; self[k] = (self[k] || 0) + (dt[i] || 0); });
    out.profile = Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, v]) => k + " " + Math.round(v / 1000) + "ms");
    out.split = {};
    await B.evaluate(() => { document.getElementById("mapMarchLayer").querySelectorAll("*").length; window.__pathCount = Object.keys(marchPathEls).length; window.__markCount = Object.keys(marchMarkerEls).length; });
    out.split.domCounts = await B.evaluate(() => [window.__pathCount, window.__markCount, document.getElementById("mapMarchLayer").querySelectorAll("*").length]);
    await B.evaluate(() => { march3dOn = false; }); out.split.no3d = await fps(B, 3000);
    await B.evaluate(() => { const st = document.createElement("style"); st.id = "__hp"; st.textContent = "#mapMarchLayer *{display:none!important}"; document.head.appendChild(st); }); out.split.no3dNoDom = await fps(B, 3000);
    await B.evaluate(() => { march3dOn = true; }); out.split.only3d = await fps(B, 3000);
    await B.evaluate(() => { document.getElementById("__hp").remove(); });
    out.onScreen = await B.evaluate(() => ({ marchEls: document.querySelectorAll("[id^=march], .march, .wmarch").length, cities: document.querySelectorAll(".othercity, .city").length })); }

  /* 4. activity: one change at a time (base HP hit, march sent, march finished), as other players would make them */
  const before = await snapOf(B), owners = Object.keys(crowd).filter((k) => /\/cities\//.test(k)), marchKeys = Object.keys(crowd).filter((k) => /\/marches\//.test(k));
  const fpsDuring = fps(B, Math.max(4000, CHANGES * 60));
  for (let i = 0; i < CHANGES; i++) {
    const kind = i % 3, now = Date.now();
    if (kind === 0) { const k = owners[(i * 7919) % owners.length]; store[k] = Object.assign({}, store[k], { hp: 50 + (i % 50), hpT: now, burnLeft: 0 });
      if (PATCH) { const cid = k.split("/").pop(), pk = "envs/test/servers/server1/patches/" + C.patchIdOfCity(cid), pd = store[pk] || { b: {} }; pd.b = Object.assign({}, pd.b); pd.b[cid] = C.patchEntry(store[k]); store[pk] = Object.assign({}, pd, { t: now }); } } /* what the server does on a hit */
    else if (kind === 1) { const src = store[marchKeys[i % marchKeys.length]]; if (src) store[src.ownerId ? "envs/test/servers/server1/marches/" + src.ownerId + "_lx" + i : "x"] = Object.assign({}, src, { mid: "lx" + i, arriveAt: now + 120000, actionEnd: now + 125000, returnAt: now + 245000, updatedAt: now }); }
    else { const k = marchKeys[i % marchKeys.length]; delete store[k]; }
    await notifyAll(); await B.waitForTimeout(40);
  }
  await B.waitForTimeout(1500);
  const after = await snapOf(B);
  const ms = [].concat(...Object.keys(after.listens).filter((k) => /server1\/(cities$|patches\/|marches)/.test(k)).map((k) => after.listens[k].ms.slice(before.listens[k] ? before.listens[k].ms.length : 0)));
  const baseReadsDuring = Object.keys(after.listens).filter((k) => /server1\/(cities$|patches\/)/.test(k)).reduce((a, k) => a + after.listens[k].billed - (before.listens[k] ? before.listens[k].billed : 0), 0);
  out.perChange = { readsForThisPlayer: after.reads - before.reads, readsPerChange: r1((after.reads - before.reads) / CHANGES), baseChanges: Math.ceil(CHANGES / 3), baseReadsForThem: baseReadsDuring, updates: ms.length,
    msMedian: r1(pct(ms, 0.5)), msP95: r1(pct(ms, 0.95)), msMax: r1(Math.max(0, ...ms)), longTasks: after.longTasks - before.longTasks, longTaskMs: after.longTaskMs - before.longTaskMs, fps: await fpsDuring };
  out.errors = errs.slice(0, 5);
  out.removed = removeCrowd(store);
  fs.writeFileSync(path.join(__dirname, PATCH ? "patch-results.json" : "baseline-results.json"), JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
