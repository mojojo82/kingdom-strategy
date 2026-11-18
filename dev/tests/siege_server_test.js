// v1623: Alliance Siege server flow (schedule / cancel / rally / join / hit / claim) on the local fake server. node dev/tests/siege_server_test.js
const store = {}; const call = require(__dirname + "/fnrunner.js")(store);
const C = require(__dirname + "/../../functions/core.js"); const R = C.envRoot("test");
const A = (u) => JSON.stringify({ uid: u, token: { firebase: { sign_in_provider: "password" } } });
const go = async (fn, uid, data) => JSON.parse(await call(fn, JSON.stringify(Object.assign({ env: "test" }, data)), A(uid)));
(async () => {
  const aid = "A1"; const ids = ["leader01", "officer1", "member01", "member02", "loner001"];
  [["leader01", 5, 12e6], ["officer1", 4, 3e6], ["member01", 2, 1e6], ["member02", 1, 400000]].forEach(([u, rk, pw]) => { store[R + "allyindex/" + u] = { aid, tag: "TST", rank: rk }; store[R + "alliances/" + aid + "/members/" + u] = { rank: rk, name: u, power: pw }; });
  store[R + "players/leader01/save/main"] = { power: 30e6 }; /* v1704: leader grew since joining (roster still says 12M) - the hit must use the save's 30M */
  const out = {};
  out.memberSchedule = (await go("siegeSchedule", "member01", { start: Date.now() + 3600e3, x: 100, y: 100 })).error.message;
  out.loner = (await go("siegeSchedule", "loner001", { now: true, x: 100, y: 100 })).error.message;
  const s1 = await go("siegeSchedule", "officer1", { start: Date.now() + 2 * 3600e3, x: 100, y: 100, name: "Officer" }); out.sched = !!s1.data;
  out.overlap = (await go("siegeSchedule", "leader01", { start: Date.now() + 2 * 3600e3 + 600e3, x: 100, y: 100 })).error.message;
  const s0 = await go("siegeSchedule", "leader01", { now: true, x: 120, y: 80, name: "Boss" }); out.now = !!s0.data; const hid = s0.data.hunt.id;
  const s3 = await go("siegeSchedule", "leader01", { start: Date.now() + 5 * 3600e3, x: 1, y: 1 });
  out.fourth = (await go("siegeSchedule", "leader01", { start: Date.now() + 8 * 3600e3, x: 1, y: 1 })).error ? (await go("siegeSchedule", "leader01", { start: Date.now() + 8 * 3600e3, x: 1, y: 1 })).error.message : "accepted (other week?)";
  out.cancel = (await go("siegeCancel", "officer1", { hid: s1.data.hunt.id })).data;
  const r = await go("siegeRally", "member01", { hid, name: "M1" }); out.rally = !!r.data; const rid = r.data.rid;
  out.busy = (await go("siegeRally", "member01", { hid })).error.message;
  out.join = [(await go("siegeJoin", "leader01", { rid, name: "L" })).data, (await go("siegeJoin", "officer1", { rid, name: "O" })).data, (await go("siegeJoin", "loner001", { rid })).error.message];
  out.hitEarly = (await go("siegeHit", "member02", { rid })).error.message;
  store[R + "siege/" + aid + "/r/" + rid].launch = Date.now() - 1; // fast-forward the countdown
  const hit = await go("siegeHit", "member02", { rid }); out.hit = hit.data; out.leaderShareUsesSave = hit.data && hit.data.shares && hit.data.shares.leader01 > 25e6 ? "yes (" + Math.round(hit.data.shares.leader01 / 1e6) + "M)" : "NO"; out.officerShareUsesRoster = hit.data && hit.data.shares && hit.data.shares.officer1 < 4e6 ? "yes" : "NO"; out.hitAgain = (await go("siegeHit", "leader01", { rid })).data.dup;
  out.claimEarly = (await go("siegeClaim", "leader01", { hid })).error.message;
  store[R + "siege/" + aid + "/h/" + hid].end = Date.now() - 1;
  const cl = await go("siegeClaim", "leader01", { hid }); out.claim = cl.data; out.claimDup = (await go("siegeClaim", "leader01", { hid })).data;
  out.claimNoDmg = (await go("siegeClaim", "member02", { hid })).error.message;
  /* v1725: hunt ranking + lifetime milestones */
  out.places = {}; for (const u of ["leader01", "officer1", "member01"]) { const c = await go("siegeClaim", u, { hid }); out.places[u] = c.data && (c.data.place || (c.data.dup ? "dup" : "?")); }
  out.life = { leader01: (store[R + "players/leader01/wallet/main"] || {}).sgLife, officer1: (store[R + "players/officer1/wallet/main"] || {}).sgLife };
  const ms0 = await go("siegeMs", "officer1", { idx: 0 }); out.ms0 = ms0.data ? { dup: ms0.data.dup, items: ms0.data.items, sgMs: ms0.data.sgMs } : ms0.error.message;
  out.ms0Dup = (await go("siegeMs", "officer1", { idx: 0 })).data.dup;
  out.msTooHigh = (await go("siegeMs", "officer1", { idx: 11 })).error.message;
  out.msBad = (await go("siegeMs", "officer1", { idx: 99 })).error.message;
  out.msMail = Object.keys(store).filter((k) => k.indexOf("players/officer1/mail") >= 0).map((k) => store[k].title);
  out.mail = Object.keys(store).filter((k) => k.indexOf("players/leader01/mail") >= 0).map((k) => store[k].title);
  out.chat = Object.keys(store).filter((k) => k.indexOf("/chat/") >= 0).map((k) => store[k].text);
  out.rallyGems = { member01: (store[R + "players/member01/wallet/main"] || {}).gems, leader01: (store[R + "players/leader01/wallet/main"] || {}).gems, officer1: (store[R + "players/officer1/wallet/main"] || {}).gems }; /* v1628: 50 per rally started / joined */
  console.log(JSON.stringify(out, null, 1));
})();
