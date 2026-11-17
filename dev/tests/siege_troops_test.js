// v1705: Alliance Siege troop rallies on the local fake server - leader sends troops + heroes, rally size from the leader, members send up to their
// own march size and the room left, owned-troop check, the hit's total + shares checked (add up, believable). node dev/tests/siege_troops_test.js
const store = {}; const call = require(__dirname + "/fnrunner.js")(store);
const C = require(__dirname + "/../../functions/core.js"); const R = C.envRoot("test");
const A = (u) => JSON.stringify({ uid: u, token: { firebase: { sign_in_provider: "password" } } });
const go = async (fn, uid, data) => JSON.parse(await call(fn, JSON.stringify(Object.assign({ env: "test" }, data)), A(uid)));
const ok = {}, chk = (k, v) => { ok[k] = v ? "ok" : "FAIL"; };
(async () => {
  const aid = "A1";
  [["leader01", 5], ["member01", 2], ["member02", 1]].forEach(([u, rk]) => { store[R + "allyindex/" + u] = { aid, tag: "TST", rank: rk }; store[R + "alliances/" + aid + "/members/" + u] = { rank: rk, name: u, power: 1e6 }; });
  const H = (lv) => ({ owned: true, level: lv });
  store[R + "players/leader01/save/main"] = { power: 5e6, buildings: { commandcenter: { level: 10 } }, heroes: { gareth: H(40), lyra: H(40) }, troops: { infantry_t6: 20000, archer_t6: 20000 } };
  store[R + "players/member01/save/main"] = { power: 2e6, buildings: { commandcenter: { level: 5 } }, heroes: { roran: H(30) }, troops: { cavalry_t5: 30000 } };
  store[R + "players/member02/save/main"] = { power: 1e6, buildings: {}, heroes: {}, troops: { infantry: 400 } };
  const hid = (await go("siegeSchedule", "leader01", { now: true, x: 1, y: 1 })).data.hunt.id;
  const leaderMarch = C.sgMarchCap(store[R + "players/leader01/save/main"], ["gareth", "lyra"]), rallyCap = C.sgRallyCap(store[R + "players/leader01/save/main"], ["gareth", "lyra"]);
  chk("leader over own march size refused", !!(await go("siegeRally", "leader01", { hid, army: { infantry_t6: 20000, archer_t6: 20000 }, heroes: ["gareth", "lyra"] })).error);
  chk("troops not owned refused", /don't have/.test(((await go("siegeRally", "leader01", { hid, army: { infantry_t9: 10 }, heroes: ["gareth"] })).error || {}).message || ""));
  const r = await go("siegeRally", "leader01", { hid, army: { infantry_t6: 6000, archer_t6: 4000, bogus: 5 }, heroes: ["gareth", "lyra", "notmine"], fort: 3 });
  chk("rally started", r.data && r.data.rid); const rid = r.data.rid, rd = () => store[R + "siege/" + aid + "/r/" + rid];
  chk("rally cap from leader (2000 + CC10 rally 35,500 + march " + leaderMarch + " = " + rallyCap + ")", rd().cap === rallyCap && rallyCap === 2000 + 35500 + leaderMarch);
  chk("leader heroes kept (only owned)", JSON.stringify(rd().heroes) === '["gareth","lyra"]');
  chk("bogus troop key dropped", !rd().armies.leader01.bogus && rd().sent === 10000);
  const m1cap = C.sgMarchCap(store[R + "players/member01/save/main"], null);
  chk("member over own march size refused", !!(await go("siegeJoin", "member01", { rid, army: { cavalry_t5: m1cap + 1 } })).error);
  const j1 = await go("siegeJoin", "member01", { rid, army: { cavalry_t5: 3000 } }); chk("member joins with 3,000", j1.data && rd().sent === 13000);
  chk("member02 with no troops refused", !!(await go("siegeJoin", "member02", { rid, army: {} })).error);
  rd().cap = 13200; /* nearly full */
  chk("rally room enforced", /only 200/.test(((await go("siegeJoin", "member02", { rid, army: { infantry: 300 } })).error || {}).message || ""));
  chk("fits the room", !!(await go("siegeJoin", "member02", { rid, army: { infantry: 200 } })).data);
  rd().launch = Date.now() - 1;
  const tp = C.sgTroopPower({ infantry_t6: 6000, archer_t6: 4000, cavalry_t5: 3000, infantry: 200 }), max = C.sgDmgCap(C.normalizeLiveops({}).sg, tp, 5e6);
  chk("unbelievable total refused (cap " + max + ")", !!(await go("siegeHit", "member01", { rid, total: max + 1, shares: { leader01: max + 1, member01: 0, member02: 0 } })).error);
  chk("shares that don't add up refused", !!(await go("siegeHit", "member01", { rid, total: 1000000, shares: { leader01: 10, member01: 10, member02: 10 } })).error);
  const hit = await go("siegeHit", "member01", { rid, total: 900000, shares: { leader01: 600000, member01: 280000, member02: 20000 } });
  chk("hit counted", hit.data && hit.data.hit === 900000 && store[R + "siege/" + aid + "/h/" + hid].dmg.member01 === 280000 && store[R + "siege/" + aid + "/h/" + hid].total === 900000);
  chk("busy cleared", Object.keys(store[R + "siege/" + aid + "/h/" + hid].busy || {}).length === 0);
  chk("hit once", (await go("siegeHit", "leader01", { rid, total: 5, shares: {} })).data.dup === true && store[R + "siege/" + aid + "/h/" + hid].total === 900000);
  const old = await go("siegeRally", "member01", { hid }); chk("old-style rally (no troops) still works", old.data && !store[R + "siege/" + aid + "/r/" + old.data.rid].armies);
  console.log(JSON.stringify(ok, null, 1)); if (Object.values(ok).some((v) => v !== "ok")) process.exit(1);
})();
