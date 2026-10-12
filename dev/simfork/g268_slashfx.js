/* v1101: Gareth's Colossal slash drawn by the game's own drawHeroAnim at fixed attack frames (3.4 .. 6.6) on a test canvas, big (scale 4),
   plus a clone (tinted) and a flipped one. Writes dev/simfork/out_g268_slash.png. Checks no page errors.  Run: node dev/simfork/g268_slashfx.js */
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
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForTimeout(4000);
  const url = await P.evaluate(async () => {
    while (!heroAnimImg("gareth")) await new Promise((r) => setTimeout(r, 100));
    const F = [3.4, 4.2, 4.8, 5.3, 5.9, 6.6], c = document.createElement("canvas"); c.width = 360 * F.length; c.height = 3 * 300;
    const g = c.getContext("2d"); g.fillStyle = "#1b2a48"; g.fillRect(0, 0, c.width, c.height);
    const realNow = performance.now.bind(performance);
    [[false, null], [true, null], [false, CLONE_TINT]].forEach(([flip, tint], row) => {
      g.fillStyle = "#2a3424"; g.fillRect(0, row * 300 + 250, c.width, 50);
      F.forEach((f, i) => { heroAnimRestart("gareth"); performance.now = () => f / 22 * 1000; /* ft = now * fps: lands exactly on frame f */
        drawHeroAnim(g, "gareth", i * 360 + (flip ? 230 : 130), row * 300 + 250, "attack", 4, flip, 0, 1, tint); });
    });
    performance.now = realNow;
    return c.toDataURL("image/png");
  });
  fs.writeFileSync(path.join(__dirname, "out_g268_slash.png"), Buffer.from(url.split(",")[1], "base64"));
  console.log(JSON.stringify({ errs })); await b.close();
  assert.deepStrictEqual(errs, [], "page errors"); console.log("g268 ok");
})().catch((e) => { console.error(e); process.exit(1); });
