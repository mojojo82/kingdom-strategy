// v1705: Alliance Siege troop rallies in the real TEST game (headless, fake Firebase + local functions), two players:
// leader starts a rally with a formation (its heroes lead), a member joins with Reserve troops, troops leave both cities, the leader's game fights
// the one battle and reports it, shares split, troops come home. node dev/tests/siege_troops_game_test.js   (SHOT=dir for screenshots)
const fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(process.env.PW_PATH || "playwright");
const C = require(path.join(ROOT, "functions/core.js")), R = C.envRoot("test");
const FAKE = fs.readFileSync(path.join(ROOT, "dev/tests/fakefb.js"), "utf8"), GAME = fs.readFileSync(path.join(ROOT, "test/index.html"), "utf8");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
const lo = C.normalizeLiveops({}); lo.sg.wait = 10; store[R + "config/liveops"] = JSON.parse(JSON.stringify(lo));
const SHOT = process.env.SHOT;
(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ["--no-sandbox"] } : {}), errs = [];
  const page = async (email, name) => {
    const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: SHOT ? 2 : 1 });
    await ctx.exposeFunction("__fbstore", (op, k, v) => { if (op === "set") store[k] = JSON.parse(v); else if (op === "del") delete store[k]; return JSON.stringify(store); });
    await ctx.exposeFunction("__fbcall", call);
    await ctx.route(/mojojo82\.github\.io/, require(path.join(__dirname, "siteroute.js"))(GAME));
    await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE }));
    await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    const P = await ctx.newPage(); P.on("pageerror", (e) => errs.push(name + ": " + e.message + " @ " + String(e.stack || "").split("\n").slice(1, 3).join(" / ")));
    await P.goto("https://mojojo82.github.io/kingdom-strategy/test/", { timeout: 180000 }); await P.waitForSelector("#ksAuth .box", { timeout: 120000 });
    await P.fill("#ksE", email); await P.fill("#ksP", "secret123"); await P.click("#ksUp");
    await P.waitForSelector("#ksN", { timeout: 60000 }); await P.fill("#ksN", name); await P.click("#ksGo"); await P.waitForTimeout(8000);
    return P;
  };
  const L = await page("lead@test.dev", "Leader"), M = await page("mem@test.dev", "Member");
  const out = {}, nt = async () => { for (const p of [L, M]) await p.evaluate(() => window.__fbNotify && __fbNotify()); await L.waitForTimeout(600); }; /* the fake server doesn't push other players' / functions' writes - nudge the listeners */
  /* leader: Command Center 10, two Lv40 heroes in Formation 1 holding T6 troops; member: T5 cavalry in the Reserve */
  await L.evaluate(() => { const S = game.state; S.buildings.commandcenter.level = 10; ["gareth", "lyra"].forEach((k) => { S.heroes[k] = Object.assign(S.heroes[k] || {}, { owned: true, level: 40, stars: 10 }); });
    S.troops.infantry_t6 = 9000; S.troops.archer_t6 = 9000; const f = S.formations[0]; f.heroKeys = ["gareth", "lyra"]; f.troops = { infantry_t6: 9000, archer_t6: 9000 }; f.held = { infantry_t6: 9000, archer_t6: 9000 }; persist(); });
  await M.evaluate(() => { const S = game.state; S.buildings.commandcenter.level = 5; S.troops.cavalry_t5 = 12000; S.formations.forEach((f) => { f.held = {}; }); persist(); });
  out.ally = await L.evaluate(() => createAlliance("Siege Test", "SGT"));
  await L.waitForTimeout(2500);
  const aid = Object.keys(store).filter((k) => k.indexOf(R + "alliances/") === 0 && k.split("/").length === R.split("/").length + 1)[0].split("/").pop();
  store[R + "alliances/" + aid].joinMode = "open";
  await M.waitForTimeout(2500); out.join = await M.evaluate((aid) => { ALLY.list[aid] = ALLY.list[aid] || {}; ALLY.list[aid].joinMode = "open"; return joinAlliance(aid); }, aid);
  await M.waitForTimeout(3000);
  out.start = await L.evaluate(() => new Promise((res) => { evWinOpen("sg"); const spn = sgSpot(); sgCall("siegeSchedule", { now: true, x: spn.x, y: spn.y }, (r) => res(!!r.ok)); }));
  await L.waitForTimeout(1500); await nt();
  /* leader: Start a rally -> send-troops box (Formation 1 picked, Max filled) */
  out.dbg = await L.evaluate(() => ({ aid: SG.aid, my: ALLY.my, hunts: SG.hunts.length, hid: SG.hid, act: !!sgActive(), tab: EVW.tab, note: EVW.note, path: allyPath("siege/" + SG.aid) })); out.keys = Object.keys(store).filter((k) => k.indexOf("siege") >= 0); console.log(JSON.stringify(out));
  await L.evaluate(() => { evWinOpen("sg"); document.querySelector("#evWin [data-sgrally]").click(); }); await L.waitForTimeout(800);
  out.leaderBox = await L.evaluate(() => ({ title: document.querySelector("#evWin .sgpick .t").textContent, rows: [].map.call(document.querySelectorAll("#evWin [data-sgpn]"), (i) => i.getAttribute("data-sgpn") + "=" + i.value), sum: document.querySelector("#evWin [data-sgptot]").textContent, room: sgPickRoom(), cap: game.marchCapacity(["gareth", "lyra"]) }));
  if (SHOT) await L.screenshot({ path: path.join(SHOT, "1_leader_box.png") });
  await L.evaluate(() => document.querySelector("#evWin [data-sgpgo]").click()); await L.waitForTimeout(3500);
  const rid = Object.keys(store).filter((k) => k.indexOf("/r/") > 0 && k.indexOf("siege/") > 0)[0];
  await nt(); out.rally = { cap: store[rid].cap, sent: store[rid].sent, heroes: store[rid].heroes, armies: store[rid].armies };
  out.leaderHome = await L.evaluate(() => ({ inf: game.state.troops.infantry_t6, arc: game.state.troops.archer_t6, held: game.state.formations[0].held, out: game.state.sgOut.length }));
  /* member: Join -> Reserve troops, Max */
  await M.evaluate(() => { evWinOpen("sg"); }); await M.waitForTimeout(1500);
  await M.evaluate(() => document.querySelector("#evWin [data-sgjoin]").click()); await M.waitForTimeout(800);
  out.memberBox = await M.evaluate(() => ({ title: document.querySelector("#evWin .sgpick .t").textContent, fi: SG.pick.fi, rows: [].map.call(document.querySelectorAll("#evWin [data-sgpn]"), (i) => i.getAttribute("data-sgpn") + "=" + i.value), room: sgPickRoom() }));
  await M.evaluate(() => { const i = document.querySelector('#evWin [data-sgpn="cavalry_t5"]'); i.value = "2000"; i.dispatchEvent(new Event("input", { bubbles: true })); }); /* sends only part */
  if (SHOT) await M.screenshot({ path: path.join(SHOT, "2_member_box.png") });
  await M.evaluate(() => document.querySelector("#evWin [data-sgpgo]").click()); await M.waitForTimeout(3500);
  await nt(); out.memberSent = store[rid].armies; out.memberHome = await M.evaluate(() => game.state.troops.cavalry_t5);
  if (SHOT) { await L.evaluate(() => evWinRender(true)); await L.waitForTimeout(500); await L.screenshot({ path: path.join(SHOT, "3_rally_list.png") }); }
  /* countdown (10 s) -> the leader's game fights and reports */
  for (let i = 0; i < 16; i++) { await L.waitForTimeout(1000); await nt(); }
  out.hit = { done: store[rid].done, hit: store[rid].hit, shares: store[rid].shares };
  out.fight = await L.evaluate((rid) => { const o = SG.fights[rid.split("/").pop()]; return o ? { total: o.total, troopPart: Math.round(o.troopPart * 100) + "%", heroes: o.heroes, survived: o.survived, secs: o.secs } : null; }, rid);
  for (let i = 0; i < 4; i++) { await L.waitForTimeout(1000); await nt(); }
  out.leaderBack = await L.evaluate(() => ({ inf: game.state.troops.infantry_t6, arc: game.state.troops.archer_t6, held: game.state.formations[0].held, out: game.state.sgOut.length }));
  out.memberBack = await M.evaluate(() => ({ cav: game.state.troops.cavalry_t5, out: game.state.sgOut.length }));
  if (SHOT) { await M.evaluate(() => evWinRender(true)); await M.waitForTimeout(500); await M.screenshot({ path: path.join(SHOT, "4_after_hit.png") }); }
  /* leader offline: another member's game fights the rally from the leader's save (same seed) - should land close to the leader's own result */
  out.fromSave = await M.evaluate((rid) => { const id = rid.split("/").pop(); return cloudDb.doc(rid.replace(/^envs\/test\//, "")).get().then((sn) => { const r = Object.assign({ id }, sn.data()); return fetchSaveForOwner(r.leader).then((sv) => { const sim = createGame({ mapSize: 3, seed: 1 }); sim.loadState(sv); return sgRallyBattle(r, sim).total; }); }); }, rid);
  out.errors = errs; console.log(JSON.stringify(out, null, 1));
  assert.ok(out.rally.sent > 0 && out.leaderHome.out === 1, "leader troops out"); assert.strictEqual(out.memberSent[Object.keys(out.memberSent).find((u) => out.memberSent[u].cavalry_t5)].cavalry_t5, 2000);
  assert.strictEqual(out.memberHome, 10000); assert.ok(out.hit.done && out.hit.hit > 0, "rally hit"); assert.strictEqual(out.memberBack.cav, 12000); assert.strictEqual(out.leaderBack.inf, 9000); assert.strictEqual(out.leaderBack.out, 0);
  assert.ok(out.fromSave > 0 && Math.abs(out.fromSave - out.hit.hit) / out.hit.hit < 0.25, "fight from the leader's save");
  assert.deepStrictEqual(errs, []); console.log("siege troops game test passed"); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
