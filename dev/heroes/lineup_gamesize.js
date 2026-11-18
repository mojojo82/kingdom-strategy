/* Hero lineup at game size (phone pixels, 3x CSS): every hero's idle frame drawn by the game's own drawHeroAnim, plus extra
   PNG figures passed in (already scaled to phone pixels).  node dev/heroes/lineup_gamesize.js OUT.png [extra.png:label ...] */
const fs = require("fs"), path = require("path"), ROOT = path.join(__dirname, "../..");
(async () => {
  const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
  const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome";
  const GAME = fs.readFileSync(path.join(ROOT, "test/index.html"), "utf8"), FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8");
  const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 } });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, require(path.join(ROOT, "dev/tests/siteroute.js"))(GAME));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => process.stderr.write("PAGEERR " + e.message + "\n"));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/", { timeout: 180000 }); await P.waitForSelector("#ksAuth .box", { timeout: 120000 });
  await P.fill("#ksE", "line" + process.pid + "@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 120000 }); await P.fill("#ksN", "Line"); await P.click("#ksGo"); await P.waitForTimeout(4000);
  const keys = await P.evaluate(() => Object.keys(HERO_DEFS).filter((k) => HERO_ANIMS[k] && HERO_ANIMS[k].rows && HERO_ANIMS[k].rows.idle && !HERO_DEFS[k].comingSoon).map((k) => [k, HERO_DEFS[k].name.split(" ")[0], HERO_DEFS[k].class]));
  for (let t = 0; t < 3; t++) { await P.evaluate((ks) => ks.forEach(([k]) => { try { const c = document.createElement("canvas").getContext("2d"); drawHeroAnim(c, k, 50, 100, "idle", 1, false, 0); } catch (e) {} }), keys); await P.waitForTimeout(2500); }
  const png = await P.evaluate((ks) => { const DPR = 3, step = 78, W = step * ks.length + 40, H = 150;
    const cv = document.createElement("canvas"); cv.width = W * DPR; cv.height = H * DPR; const c = cv.getContext("2d"); c.scale(DPR, DPR);
    c.fillStyle = "#1d2a3e"; c.fillRect(0, 0, W, H); c.fillStyle = "#3a4a3a"; c.fillRect(0, 118, W, H);
    ks.forEach(([k, n], i) => { try { drawHeroAnim(c, k, 40 + i * step, 118, "idle", 1, false, 0); } catch (e) {} c.fillStyle = "#ddd"; c.font = "8px sans-serif"; c.textAlign = "center"; c.fillText(n, 40 + i * step, 140); });
    return cv.toDataURL("image/png"); }, keys);
  fs.writeFileSync(process.argv[2], Buffer.from(png.split(",")[1], "base64")); console.log(JSON.stringify(keys));
  await b.close();
})();
