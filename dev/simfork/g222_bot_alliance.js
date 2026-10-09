/* v999: Dev Tools > Bot Alliance - a whole alliance of bot cities side by side, at a chosen spot (spreading outward when crowded / at the edge) or a random one; remove one, or all with Destroy All. Run: node dev/simfork/g222_bot_alliance.js */
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
  await P.fill("#ksE", "g222@test.dev"); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
  await P.waitForSelector("#ksN", { timeout: 15000 }); await P.fill("#ksN", "Emp"); await P.click("#ksGo"); await P.waitForTimeout(5000);
  await P.evaluate(() => document.documentElement.classList.remove("ks-noadmin"));
  await P.evaluate(() => devScreenOpen()); await P.waitForTimeout(300);
  await P.click('#devToolsPanel .dt-tab:has-text("Testing")'); await P.click('#devToolsPanel .dt-chip:has-text("Bot Alliance")'); await P.waitForTimeout(300);
  const fill = async (n, name, tag, x, y) => { await P.fill("#devBaCount", String(n)); await P.fill("#devBaAllyName", name); await P.fill("#devBaTag", tag); await P.fill("#devBaX", x == null ? "" : String(x)); await P.fill("#devBaY", y == null ? "" : String(y)); };
  const waitDone = async () => { await P.waitForFunction(() => /✓|Couldn/.test(document.getElementById("devBaStatus").textContent), null, { timeout: 60000 }); await P.waitForTimeout(1500); return P.textContent("#devBaStatus"); };
  const check = (tag) => P.evaluate((tag) => {
    const aid = Object.keys(ALLY.list).find((k) => ALLY.list[k].tag === tag); if (!aid) return { none: true };
    const owners = Object.keys(ALLY.index).filter((o) => ALLY.index[o].aid === aid), tiles = Object.keys(occupiedTileIds).filter((id) => owners.includes(occupiedTileIds[id])).map((id) => id.split(",").map(Number));
    let minGap = 99, maxSpread = 0; for (let i = 0; i < tiles.length; i++) for (let j = i + 1; j < tiles.length; j++) minGap = Math.min(minGap, Math.max(Math.abs(tiles[i][0] - tiles[j][0]), Math.abs(tiles[i][1] - tiles[j][1])));
    const cx = tiles.reduce((s, t) => s + t[0], 0) / tiles.length, cy = tiles.reduce((s, t) => s + t[1], 0) / tiles.length; tiles.forEach((t) => { maxSpread = Math.max(maxSpread, Math.abs(t[0] - cx), Math.abs(t[1] - cy)); });
    const ranks = owners.map((o) => ALLY.index[o].rank).sort((a, b) => b - a), a = ALLY.list[aid];
    return { aid, bot: a.bot, count: a.memberCount, owners: owners.length, tiles: tiles.length, minGap, maxSpread: Math.round(maxSpread), ranks: ranks.slice(0, 4), leaderOk: ALLY.index[a.leader] && ALLY.index[a.leader].rank === 5, name: fetchOwnerProfile(a.leader).name, nearest: tiles.map((t) => t[0] + t[1]).sort((x, y) => x - y)[0] };
  }, tag);
  const o = {};
  /* 1. a corner with no room on two sides: still all 12, spreading outward */
  await fill(12, "Iron Tide", "IRT", 1, 1); await P.click("#devBaGo"); o.s1 = await waitDone(); o.c1 = await check("IRT");
  /* 2. random spot */
  await fill(8, "Storm Crows", "STC", null, null); await P.click("#devBaGo"); o.s2 = await waitDone(); o.c2 = await check("STC");
  /* 3. tag taken / bad tag */
  await fill(3, "Copycats", "IRT", 50, 50); await P.click("#devBaGo"); o.s3 = await waitDone();
  o.list = await P.textContent("#devBaList");
  /* 4. map shows them */
  await P.evaluate((h) => { setScreen("world"); }, null); await P.waitForTimeout(500);
  const home = await P.evaluate(() => ALLY.list[Object.keys(ALLY.list).find((k) => ALLY.list[k].tag === "STC")].home); await P.evaluate((h) => centerMapOnTile(h), home); await P.waitForTimeout(2500);
  await P.screenshot({ path: (process.env.OUT || "/tmp/") + "bot_alliance.png" });
  o.tagsOnMap = await P.evaluate(() => (document.getElementById("mapworld").textContent.match(/\[STC\]/g) || []).length);
  /* 5. remove one, then Destroy All also clears the other */
  await P.evaluate(() => devScreenOpen()); await P.waitForTimeout(300);
  P.once("dialog", (d) => d.accept());
  await P.click('#devBaList [data-badel^="stc_"]'); await P.waitForTimeout(3000); o.afterRemove = await P.evaluate(() => ({ stc: Object.values(ALLY.list).some((a) => a.tag === "STC"), irt: Object.values(ALLY.list).some((a) => a.tag === "IRT"), stcCities: Object.values(occupiedTileIds).filter((x) => /^bot_a/.test(x)).length }));
  await P.evaluate(() => destroyAllBotPlayers()); await P.waitForTimeout(3000);
  o.afterDestroy = await P.evaluate(() => ({ allies: Object.values(ALLY.list).filter((a) => a.bot).length, idx: Object.keys(ALLY.index).filter((k) => /^bot_/.test(k)).length, cities: Object.values(occupiedTileIds).filter((x) => /^bot_/.test(x)).length }));
  console.log(JSON.stringify(o));
  assert.ok(/✓ \[IRT\] made: 12 of 12/.test(o.s1) && o.c1.tiles === 12 && o.c1.owners === 12 && o.c1.minGap >= 3 && o.c1.bot && o.c1.leaderOk && o.c1.ranks[0] === 5 && o.c1.ranks[1] === 4 && o.c1.nearest <= 8, "corner: all 12 placed, spaced, spreading from 1,1");
  assert.ok(o.c1.maxSpread <= 9, "one compact cluster");
  assert.ok(/✓ \[STC\] made: 8 of 8/.test(o.s2) && o.c2.tiles === 8 && o.c2.minGap >= 3 && o.c2.maxSpread <= 6, "random spot: tight cluster");
  assert.ok(o.c1.name && !/^Raider/.test(o.c1.name), "bots have their own names");
  assert.ok(/taken/.test(o.s3), "taken tag refused");
  assert.ok(/\[IRT\] Iron Tide · 12 bots/.test(o.list) && /\[STC\]/.test(o.list), "listed");
  assert.ok(o.tagsOnMap >= 4, "tags show on the map");
  assert.ok(!o.afterRemove.stc && o.afterRemove.irt && o.afterRemove.stcCities === 12, "remove one alliance (and only its cities)");
  assert.ok(o.afterDestroy.allies === 0 && o.afterDestroy.idx === 0 && o.afterDestroy.cities === 0, "Destroy All clears bot alliances too");
  console.log("errs", errs); assert.deepStrictEqual(errs, []); console.log("ALL OK"); await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
