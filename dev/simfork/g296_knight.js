/* v1174: Dark Knight look test - Dev Tools toggle draws the knight's idle at the boss spot in Conquest. Looks only: no enemy is added,
   it animates, it's 110 pt tall by default, feet on the boss ground line, off = not drawn. Screenshots out_g296_*.png.  Run: node dev/simfork/g296_knight.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "g296@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Knight"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => setScreen("conquest")); await P.waitForTimeout(3000);
  const box = async (id) => P.evaluate((id) => { const r = document.getElementById(id).getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; }, id);
  const probe = () => P.evaluate(async () => { const calls = []; const o = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (im) { if (im === KNIGHT_IDLE.img) calls.push([].slice.call(arguments, 1)); return o.apply(this, arguments); };
    await new Promise((r) => setTimeout(r, 700)); CanvasRenderingContext2D.prototype.drawImage = o;
    const cv = document.getElementById("idleCanvas"), w = cv.clientWidth, h = cv.clientHeight - (cv._skyH || 0); /* v1262: minus the taller-screen sky */
    return { calls: calls.length, frames: new Set(calls.map((c) => c[0] + "," + c[1])).size, last: calls[calls.length - 1], bossX: idleBossX(w), feet: groundYFor(h) + 15, enemies: game.state.idle.enemies.length, boss: game.state.idle.enemies.some((e) => e.type === "boss") }; });
  const off = await probe();
  const en0 = await P.evaluate(() => game.state.idle.enemies.map((e) => e.id).join());
  await P.evaluate(() => { const t = document.getElementById("devKnightToggle"); t.checked = true; t.onchange(); });
  const on = await probe();
  await P.screenshot({ path: path.join(__dirname, "out_g296_knight.png"), clip: await box("idleCanvas") });
  await P.evaluate(() => { const r = document.getElementById("devKnightSize"); r.value = 150; r.oninput(); }); await P.waitForTimeout(300);
  const big = await probe();
  await P.screenshot({ path: path.join(__dirname, "out_g296_knight150.png"), clip: await box("idleCanvas") });
  const saved = await P.evaluate(() => [localStorage.getItem(KNIGHT_PREVIEW_KEY), localStorage.getItem(KNIGHT_SIZE_KEY)]);
  await P.evaluate(() => { document.getElementById("devKnightSizeReset").onclick(); const t = document.getElementById("devKnightToggle"); t.checked = false; t.onchange(); });
  const off2 = await probe();
  console.log(JSON.stringify({ off, on, big, off2, saved, errs }));
  await b.close();
  if (!process.env.NOASSERT) {
    assert.deepStrictEqual(errs, []);
    assert.strictEqual(off.calls, 0, "off by default"); assert.strictEqual(off2.calls, 0, "off again");
    assert(on.calls > 10 && on.frames > 3, "drawn and animating");
    const [sx, sy, sw, sh, dx, dy, dw, dh] = on.last;
    assert(Math.abs(dh - 110) < 0.5 && Math.abs(dx + dw / 2 - on.bossX) < 0.5, "110 pt, centred on the boss spot");
    assert(dy < on.feet && dy + dh >= on.feet - 1, "feet on the boss ground line");
    assert(Math.abs(big.last[7] - 150) < 0.5, "size slider");
    assert.deepStrictEqual(saved, ["1", "150"], "this device remembers it");
    console.log("g296 ok");
  }
})().catch((e) => { console.error(e); process.exit(1); });
