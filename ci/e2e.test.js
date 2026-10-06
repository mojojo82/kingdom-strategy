// End-to-end: the REAL game (test/index.html) in headless Chromium, signed in to Firebase's local emulators with the REAL rules
// and Cloud Functions. Plays through the multiplayer flows and fails if any of them is blocked by the rules (or anything errors).
"use strict";
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");

const ROOT = path.join(__dirname, "..");
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split("?")[0]); let f = path.join(ROOT, u.endsWith("/") ? u + "index.html" : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": f.endsWith(".html") ? "text/html" : f.endsWith(".json") ? "application/json" : "application/octet-stream" }); fs.createReadStream(f).pipe(res);
}).listen(8000);
const URL = "http://127.0.0.1:8000/test/?emu=1";
let passed = 0, failed = 0; const problems = [];
async function t(name, fn) { try { await fn(); passed++; console.log("ok   -", name); } catch (e) { failed++; console.log("FAIL -", name, "\n      ", e && (e.message || e)); } }
function check(c, msg) { if (!c) throw new Error(msg); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch();
  async function player(tag, email, name) {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } }), p = await ctx.newPage();
    p.on("console", (m) => { const s = m.text(); if (/insufficient permissions|PERMISSION_DENIED|permission-denied/i.test(s)) problems.push(tag + " PERMISSION: " + s.slice(0, 300)); else if (m.type() === "error" && !/favicon|Failed to load resource|fonts\.g/i.test(s)) problems.push(tag + " console error: " + s.slice(0, 300)); });
    p.on("pageerror", (e) => problems.push(tag + " page error: " + e.message));
    await p.goto(URL); await p.waitForSelector("#ksAuth .box", { timeout: 60000 });
    await p.fill("#ksE", email); await p.fill("#ksP", "secret123"); await p.click("#ksUp");
    await p.waitForSelector("#ksN", { timeout: 60000 }); await p.fill("#ksN", name); await p.click("#ksGo");
    await p.waitForFunction(() => window.KS_BACKEND && KS_BACKEND.status === "ready" && typeof PLAYER_ID !== "undefined" && PLAYER_ID === KS_BACKEND.uid && game.state.homeTileId, null, { timeout: 60000 });
    await sleep(3000);
    return p;
  }
  const A = await player("A", "alice@e2e.dev", "Alice"), B = await player("B", "bob@e2e.dev", "Bob");

  await t("both players signed in with a home city", async () => {
    const a = await A.evaluate(() => ({ id: PLAYER_ID, home: game.state.homeTileId, gems: game.state.gems })), b = await B.evaluate(() => ({ id: PLAYER_ID, home: game.state.homeTileId }));
    check(a.id && b.id && a.id !== b.id && a.home && b.home, JSON.stringify({ a, b }));
  });
  await t("world chat between players", async () => {
    await A.evaluate(() => { chatTab = "world"; document.getElementById("worldChatInput").value = "hello from Alice"; sendWorldChatMessage(); });
    await sleep(2500);
    const seen = await B.evaluate(() => getChatMessages().map((m) => m.name + ":" + m.text));
    check(seen.indexOf("Alice:hello from Alice") !== -1, JSON.stringify(seen));
  });
  await t("level gems paid by the server", async () => {
    await A.evaluate(() => { game.state.idle.levelNum = 3; ksClaimLoop(); });
    await sleep(8000);
    const g = await A.evaluate(() => game.state.gems); check(g === 100, "gems " + g);
  });
  await t("alliance: create, join, accept", async () => {
    check(await B.evaluate(() => createAlliance("E2E Wolves", "ewlf")), "create failed");
    await sleep(2500);
    const aid = await A.evaluate(() => Object.keys(ALLY.list)[0]); check(aid, "A can't see the alliance");
    check(await A.evaluate((x) => joinAlliance(x), aid), "join failed");
    await sleep(2500);
    const aPid = await A.evaluate(() => PLAYER_ID);
    check(await B.evaluate((x) => acceptJoinRequest(x), aPid), "accept failed");
    await sleep(2500);
    const my = await A.evaluate(() => ALLY.my && ALLY.my.tag); check(my === "EWLF", "A alliance " + my);
  });
  await t("no friendly fire; allies put fires out for free", async () => {
    const home = await A.evaluate(() => game.state.homeTileId);
    const h = await B.evaluate((x) => hitBase(x), home); check(h.before === h.after, "ally hit landed: " + JSON.stringify(h));
  });
  const C = await player("C", "carl@e2e.dev", "Carl");
  await t("enemy hit burns the base; owner pays 100 gems to put it out", async () => {
    const home = await A.evaluate(() => game.state.homeTileId);
    const h = await C.evaluate((x) => hitBase(x), home); check(h.before === 10000 && h.after === 9000, JSON.stringify(h));
    await sleep(2500);
    check(await A.evaluate(() => isBaseBurning(game.state.homeTileId)), "A doesn't see the fire");
    await A.evaluate(() => extinguishMyBase()); await sleep(2500);
    const r = await A.evaluate(() => ({ gems: game.state.gems, burning: isBaseBurning(game.state.homeTileId) }));
    check(r.gems === 0 && !r.burning, JSON.stringify(r));
  });
  await t("teleport moves the city (server-side)", async () => {
    const to = await A.evaluate(() => { var t = pickRandomUnclaimedEmptyTile(); return t && t.id; }); check(to, "no empty tile");
    const r = await A.evaluate((x) => teleportTo(x), to); check(r && r.ok, JSON.stringify(r));
    check(await A.evaluate((x) => game.state.homeTileId === x, to), "home not moved");
  });
  await t("progress saves to the cloud shortly after an action", async () => {
    await A.evaluate(() => { game.state.resources.gold += 777; }); await A.mouse.click(700, 450); await A.evaluate(() => persist());
    await sleep(3000);
    const ok = await A.evaluate(async () => { const s = await cloudDb.doc(cloudSaveDoc()).get(); return s.exists && s.data().resources.gold === game.state.resources.gold; });
    check(ok, "cloud save not updated");
  });
  await t("cheats are refused: own wallet, other player's save, painting the map", async () => {
    const r = await A.evaluate(async (bId) => {
      const out = {};
      try { await cloudDb.doc("players/" + PLAYER_ID + "/wallet/main").set({ gems: 999999 }); out.wallet = "ALLOWED"; } catch (e) { out.wallet = "denied"; }
      try { await cloudDb.doc("players/" + bId + "/save/main").set({ x: 1 }); out.otherSave = "ALLOWED"; } catch (e) { out.otherSave = "denied"; }
      try { await cloudDb.doc("terrain/9_9").set({ s: "0", t: 1 }); out.terrain = "ALLOWED"; } catch (e) { out.terrain = "denied"; }
      return out;
    }, await B.evaluate(() => PLAYER_ID));
    check(r.wallet === "denied" && r.otherSave === "denied" && r.terrain === "denied", JSON.stringify(r));
    problems.splice(0, problems.length, ...problems.filter((x) => !/PERMISSION/.test(x))); // these three denials were expected
  });
  await t("dev tools hidden for normal players", async () => {
    const d = await A.evaluate(() => { const el = document.querySelector(".idle-util-icons"); return el ? getComputedStyle(el).display : "none"; });
    check(d === "none", "dev icons display: " + d);
  });
  await t("no permission errors or page errors during play", async () => { check(!problems.length, "\n        " + problems.slice(0, 15).join("\n        ")); });

  console.log("\n" + passed + " passed, " + failed + " failed");
  await browser.close(); server.close(); process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
