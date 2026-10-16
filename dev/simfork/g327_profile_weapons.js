/* v1210 (Harley): the Overlord Profile ship shows the equipped weapons' barrels like Conquest. For each skin: equip Missiles + Laser + Railgun,
   open the profile, check the ship picture is the ship+barrels composite; with no barrel weapons it's the plain ship.
   SHOTS=dir saves profile + Conquest pictures per skin. Run: node dev/simfork/g327_profile_weapons.js */
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
  await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
  await P.fill("#ksE", "g327@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Guns"); await P.click("#ksGo"); await P.waitForTimeout(6000);
  const skins = await P.evaluate(() => FORTRESS_SKINS.map((s) => s.id)), out = {};
  for (const sk of skins) {
    for (const weap of [["missile_barrage", "laser_beam", "railgun"], ["droid_call"]]) {
      const r = await P.evaluate(([sk, weap]) => { game.state.fortressSkin = sk; game.state.equippedWeapons = weap; closeGovProfile(); openGovProfile(); drawGovScene();
        const el = document.getElementById("gpShip"); return { composite: el.src.indexOf("data:image/png") === 0, plain: el.src === fortressGovImg().src, w: el.style.width }; }, [sk, weap]);
      out[sk + "/" + weap.length] = r;
      if (process.env.SHOTS && weap.length === 3) {
        await P.waitForTimeout(300); await P.screenshot({ path: process.env.SHOTS + "/profile_" + sk + ".png", clip: { x: 0, y: 60, width: 430, height: 480 } });
        await P.evaluate(() => { closeGovProfile(); try { setScreen("conquest"); } catch (e) {} }); await P.waitForTimeout(1200);
        const cv = await P.evaluate(() => { const c = document.getElementById("idleCanvas") || document.querySelector("canvas"); const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
        await P.screenshot({ path: process.env.SHOTS + "/conquest_" + sk + ".png", clip: { x: cv.x, y: cv.y, width: Math.min(430, cv.w), height: Math.min(400, cv.h) } });
        await P.evaluate(() => { try { setScreen("city"); } catch (e) {} });
      }
    }
  }
  console.log(JSON.stringify({ out, errs }));
  await b.close();
  assert.deepStrictEqual(errs, []);
  for (const sk of skins) { assert(out[sk + "/3"].composite, sk + ": barrels drawn on the profile ship"); assert(out[sk + "/1"].plain, sk + ": no barrel weapons = plain ship"); }
  console.log("g327 ok");
})().catch((e) => { console.error(e); process.exit(1); });
