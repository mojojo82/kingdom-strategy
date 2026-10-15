/* v1188 (Harley): the keyword "Summon link" shows in pink wherever weapon text is shown (Weapon Info popup + weapons list).
   Run: node dev/simfork/g308_summon_link_pink.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
  await ctx.exposeFunction("__fbcall", call);
  await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "g308@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Pinky"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  const v = await P.evaluate(() => {
    openWeaponInfo("railgun");
    const a = document.querySelector("#weaponInfoOverlay .wi-desc .kw-summon");
    const info = { popup: a && a.textContent, popupColor: a && getComputedStyle(a).color };
    closeWeaponInfo(); setScreen("more", "weapons"); renderWeapons();
    const l = document.querySelector(".weapon-desc .kw-summon");
    info.list = l && l.textContent; info.listColor = l && getComputedStyle(l).color;
    info.listText = l && l.closest(".weapon-desc").textContent.includes("Summon link: while one");
    return info;
  });
  console.log(JSON.stringify({ v, errs }));
  await b.close();
  if (!process.env.NOASSERT) {
    assert.deepStrictEqual(errs, []);
    assert.strictEqual(v.popup, "Summon link"); assert.strictEqual(v.popupColor, "rgb(255, 122, 217)");
    assert.strictEqual(v.list, "Summon link"); assert.strictEqual(v.listColor, "rgb(255, 122, 217)"); assert(v.listText);
    console.log("g308 ok");
  }
})().catch((e) => { console.error(e); process.exit(1); });
