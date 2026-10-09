/* v1013: per-skin picture alignment (left/right, up/down, size) set in Dev Tools > Visuals > Base skin alignment, shared with every player; the 3x3 squares don't move.
   Two players on one fake backend. Run: node dev/simfork/g233_skin_align.js */
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(process.env.GAMEFILE || path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] }), errs = [];
  const mk = async (email, name) => {
    const ctx = await b.newContext({ viewport: { width: 430, height: 932 } });
    await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
    await ctx.exposeFunction("__fbcall", call);
    await ctx.route(/mojojo82\.github\.io/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: GAME }));
    await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
    await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(name + ": " + e.message));
    await P.goto("https://mojojo82.github.io/kingdom-strategy/test/"); await P.waitForSelector("#ksAuth .box");
    await P.fill("#ksE", email); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
    await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", name); await P.click("#ksGo"); await P.waitForTimeout(5000);
    return P;
  };
  const A = await mk("g233a@test.dev", "Admin"), B = await mk("g233b@test.dev", "Bravo");
  const home = await A.evaluate(() => { KS_BACKEND.isAdmin = true; game.state.skins.city_titan = 1; setMapCitySkin("titan"); return game.state.homeTileId; });
  await A.waitForTimeout(1500);
  const view = (P, h) => P.evaluate((h) => { cloudDb.doc("players/" + PLAYER_ID + "/assetitems/g233ping").set({ data: String(Date.now()) }); setScreen("world"); setMapZoom(mapZoom * 40 / tilePxZ()); goToWorldTile(h);
    return new Promise((res) => setTimeout(() => { const t = mapTileEls[h], im = t && t.querySelector("img.city-icon-img"); res({ tileLeft: t && t.style.left, tileTop: t && t.style.top, ml: im && im.style.marginLeft, bot: im && im.style.bottom, w: im && im.style.width, al: JSON.stringify(SKIN_ALIGN) }); }, 2000)); }, h);
  const before = await view(B, home);
  /* admin moves the Titan Fountain picture with the sliders */
  await A.evaluate(() => { setScreen("more", "dev"); });
  const setSl = (id, v) => A.evaluate(([id, v]) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event("input")); }, [id, v]);
  await A.evaluate(() => { const s = document.getElementById("devSaSkin"); s.value = "titan"; s.dispatchEvent(new Event("change")); });
  await setSl("devSaX", 0.5); await setSl("devSaY", -0.3); await setSl("devSaS", 1.2);
  await A.waitForTimeout(1500);
  const o = { status: await A.evaluate(() => document.getElementById("devSaStatus").textContent), doc: !!Object.keys(store).find((k) => /assetitems\/_skinalign$/.test(k)) };
  const after = await view(B, home);
  o.before = before; o.after = after;
  /* preview: admin sees another skin on their own base without changing it */
  o.preview = await A.evaluate((h) => { const pv = document.getElementById("devSaPreview"); pv.checked = true; pv.dispatchEvent(new Event("change")); const s = document.getElementById("devSaSkin"); s.value = "mecha"; s.dispatchEvent(new Event("change"));
    const im = mapTileEls[h] && mapTileEls[h].querySelector("img.city-icon-img"); const r = { skinKept: mapCitySkin, usesPreview: !!im }; pv.checked = false; pv.dispatchEvent(new Event("change")); return r; }, home);
  /* v1014: adjust on the World map - panel above the bottom bar, base visible above it with its squares, info card hidden, Done puts it back */
  await A.evaluate(() => { setScreen("more", "dev"); }); await A.waitForTimeout(300);
  await A.evaluate(() => document.getElementById("devSaMap").click()); await A.waitForTimeout(1500);
  o.map = await A.evaluate((h) => { const f = document.getElementById("saFloat"), fr = f.getBoundingClientRect(), t = mapTileEls[h], im = t && t.querySelector("img.city-icon-img"), ir = im && im.getBoundingClientRect();
    return { screen: document.body.dataset.screen, floatShown: getComputedStyle(f).display !== "none", sliders: !!f.querySelector("#devSaX"), infoHidden: getComputedStyle(document.getElementById("tileinfo")).display === "none", baseAbove: ir && ir.bottom <= fr.top + 5 && ir.top >= 0, squares: document.querySelectorAll("#mapworld .tile.fp").length, previewOn: skinAlignPreview }; }, home);
  await A.screenshot({ path: (process.env.OUT || "/tmp/") + "skin_align_map.png" });
  await A.evaluate(() => document.getElementById("devSaDone").click()); await A.waitForTimeout(300);
  o.done = await A.evaluate(() => ({ back: !!document.querySelector("#devSubSkinAlign #devSaX"), floatHidden: document.getElementById("saFloat").style.display === "none", preview: skinAlignPreview, cls: document.body.classList.contains("sa-on") }));
  console.log(JSON.stringify(o));
  assert.ok(/Saved for all players/.test(o.status) && o.doc, "saved to the shared doc");
  assert.ok(/"titan"/.test(after.al), "the other player got the alignment");
  assert.ok(after.tileLeft === before.tileLeft && after.tileTop === before.tileTop, "the 3x3 squares (tile) didn't move");
  assert.ok(after.ml !== before.ml && after.bot !== before.bot && /1\.200/.test(after.w || ""), "the picture moved and grew for the other player too");
  assert.ok(o.preview.skinKept === "titan", "preview doesn't change the real skin");
  assert.ok(o.map.screen === "world" && o.map.floatShown && o.map.sliders && o.map.infoHidden && o.map.baseAbove && o.map.squares >= 8 && o.map.previewOn, "on the map: panel with the sliders, base visible above it with its squares, card hidden, preview on");
  assert.ok(o.done.back && o.done.floatHidden && o.done.preview === null && !o.done.cls, "Done puts the controls back and turns the preview off");
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
