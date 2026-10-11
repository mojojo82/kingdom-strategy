/* v1074: Vanaheim test kingdom. Normal sign-ups go to Atlantis; a brand-new player who opens ?k=vanaheim lands in Vanaheim (server1, status "invite");
   an existing player who opens the link stays where they are; the map draws Vanaheim bottom-left of Atlantis (and Atlantis top-right of Vanaheim).
   Run: node dev/simfork/g255_vanaheim.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  async function page(query) {
    const ctx = await b.newContext({ viewport: { width: 430, height: 932 } });
    await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
    await ctx.exposeFunction("__fbcall", call);
    await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
    await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
    await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(e.message));
    await P.goto("https://mojojo82.github.io/kingdom-strategy/test/" + (query || "")); await P.waitForSelector("#ksAuth .box");
    return P;
  }
  async function signUp(P, email, name) {
    await P.fill("#ksE", email); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
    await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", name); await P.click("#ksGo"); await P.waitForTimeout(6000);
  }
  async function info(P) {
    return P.evaluate(() => { try { setScreen("world"); } catch (e) {} mapWorldSizedForTiles = null; try { render(); } catch (e) {}
      return { sid: game.state.serverId, cur: CURRENT_SERVER_ID, home: game.state.homeTileId, labels: [...document.querySelectorAll("#mapBorder .kd-label")].map((e) => e.firstChild.textContent),
        where: Object.fromEntries([...document.querySelectorAll("#mapBorder .kd-label")].map((e) => { const n = mapSizeTiles(), c = tileCenterPx({ x: (n - 1) / 2, y: (n - 1) / 2 }), x = parseFloat(e.style.left), y = parseFloat(e.style.top);
          return [e.firstChild.textContent, (y < c.y - 1 ? "top" : y > c.y + 1 ? "bottom" : "") + "-" + (x < c.x - 1 ? "left" : x > c.x + 1 ? "right" : "")]; })) }; });
  }
  const A = await page(""); await signUp(A, "atl@test.dev", "Atl");
  const a = await info(A);
  const V = await page("?k=Vanaheim"); await signUp(V, "van@test.dev", "Van");
  const v = await info(V);
  const C = await page(""); await signUp(C, "atl2@test.dev", "Atl2");
  const c = await info(C);
  /* existing Atlantis player opens the Vanaheim link: stays in Atlantis */
  const A2 = await page("?k=vanaheim"); await A2.fill("#ksE", "atl@test.dev"); await A2.fill("#ksP", "secret123"); await A2.click("#ksIn"); await A2.waitForTimeout(7000);
  const a2 = await info(A2);
  const reg = store["envs/test/servers/server1"], reg0 = store["envs/test/servers/server0"];
  const vCity = Object.keys(store).filter((k) => k.startsWith("envs/test/servers/server1/cities/"));
  console.log(JSON.stringify({ a, v, c, a2, reg, reg0: reg0 && { status: reg0.status, playerCount: reg0.playerCount }, vCity: vCity.length, errs }, null, 1));
  assert.strictEqual(a.sid, "server0"); assert.ok(a.labels.includes("Vanaheim") && a.labels.includes("Kingdom 1"), "Atlantis shows both neighbours");
  assert.deepStrictEqual(a.where, { "Vanaheim": "bottom-left", "Kingdom 1": "top-left" }, "iso placement from Atlantis");
  assert.deepStrictEqual(v.where, { "Atlantis": "top-right", "Kingdom 1": "top-" }, "iso placement from Vanaheim");
  assert.strictEqual(v.sid, "server1"); assert.strictEqual(v.cur, "server1"); assert.deepStrictEqual(v.labels.sort(), ["Atlantis", "Kingdom 1"], "Vanaheim shows Atlantis and the Kingdom 1 placeholder");
  assert.ok(v.home && vCity.length === 1, "Vanaheim player's base is stored in Vanaheim");
  assert.ok(reg && reg.status === "invite" && reg.playerCount === 1 && reg.name === "Vanaheim", "registry: invite-only, 1 player");
  assert.strictEqual(c.sid, "server0", "normal sign-up after Vanaheim exists still goes to Atlantis");
  assert.strictEqual(a2.sid, "server0", "existing player isn't moved by the link");
  assert.strictEqual(store["envs/test/servers/server1"].playerCount, 1);
  assert.deepStrictEqual(errs, []);
  console.log("g255 OK");
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
