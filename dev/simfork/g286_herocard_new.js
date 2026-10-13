/* v1140: the new hero card (Harley's reference frame): fits the phone width, tabs work, buttons work, video/sheet/still/placeholder portraits, no errors. Screenshots out_g286_*.png. Run: node dev/simfork/g286_herocard_new.js */
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
  await P.fill("#ksE", "g286@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Card"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => { game.state.heroes.kessa.owned = true; game.state.idle.conquestBooks = 30; game.state.idle.valor = 1e6; setScreen("heroes"); }); await P.waitForTimeout(1500);
  const shot = (n) => P.screenshot({ path: path.join(__dirname, "out_g286_" + n + ".png") });
  const info = () => P.evaluate(() => { const c = document.getElementById("hcCard").getBoundingClientRect(), v = document.getElementById("hdPortraitVid"); return { w: Math.round(c.width), h: Math.round(c.height), left: Math.round(c.left), title: document.getElementById("hdName").textContent, rows: document.querySelectorAll(".hc-row").length, btns: [...document.querySelectorAll("#hcActions .hd-actionbtn")].map((b) => b.textContent), sk: document.querySelectorAll(".hc-sk").length, msk: (document.querySelector(".hc-msk-n") || {}).textContent, vid: v && getComputedStyle(v).display !== "none", tab: (document.querySelector(".hd-tab.active") || {}).textContent }; });
  const out = {};
  await P.evaluate(() => openHeroDetail("gareth")); await P.waitForTimeout(1200); out.stats = await info(); await shot("stats");
  const lv0 = await P.evaluate(() => game.state.heroes.gareth.level);
  await P.evaluate(() => [...document.querySelectorAll("#hcActions .hd-actionbtn")][0].click()); await P.waitForTimeout(300);
  out.levelUp = [lv0, await P.evaluate(() => game.state.heroes.gareth.level), await P.evaluate(() => document.getElementById("hdName").textContent)];
  await P.evaluate(() => [...document.querySelectorAll(".hd-tab")][1].click()); await P.waitForTimeout(500); out.skills = await info(); out.expHidden = await P.evaluate(() => !document.getElementById("hdExpToggle")); await P.evaluate(() => { const t = document.getElementById("devHcExpToggle"); t.checked = true; t.onchange({ target: t }); }); out.expShown = await P.evaluate(() => !!document.getElementById("hdExpToggle")); await P.evaluate(() => { const t = document.getElementById("devHcExpToggle"); t.checked = false; t.onchange({ target: t }); }); await shot("skills");
  await P.evaluate(() => [...document.querySelectorAll(".hd-tab")][2].click()); await P.waitForTimeout(500); out.gear = await info(); await shot("gear");
  await P.evaluate(() => openHeroDetail("kessa")); await P.waitForTimeout(1500); out.kessa = await info(); await shot("kessa");
  out.kessaCanvas = await P.evaluate(() => { const c = document.getElementById("hdPortraitAnim"); return { shown: getComputedStyle(c).display, w: c.width, h: c.height }; });
  const gov = await P.evaluate(() => HERO_ORDER.find((k) => HERO_DEFS[k].class === "governor")); await P.evaluate((k) => openHeroDetail(k), gov); await P.waitForTimeout(800); out.gov = await info(); await shot("overlord");
  const un = await P.evaluate(() => HERO_ORDER.find((k) => !game.state.heroes[k].owned && HERO_DEFS[k].class !== "governor")); await P.evaluate((k) => openHeroDetail(k), un); await P.waitForTimeout(800); out.unowned = await info(); await shot("unowned");
  await P.click("#hdNavRight"); await P.waitForTimeout(500); out.nav = await P.evaluate(() => heroDetailKey);
  await P.evaluate(() => openHeroDetail("gareth")); await P.waitForTimeout(500);
  const tw = () => P.evaluate(() => getComputedStyle(document.querySelector(".hc-title")).transform);
  out.fontOff = await tw(); await P.evaluate(() => { const t = document.getElementById("devHcFontToggle"); t.checked = true; t.onchange({ target: t }); }); await P.waitForTimeout(200); out.fontOn = await tw(); await shot("plainfont");
  await P.evaluate(() => { const t = document.getElementById("devHcFontToggle"); t.checked = false; t.onchange({ target: t }); });
  out.fonts = await P.evaluate(() => { document.body.setAttribute("data-bodyfont", "chakra"); return [getComputedStyle(document.querySelector(".hc-title")).fontFamily, getComputedStyle(document.querySelector("#hcActions .hd-actionbtn")).fontFamily, getComputedStyle(document.querySelector(".mm-tile") || document.body).fontFamily]; });
  await P.click("#hdClose"); await P.waitForTimeout(300); out.closed = await P.evaluate(() => getComputedStyle(document.getElementById("heroDetailOverlay")).display);
  console.log(JSON.stringify(out, null, 1), JSON.stringify(errs)); await b.close();
  if (!process.env.NOASSERT) {
    assert.deepStrictEqual(errs, []);
    assert(out.stats.w > 380 && out.stats.w <= 431 && out.stats.left >= 0, "card fits the phone width");
    assert(out.stats.msk === "SHIELD SLAM" && out.gear.btns.length === 3, "main skill + buttons on every tab"); assert(out.stats.rows === 3 && out.stats.btns.length === 3 && out.stats.vid && /^\[Lv\.\d+\] GARETH$/.test(out.stats.title), "stats tab");
    assert(out.levelUp[1] === out.levelUp[0] + 1 && out.levelUp[2].indexOf("[Lv." + out.levelUp[1] + "]") === 0, "level up works and the title follows");
    assert(out.expHidden && out.expShown, "Expedition hidden by default, Dev Tools brings it back"); assert(out.skills.sk >= 2 && out.skills.tab === "Skills" && out.gear.tab === "Gear", "tabs");
    assert(out.kessa.vid && out.kessaCanvas.shown === "none", "Kessa plays her video (v1144)");
    assert(out.fontOff === "none" && out.fontOn !== "none", "dev font switch"); assert(/apple-system/.test(out.fonts[0]) && /apple-system/.test(out.fonts[1]) && /Chakra/.test(out.fonts[2]), "card has its own font, game keeps Chakra"); assert(out.gov.rows >= 1 && out.unowned.btns.length === 1 && out.closed === "none", "overlord / unowned / close"); console.log("g286 ok");
  }
})().catch((e) => { console.error(e); process.exit(1); });
