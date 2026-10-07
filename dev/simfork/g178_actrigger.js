/* v920: the REAL save trigger (functions/index.js onSaveWriteTest) through the local runner: normal save = no flag; a cheat = flagged in
   envs/test/acplayers/<uid> with the reasons; mail claimed in the window excuses it; admins are skipped; the save itself is never changed.
   Run: node dev/simfork/g178_actrigger.js */
const path = require("path"), assert = require("assert");
const ROOT = path.join(__dirname, "../..");
const store = {}, call = require(path.join(ROOT, "dev/tests/fnrunner.js"))(store);
const ADMINS = require(path.join(ROOT, "functions/admins.json"));
const base = () => ({ resources: { food: 5000, wood: 5000, stone: 3000, gold: 1000 }, troops: { infantry: 200 }, buildings: { townhall: { level: 3 } }, heroes: {}, idle: { chapter: 1, levelNum: 5 } });
(async () => {
  const T = 1.8e12, uid = "playerAAA";
  let a = base(); a.resources.gold += 500;
  await call.trigger("onSaveWriteTest", uid, base(), a, T, T + 60000);
  assert.strictEqual(store["envs/test/acplayers/" + uid], undefined, "normal save: no flag"); console.log("1. normal save -> no flag");
  a = base(); a.resources.gold = 5e7; a.idle.chapter = 4;
  store["envs/test/players/" + uid + "/save/main"] = a;
  await call.trigger("onSaveWriteTest", uid, base(), a, T, T + 5000);
  const f = store["envs/test/acplayers/" + uid]; console.log("2. cheat ->", JSON.stringify(f));
  assert.ok(f && f.count === 1 && f.recent[0].reasons.length === 2, "flagged with both reasons");
  assert.strictEqual(store["envs/test/players/" + uid + "/save/main"].resources.gold, 5e7, "flag only: the save is untouched");
  /* the same jump, but a mail with that gold was claimed just before */
  store["envs/test/players/playerBBB/mail/m1"] = { items: { gold: 5e7 }, claimedAt: T + 1000 };
  a = base(); a.resources.gold = 5e7;
  await call.trigger("onSaveWriteTest", "playerBBB", base(), a, T, T + 5000);
  assert.strictEqual(store["envs/test/acplayers/playerBBB"], undefined, "claimed mail excuses it"); console.log("3. same gold from a claimed mail -> no flag");
  /* an admin (dev tools) is never flagged */
  a = base(); a.idle.chapter = 30;
  await call.trigger("onSaveWriteTest", ADMINS[0], base(), a, T, T + 1000);
  assert.strictEqual(store["envs/test/acplayers/" + ADMINS[0]], undefined); console.log("4. admin -> skipped");
  /* a second flag adds to the record */
  a = base(); a.troops.infantry = 9e6; await call.trigger("onSaveWriteTest", uid, base(), a, T + 9000, T + 10000);
  console.log("5. second flag -> count", store["envs/test/acplayers/" + uid].count); assert.strictEqual(store["envs/test/acplayers/" + uid].count, 2);
  /* live trigger writes to the live root */
  a = base(); a.idle.chapter = 9; await call.trigger("onSaveWriteLive", "playerCCC", base(), a, T, T + 1000);
  assert.ok(store["acplayers/playerCCC"], "live flag at the root"); console.log("6. live save -> flagged at the live root");
  console.log("ALL OK");
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
