/* v1184 (Harley bug): the Clone Task clone stayed on the field after unequipping Clone Task. Now it leaves as soon as the weapon is unequipped
   (Kessa-style summons that aren't from a weapon are untouched). Run: node dev/simfork/g304_clone_unequip.js */
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
  await P.fill("#ksE", "g304@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Clone"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => { game.state.equippedWeapons = ["clone_task"]; game.state.conquestRoster = ["gareth"]; setScreen("conquest"); });
  const waitFor = (fn, ms) => P.waitForFunction(fn, null, { timeout: ms }).then(() => true, () => false);
  const o = {};
  o.spawned = await waitFor(() => { const C = game.state.idle.clones; return !!C && Object.keys(C).some((k) => !C[k].gerbil && C[k].hp > 0); }, 40000);
  o.before = await P.evaluate(() => Object.keys(game.state.idle.clones || {}));
  await P.evaluate(() => toggleWeaponEquip("clone_task"));
  await P.waitForTimeout(1500);
  o.after = await P.evaluate(() => Object.keys(game.state.idle.clones || {}).filter((k) => game.state.idle.clones[k] && game.state.idle.clones[k].hp > 0));
  console.log(JSON.stringify({ o, errs }));
  await b.close();
  if (!process.env.NOASSERT) {
    assert.deepStrictEqual(errs, []);
    assert(o.spawned && o.before.includes("clone_task"), "clone spawned while equipped");
    assert.deepStrictEqual(o.after, [], "clone gone after unequip");
    console.log("g304 ok");
  }
})().catch((e) => { console.error(e); process.exit(1); });
