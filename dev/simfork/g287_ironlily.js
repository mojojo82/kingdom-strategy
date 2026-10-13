/* v1149: Iron Lily placeholder hero - in the hero list with still art, full card plays her video (intro once, then loops from 7.625 s), Coming soon / no equip, not on bots. Run: node dev/simfork/g287_ironlily.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
/* headless Chromium has no H.264 (phones do): for the test only, the game's mp4 is swapped for a VP9 webm of the same video */
const WEBM = "data:video/webm;base64," + fs.readFileSync(process.env.WEBM || path.join(__dirname, "media/gareth_card_test.webm")).toString("base64");
const GAME2 = GAME.replace(/data:video\/mp4;base64,[A-Za-z0-9+\/=]+/g, () => WEBM);
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME2 }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "g287@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Lily"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => setScreen("heroes")); await P.waitForTimeout(1200);
  const grid = await P.evaluate(() => { const c = [...document.querySelectorAll(".hcard")].find((e) => /Iron Lily/.test(e.title)); return c ? { img: !!c.querySelector("img.hcard-art") } : null; });
  await P.evaluate(() => openHeroDetail("ironlily")); await P.waitForTimeout(1500);
  const card = await P.evaluate(() => { const v = document.getElementById("hdPortraitVid"); return { title: document.getElementById("hdName").textContent, msk: (document.querySelector(".hc-msk-n") || {}).textContent, btns: [...document.querySelectorAll("#hcActions .hd-actionbtn")].map((b) => b.textContent + (b.disabled ? "(off)" : "")), vid: getComputedStyle(v).display, loop: v.loop, ls: v.__loopStart, w: v.videoWidth }; });
  await P.screenshot({ path: path.join(__dirname, "out_g287_card.png") });
  const looped = await P.evaluate(async () => { const v = document.getElementById("hdPortraitVid"); for (let i = 0; i < 60 && !(v.duration > 0); i++) await new Promise((r) => setTimeout(r, 100)); v.currentTime = v.duration - 0.5; await new Promise((r) => setTimeout(r, 1500)); return { t: v.currentTime, dur: v.duration, paused: v.paused }; });
  const rules = await P.evaluate(() => { game.state.heroes.ironlily.owned = true; const r = game.equipConquestHero("ironlily"); return { equip: r.reason, arena: ARENA_COMBAT_HERO_KEYS.indexOf("ironlily") }; });
  console.log(JSON.stringify({ grid, card, looped, rules, errs })); await b.close();
  if (!process.env.NOASSERT) {
    assert.deepStrictEqual(errs, []); assert(grid && grid.img, "in the hero list with still art");
    assert(card.title === "IRON LILY" && card.msk === "CRIMSON TEMPEST" && card.vid === "block" && !card.loop && card.ls === 7.625, "full card + video");
    assert(card.btns.length === 1 && /Coming soon/.test(card.btns[0]), "coming soon");
    assert(looped.t >= 7.6 && looped.t < looped.dur - 0.2 && !looped.paused, "after the end it jumps back to the loop start and keeps playing");
    assert(rules.equip === "coming_soon" && rules.arena === -1, "no Conquest, not on bots"); console.log("g287 ok");
  }
})().catch((e) => { console.error(e); process.exit(1); });
