/* v995: Security panel server side - flags + snapshots, overview/feed, actions (dismiss/watch/trust/restrict/suspend/ban/rollback), auto-rollback
   switch + tuned limits, audit log, banned players refused by the server. Runs the REAL functions/index.js in node. Run: node dev/simfork/g218_security_server.js */
const assert = require("assert"), path = require("path");
const ADMIN = require(path.join(__dirname, "../../functions/admins.json"))[0];
(async () => {
  const store = {}, call = require(path.join(__dirname, "../tests/fnrunner.js"))(store);
  const adm = JSON.stringify({ uid: ADMIN, token: { firebase: { sign_in_provider: "google.com" } } }), pl = (u) => JSON.stringify({ uid: u, token: { firebase: { sign_in_provider: "password" } } });
  const A = async (name, data) => { const r = JSON.parse(await call(name, JSON.stringify(Object.assign({ env: "test" }, data || {})), adm)); if (r.error) throw new Error(name + ": " + r.error.message); return r.data; };
  const P = async (u, name, data) => JSON.parse(await call(name, JSON.stringify(Object.assign({ env: "test" }, data || {})), pl(u)));
  const R = "envs/test/", T = "onSaveWriteTest", t0 = 1.9e12;
  const save = (gold, ch) => ({ resources: { food: 500, wood: 500, stone: 300, gold }, idle: { chapter: ch || 1, levelNum: 1 } });
  const trig = (uid, b, a, tB, tA) => call.trigger(T, uid, b, a, tB, tA);
  /* a cheat jump -> flag + snapshot of the good save */
  store[R + "players/player1/save/main"] = save(9e9);
  await trig("player1", save(100), save(9e9), t0, t0 + 30000);
  let f = store[R + "acplayers/player1"]; assert.ok(f && f.count === 1 && f.status === "open" && f.snapAt === t0, JSON.stringify(f));
  assert.strictEqual(store[R + "acsnap/player1"].save.resources.gold, 100, "snapshot = save before the flag");
  /* a second flag in the same episode keeps the FIRST good save */
  await trig("player1", save(9e9), save(9e10), t0 + 30000, t0 + 60000);
  assert.strictEqual(store[R + "acsnap/player1"].save.resources.gold, 100); assert.strictEqual(store[R + "acplayers/player1"].count, 2);
  /* overview */
  const ov = await A("adminSecOverview");
  assert.ok(ov.feed.length >= 2 && ov.players[0].uid === "player1" && ov.summary.open === 1 && ov.config.autoRevert === false && ov.labels.res && ov.defaults.res.perSec === 200, JSON.stringify(ov.summary));
  /* players can't use admin tools */
  assert.ok(/admin only/.test((await P("player2", "adminSecOverview")).error.message));
  /* watch / trust / restrict / dismiss */
  await A("adminSecAction", { uid: "player1", action: "watch" }); assert.strictEqual(store[R + "acplayers/player1"].status, "watch");
  await A("adminSecAction", { uid: "player1", action: "trust" }); assert.strictEqual(store[R + "acplayers/player1"].trusted, true);
  await A("adminSecAction", { uid: "player1", action: "restrict" }); assert.strictEqual(store[R + "acplayers/player1"].restricted, true);
  assert.ok(/restricted/.test((await P("player1", "claimEvent", { event: "x", idx: 0 })).error.message), "restricted: no event rewards");
  await A("adminSecAction", { uid: "player1", action: "unrestrict" }); await A("adminSecAction", { uid: "player1", action: "untrust" });
  /* suspend -> the server refuses the player's calls; bad hours refused; unsuspend */
  assert.ok(/hours/.test(await A("adminSecAction", { uid: "player1", action: "suspend", hours: 0 }).catch((e) => e.message)));
  const s1 = await A("adminSecAction", { uid: "player1", action: "suspend", hours: 3, note: "duped gold" });
  assert.ok(s1.ban.kind === "suspend" && s1.ban.untilMs > Date.now() + 2.9 * 3600e3 && s1.ban.reason === "duped gold");
  assert.ok(/suspended/.test((await P("player1", "claimLevel", { chapter: 1, levelNum: 1 })).error.message), "suspended player refused");
  await A("adminSecAction", { uid: "player1", action: "unsuspend" }); assert.ok(!store[R + "bans/player1"]);
  await A("adminSecAction", { uid: "player1", action: "ban" }); assert.strictEqual(store[R + "bans/player1"].kind, "ban");
  assert.ok(/banned/.test((await P("player1", "claimLevel", { chapter: 1, levelNum: 1 })).error.message));
  await A("adminSecAction", { uid: "player1", action: "unban" });
  /* rollback: the pre-flag save comes back, the cheated one is backed up, a short write lock lands, the flag is closed */
  const rb = await A("adminSecAction", { uid: "player1", action: "rollback" });
  assert.strictEqual(store[R + "players/player1/save/main"].resources.gold, 100);
  const bk = Object.keys(store).filter((k) => k.indexOf(R + "players/player1/save/backup_") === 0); assert.ok(bk.length === 1 && store[bk[0]].resources.gold === 9e9, "cheated save backed up");
  assert.ok(rb.ban.kind === "restore" && rb.ban.untilMs > Date.now()); assert.strictEqual(store[R + "acplayers/player1"].status, "dismissed");
  assert.ok(/no_snapshot/.test(await A("adminSecAction", { uid: "nobody", action: "rollback" }).catch((e) => e.message)));
  assert.ok(/admin account/.test(await A("adminSecAction", { uid: ADMIN, action: "ban" }).catch((e) => e.message)));
  assert.ok(/unknown action/.test(await A("adminSecAction", { uid: "player1", action: "nuke" }).catch((e) => e.message)));
  /* after a dismiss, the next flag starts a new episode with a fresh snapshot */
  await trig("player1", save(200), save(8e9), t0 + 90000, t0 + 120000);
  assert.strictEqual(store[R + "acsnap/player1"].save.resources.gold, 200); assert.strictEqual(store[R + "acplayers/player1"].status, "open");
  /* config: auto-rollback + tightened limit */
  const c1 = await A("adminSecConfig", { autoRevert: true, limits: { res: { base: 1000 } } });
  assert.ok(c1.config.autoRevert === true && c1.config.limits.res.base === 1000 && c1.config.changed.res.base === 1000);
  store[R + "players/player2/save/main"] = save(60000);
  await trig("player2", save(100), save(60000), t0, t0 + 60000); /* 60k gold in 60 s: fine by default, over the tightened limit */
  assert.ok(store[R + "acplayers/player2"] && store[R + "acplayers/player2"].reverted === 1, "flagged with the tuned limit and reverted");
  assert.strictEqual(store["players/player2/save/main"].resources.gold, 100, "auto-rollback put the save back"); /* fnrunner's trigger ref writes to the un-prefixed path */
  await A("adminSecAction", { uid: "player2", action: "trust" });
  delete store["players/player2/save/main"];
  await trig("player2", save(100), save(70000), t0 + 60000, t0 + 120000);
  assert.ok(!store["players/player2/save/main"] && store[R + "acplayers/player2"].count === 2, "trusted player: flagged but never auto-rolled back");
  await A("adminSecConfig", { autoRevert: false });
  /* audit log */
  const au = await A("adminSecAudit");
  ["watch", "trust", "restrict", "suspend", "ban", "rollback", "config"].forEach((a) => assert.ok(au.rows.some((x) => x.action === a), "audited: " + a));
  assert.ok(au.rows.every((x) => x.by === ADMIN));
  /* admin player page shows the ban */
  await A("adminSecAction", { uid: "player2", action: "suspend", hours: 1 });
  const pi = await A("adminPlayerInfo", { uid: "player2" }); assert.ok(pi.ban && pi.ban.kind === "suspend" && pi.flags && pi.flags.trusted);
  console.log("ALL OK");
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
