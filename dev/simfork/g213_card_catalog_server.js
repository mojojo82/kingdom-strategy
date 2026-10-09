/* v977: adminCardCatalog - admin copies card text into the shared card list: empty slots only, Drop Signal added, no save touched, non-admins refused. Run: node dev/simfork/g213_card_catalog_server.js */
const ROOT = require("path").join(__dirname, "../.."), assert = require("assert");
const store = {}, call = require(ROOT + "/dev/tests/fnrunner.js")(store);
const ADMIN = require(ROOT + "/functions/admins.json")[0];
(async () => {
  const ctx = (uid) => JSON.stringify({ uid, token: { firebase: { sign_in_provider: "google.com" } } });
  store["envs/test/assetitems/cardcatalog"] = { cards: [{ name: "Already", effect: "keep me" }], ts: 1 };
  store["envs/test/players/" + ADMIN + "/save/main"] = { untouched: true };
  const r = JSON.parse(await call("adminCardCatalog", JSON.stringify({ env: "test", cards: [{ name: "Old A", effect: "a" }, { name: "Old B", effect: "b" }] }), ctx(ADMIN)));
  console.log(JSON.stringify(r).slice(0, 300));
  const doc = store["envs/test/assetitems/cardcatalog"];
  assert.ok(!r.error, r.error); assert.strictEqual(doc.cards[0].name, "Already"); assert.strictEqual(doc.cards[1].name, "Old B"); assert.strictEqual(doc.cards[29].name, "Drop Signal");
  assert.deepStrictEqual(store["envs/test/players/" + ADMIN + "/save/main"], { untouched: true });
  const bad = JSON.parse(await call("adminCardCatalog", JSON.stringify({ env: "test", cards: [] }), ctx("someoneElse")));
  assert.ok(bad.error, "non-admin refused"); console.log("non-admin:", bad.error); console.log("ALL OK");
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
