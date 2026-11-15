// v1625: event rewards on the server (claimEv) on the local fake server. node dev/tests/evclaim_server_test.js
const store = {}; const call = require(__dirname + "/fnrunner.js")(store);
const C = require(__dirname + "/../../functions/core.js"); const R = C.envRoot("test");
const A = (u) => JSON.stringify({ uid: u, token: { firebase: { sign_in_provider: "password" } } });
const go = async (fn, uid, data) => JSON.parse(await call(fn, JSON.stringify(Object.assign({ env: "test" }, data)), A(uid)));
const assert = require("assert");
(async () => {
  const day = Math.floor(Date.now() / 86400000), w = Math.floor((day + 3) / 7);
  const lo = C.normalizeLiveops({ fhw: { hero: "kessa", ms: [{ at: 10, items: { gems: 150, food: 500 } }, { at: 20, items: { gems: 9000 } }] }, wk: { heroes: ["roran"], shards: 10 },
    items: { phone: ["food"], gemDay: 1000 }, np: { days: 14, tasks: [{ id: "a", day: 1, kind: "th", items: { gems: 20, wood: 3 } }, { id: "b", day: 5, kind: "th", items: { gems: 20 } }], chests: [] } });
  store[R + "config/liveops"] = lo; store[R + "players/p1/meta/account"] = { createdAt: Date.now() - 3600e3 };
  const out = {};
  const a = await go("claimEv", "p1", { src: "fhw", k: w, ref: "ms:0" }); out.first = a.data; assert.strictEqual(a.data.added, 150); assert.deepStrictEqual(a.data.save, {}, "food is phone-paid");
  out.again = (await go("claimEv", "p1", { src: "fhw", k: w, ref: "ms:0" })).data; assert.strictEqual(out.again.dup, true);
  out.oldWeek = (await go("claimEv", "p1", { src: "fhw", k: w - 3, ref: "ms:0" })).error.message;
  out.fake = (await go("claimEv", "p1", { src: "fhw", k: w, ref: "ms:7" })).error.message;
  const cap = await go("claimEv", "p1", { src: "fhw", k: w, ref: "ms:1" }); out.cap = cap.data; assert.strictEqual(cap.data.added, 850); assert.strictEqual(cap.data.capped, 8150);
  out.wk = (await go("claimEv", "p1", { src: "wk", k: w, ref: "roran" })).data; assert.deepStrictEqual(out.wk.save, { shards_roran: 10 });
  out.np = (await go("claimEv", "p1", { src: "np", k: 0, ref: "t:a" })).data; assert.deepStrictEqual(out.np.save, { wood: 3 });
  out.npLocked = (await go("claimEv", "p1", { src: "np", k: 0, ref: "t:b" })).error.message;
  out.wallet = store[R + "players/p1/wallet/main"].gems; assert.strictEqual(out.wallet, 150 + 850 + 0, "np gems over the cap");
  out.ledger = Object.keys(store).filter((k) => k.indexOf("players/p1/ledger/") >= 0).map((k) => store[k].item + " " + store[k].delta + " " + store[k].reason);
  assert.strictEqual(out.ledger.length, 4, "every server-paid item is in the ledger");
  store[R + "acplayers/p2"] = { restricted: true }; out.restricted = (await go("claimEv", "p2", { src: "fhw", k: w, ref: "ms:0" })).error.message;
  console.log(JSON.stringify(out, null, 1)); console.log("evclaim server test passed");
})().catch((e) => { console.error(e); process.exit(1); });
