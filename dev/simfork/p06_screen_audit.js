/* v1318 performance audit, step 1 (Harley, 20 Oct: "begin step 1"): every screen, nothing touched, CPU throttled like a phone (THROTTLE, default 4).
   Per screen, over SEC seconds: frames per second + slowest frames, long tasks (>50 ms), how busy the CPU was (script / style / layout / paint),
   DOM elements torn down + rebuilt per second, and the functions that used the most CPU (profiler, self time, with their line in test/index.html;
   a built-in like drawImage or "set src" is shown with the game function that called it).
   Headless WebGL / canvas is software-rendered, so drawing-heavy screens look worse than on a phone - compare screens with each other.
   Run: node dev/simfork/p06_screen_audit.js
   ONLY=conquest-lava,world picks screens; GAMEFILE=old build; OUT=file.json keeps the numbers; DPR=1 takes most of the (software) drawing cost out;
   HOOK="js" runs an experiment after a screen's setup (try a fix before writing it). */
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
const THROTTLE = +(process.env.THROTTLE || 4), SEC = +(process.env.SEC || 6), ONLY = process.env.ONLY ? process.env.ONLY.split(",") : null;
const SCREENS = [
  ["conquest-village", () => { game.devJumpChapter(1); game.state.idle.levelNum = 5; setScreen("conquest"); }],
  ["conquest-graveyard", () => { game.devJumpChapter(2); game.state.idle.levelNum = 5; setScreen("conquest"); }],
  ["conquest-snow", () => { game.devJumpChapter(3); game.state.idle.levelNum = 5; setScreen("conquest"); }],
  ["conquest-forest", () => { game.devJumpChapter(4); game.state.idle.levelNum = 5; setScreen("conquest"); }],
  ["conquest-cave", () => { game.devJumpChapter(5); game.state.idle.levelNum = 5; setScreen("conquest"); }],
  ["conquest-crystal", () => { game.devJumpChapter(6); game.state.idle.levelNum = 5; setScreen("conquest"); }],
  ["conquest-lava", () => { game.devJumpChapter(7); game.state.idle.levelNum = 5; setScreen("conquest"); }],
  ["heroes", () => setScreen("heroes")],
  ["city", () => setScreen("city")],
  ["city-troops", () => setScreen("city", "troops")],
  ["world", () => setScreen("world")],
  ["more", () => setScreen("more")],
  ["arena-fight", () => { setScreen("more", "arena"); try { renderArena(); } catch (e) {} }],
];
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: +(process.env.DPR || 3) });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => { /* level art (v1315) comes from art/levels/, everything else is the game page */
    const m = /\/kingdom-strategy\/(art\/levels\/[^?]+)/.exec(new URL(r.request().url()).pathname);
    if (m && fs.existsSync(path.join(ROOT, m[1]))) return r.fulfill({ status: 200, contentType: "image/webp", body: fs.readFileSync(path.join(ROOT, m[1])) });
    return r.fulfill({ status: 200, contentType: "text/html", body: GAME }); });
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "audit@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Audit"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  const cdp = await ctx.newCDPSession(P);
  await cdp.send("Performance.enable"); await cdp.send("Profiler.enable"); await cdp.send("Profiler.setSamplingInterval", { interval: 500 });
  const metrics = async () => { const m = {}; (await cdp.send("Performance.getMetrics")).metrics.forEach((x) => { m[x.name] = x.value; }); return m; };
  const results = [];
  for (const [name, setup] of SCREENS) {
    if (ONLY && ONLY.indexOf(name) < 0) continue;
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    await P.evaluate("(" + setup.toString() + ")()"); await P.waitForTimeout(3500); /* settle (level art in) */
    if (process.env.HOOK) await P.evaluate(process.env.HOOK); /* experiments: JS run after the setup, e.g. to try a fix before writing it */
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: THROTTLE });
    await P.waitForTimeout(800);
    const m0 = await metrics(); await cdp.send("Profiler.start");
    const pg = await P.evaluate(async (SEC) => {
      const cnt = {}; let removed = 0, frames = 0, gaps = [], last = performance.now(), lt = 0, ltMs = 0, run = true;
      const own = (n) => { let e = n; while (e && e !== document.body) { if (e.id) return "#" + e.id; e = e.parentElement; } return "body"; };
      const mo = new MutationObserver((ms) => ms.forEach((m) => { if (m.type !== "childList") return; const k = [...m.removedNodes].filter((n) => n.nodeType === 1).length; if (!k) return; removed += k; const key = own(m.target) + (m.target.offsetParent || m.target === document.body ? "" : " (hidden)"); cnt[key] = (cnt[key] || 0) + k; }));
      mo.observe(document.body, { childList: true, subtree: true });
      let po = null; try { po = new PerformanceObserver((l) => l.getEntries().forEach((e) => { lt++; ltMs += e.duration; })); po.observe({ entryTypes: ["longtask"] }); } catch (e) {}
      const tick = (t) => { if (!run) return; frames++; gaps.push(t - last); last = t; requestAnimationFrame(tick); }; requestAnimationFrame(tick);
      await new Promise((r) => setTimeout(r, SEC * 1000)); run = false; mo.disconnect(); if (po) po.disconnect();
      gaps.sort((a, b) => a - b);
      return { fps: frames / SEC, p95: gaps[Math.floor(gaps.length * 0.95)] || 0, worst: gaps[gaps.length - 1] || 0, longTasks: lt, longTaskMs: ltMs, domPerSec: removed / SEC,
        churn: Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => k + " " + (v / SEC).toFixed(1) + "/s") };
    }, SEC);
    const prof = (await cdp.send("Profiler.stop")).profile, m1 = await metrics();
    /* self time per function from the samples; built-ins are blamed on their nearest game-code caller */
    const byId = {}, parent = {}; prof.nodes.forEach((n) => { byId[n.id] = n; (n.children || []).forEach((c) => { parent[c] = n.id; }); }); const self = {}, dts = prof.timeDeltas;
    const lbl = (n) => { const cf = n.callFrame; return (cf.functionName || "(anonymous)") + (cf.url && cf.lineNumber >= 0 ? " @" + (cf.lineNumber + 1) : ""); };
    prof.samples.forEach((id, i) => { const n = byId[id], dt = (dts[i + 1] || 0) / 1000; let k = lbl(n);
      if (!n.callFrame.url && !/^\(/.test(k)) { let p = byId[parent[id]]; while (p && !p.callFrame.url) p = byId[parent[p.id]]; if (p) k += " <- " + lbl(p); }
      self[k] = (self[k] || 0) + dt; });
    const jsMs = Object.entries(self).filter(([k]) => !/^\((idle|program|garbage collector|root)\)/.test(k)).reduce((s, [, v]) => s + v, 0);
    const top = Object.entries(self).filter(([k]) => !/^\((idle|program|garbage collector|root)\)/.test(k)).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => k + " " + (100 * v / (SEC * 1000)).toFixed(1) + "%");
    const gc = Object.entries(self).filter(([k]) => /^\(garbage collector\)/.test(k)).reduce((s, [, v]) => s + v, 0);
    const d = (k) => (m1[k] || 0) - (m0[k] || 0), busy = (k) => (100 * d(k) / SEC).toFixed(0) + "%";
    const r = { name, fps: +pg.fps.toFixed(1), slowFrameP95ms: Math.round(pg.p95), worstFrameMs: Math.round(pg.worst), longTasks: pg.longTasks, longTaskMs: Math.round(pg.longTaskMs),
      cpu: { total: busy("TaskDuration"), js: (100 * jsMs / (SEC * 1000)).toFixed(0) + "%", script: busy("ScriptDuration"), style: busy("RecalcStyleDuration"), layout: busy("LayoutDuration"), gc: (100 * gc / (SEC * 1000)).toFixed(0) + "%" },
      domRebuiltPerSec: Math.round(pg.domPerSec), churn: pg.churn, topFunctions: top };
    results.push(r);
    console.log("== " + name + "  fps " + r.fps + " | slow frames p95 " + r.slowFrameP95ms + " ms, worst " + r.worstFrameMs + " ms | long tasks " + r.longTasks + " (" + r.longTaskMs + " ms)");
    console.log("   CPU busy " + r.cpu.total + " (JS by profiler " + r.cpu.js + ", script " + r.cpu.script + ", style " + r.cpu.style + ", layout " + r.cpu.layout + ", GC " + r.cpu.gc + ") | DOM rebuilt " + r.domRebuiltPerSec + "/s: " + r.churn.join(", "));
    console.log("   top CPU: " + r.topFunctions.join(" | "));
  }
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify({ throttle: THROTTLE, sec: SEC, results, errs }, null, 1));
  console.log("page errors: " + JSON.stringify(errs));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
