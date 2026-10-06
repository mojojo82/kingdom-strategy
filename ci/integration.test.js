// Runs inside `firebase emulators:exec` on GitHub Actions: real Firestore rules + real Cloud Functions, local emulators.
// Signs in real (emulated) players and checks that nothing worth gems can be done from a player's device.
"use strict";
const assert = require("assert");
const { initializeApp, deleteApp } = require("firebase/app");
const { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signInWithCustomToken, signInAnonymously } = require("firebase/auth");
const { getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc, updateDoc, deleteDoc } = require("firebase/firestore");
const { getFunctions, connectFunctionsEmulator, httpsCallable } = require("firebase/functions");
const adminApp = require("firebase-admin/app"), adminAuth = require("firebase-admin/auth");

const PROJECT = process.env.GCLOUD_PROJECT || "demo-kingdom";
let passed = 0, failed = 0;
async function t(name, fn) { try { await fn(); passed++; console.log("ok   -", name); } catch (e) { failed++; console.log("FAIL -", name, "\n      ", e && (e.stack || e.message || e)); } }
async function denied(p) { try { await p; } catch (e) { if (/permission|PERMISSION_DENIED|insufficient/i.test(String(e.code || "") + e.message)) return; throw e; } throw new Error("expected permission denied, but it was allowed"); }
async function fnErr(p, re) { try { await p; } catch (e) { const s = (e.code || "") + " " + e.message + " " + JSON.stringify(e.details || {}); if (re.test(s)) return e; throw new Error("wrong error: " + s); } throw new Error("expected an error matching " + re); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let n = 0;
async function player(kind, uid) {
  const app = initializeApp({ projectId: PROJECT, apiKey: "demo-key", authDomain: PROJECT + ".firebaseapp.com" }, "p" + (n++));
  const auth = getAuth(app); connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  const db = getFirestore(app); connectFirestoreEmulator(db, "127.0.0.1", 8080);
  const fns = getFunctions(app, "us-central1"); connectFunctionsEmulator(fns, "127.0.0.1", 5001);
  let cred;
  if (kind === "anon") cred = await signInAnonymously(auth);
  else if (kind === "custom") cred = await signInWithCustomToken(auth, await adminAuth.getAuth().createCustomToken(uid));
  else cred = await createUserWithEmailAndPassword(auth, "p" + Date.now() + n + "@test.dev", "secret123");
  const u = cred.user.uid;
  return { app, db, uid: u, call: (name, data) => httpsCallable(fns, name)(Object.assign({ env: ENV }, data || {})).then((r) => r.data) };
}
let ENV = "test", R = "envs/test/";
const P = (s) => R + s;

(async () => {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
  adminApp.initializeApp({ projectId: PROJECT });
  const A = await player(), B = await player(), Cc = await player(), ADM = await player("custom", "ciadmin0001"), ANON = await player("anon");

  await t("own save: write ok, someone else's save: denied", async () => {
    await setDoc(doc(A.db, P("players/" + A.uid + "/save/main")), { gems: 999999, x: 1 });
    await denied(setDoc(doc(A.db, P("players/" + B.uid + "/save/main")), { x: 1 }));
  });
  await t("wallet: players cannot write their own or read others'", async () => {
    await denied(setDoc(doc(A.db, P("players/" + A.uid + "/wallet/main")), { gems: 1e9 }));
    await denied(getDoc(doc(A.db, P("players/" + B.uid + "/wallet/main"))));
  });
  await t("guest (anonymous) accounts can't write or use the server", async () => {
    await denied(setDoc(doc(ANON.db, P("players/" + ANON.uid + "/save/main")), { x: 1 }));
    await fnErr(ANON.call("claimLevel", { chapter: 1, levelNum: 1 }), /permission-denied|guest/);
  });
  await t("level gems: next level only, once each, not faster than the game allows", async () => {
    let r = await A.call("claimLevel", { chapter: 1, levelNum: 1 }); assert.strictEqual(r.gems, 50);
    r = await A.call("claimLevel", { chapter: 1, levelNum: 1 }); assert.ok(r.dup); assert.strictEqual(r.gems, 50);
    await fnErr(A.call("claimLevel", { chapter: 1, levelNum: 3 }), /out_of_order/);
    const e = await fnErr(A.call("claimLevel", { chapter: 1, levelNum: 2 }), /too_fast/);
    await sleep(Math.min(6000, (e.details && e.details.retryAfterMs) || 4500) + 300);
    r = await A.call("claimLevel", { chapter: 1, levelNum: 2 }); assert.strictEqual(r.gems, 100);
    const w = await getDoc(doc(A.db, P("players/" + A.uid + "/wallet/main"))); assert.strictEqual(w.data().gems, 100);
  });
  await t("cities: claim own tile ok; HP fields, other players' cities: denied", async () => {
    await setDoc(doc(A.db, P("cities/10_10")), { owner: A.uid, claimedAt: Date.now() });
    await denied(setDoc(doc(B.db, P("cities/30_30")), { owner: A.uid, claimedAt: 1 }));
    await denied(setDoc(doc(B.db, P("cities/31_31")), { owner: B.uid, hp: 10000, hpT: 1 }));
    await denied(updateDoc(doc(B.db, P("cities/10_10")), { owner: B.uid }));
    await denied(deleteDoc(doc(B.db, P("cities/10_10"))));
    await setDoc(doc(B.db, P("cities/40_40")), { owner: B.uid, claimedAt: Date.now() });
  });
  await t("hits: server only, no hitting yourself, 30s cooldown per target", async () => {
    const h = await B.call("hitBase", { tileId: "10,10" }); assert.strictEqual(h.before, 10000); assert.strictEqual(h.after, 9000);
    await fnErr(B.call("hitBase", { tileId: "10,10" }), /hit_cooldown/);
    await fnErr(A.call("hitBase", { tileId: "10,10" }), /own_city/);
    await denied(updateDoc(doc(A.db, P("cities/10_10")), { burnLeft: 0 }));
    await denied(updateDoc(doc(A.db, P("cities/10_10")), { hp: 10000 }));
  });
  await t("putting out my fire costs 100 gems (server-side)", async () => {
    const r = await A.call("extinguishBase", { tileId: "10,10" }); assert.strictEqual(r.gems, 0); assert.strictEqual(r.city.burnLeft, 0);
    await fnErr(A.call("extinguishBase", { tileId: "10,10" }), /not_burning/);
    await fnErr(B.call("extinguishBase", { tileId: "10,10" }), /not_your_city/);
  });
  await t("repair needs gems; admin grant works; non-admin grant denied", async () => {
    await fnErr(A.call("repairBase", { tileId: "10,10" }), /not_enough_gems/);
    await fnErr(A.call("adminGrantGems", { uid: A.uid, amount: 5000 }), /admin only|permission/);
    const g = await ADM.call("adminGrantGems", { uid: A.uid, amount: 1000 }); assert.strictEqual(g.gems, 1000);
    const r = await A.call("repairBase", { tileId: "10,10" }); assert.strictEqual(r.gems, 775); assert.ok(r.city.hp > 9900);
  });
  await t("alliances: no friendly fire; allies put out fires for free", async () => {
    await setDoc(doc(A.db, P("allyindex/" + A.uid)), { aid: "wolves", tag: "WLF", rank: 5 });
    await setDoc(doc(B.db, P("allyindex/" + B.uid)), { aid: "wolves", tag: "WLF", rank: 1 });
    await sleep(31000);
    await fnErr(B.call("hitBase", { tileId: "10,10" }), /ally_city/);
    await Cc.call("hitBase", { tileId: "10,10" });
    const r = await B.call("extinguishAllyBase", { tileId: "10,10" }); assert.strictEqual(r.city.burnLeft, 0);
    const w = await getDoc(doc(A.db, P("players/" + A.uid + "/wallet/main"))); assert.strictEqual(w.data().gems, 775, "ally extinguish must not charge the owner");
    await fnErr(Cc.call("extinguishAllyBase", { tileId: "10,10" }), /not_allies/);
  });
  await t("teleport keeps damage; deleting a damaged city client-side is denied", async () => {
    await denied(deleteDoc(doc(A.db, P("cities/10_10"))));
    const before = (await getDoc(doc(A.db, P("cities/10_10")))).data();
    await A.call("relocateCity", { from: "10,10", to: "20,20" });
    const after = (await getDoc(doc(A.db, P("cities/20_20")))).data(); assert.strictEqual(after.owner, A.uid); assert.strictEqual(after.hp, before.hp);
    assert.ok(!(await getDoc(doc(A.db, P("cities/10_10")))).exists());
    await fnErr(A.call("relocateCity", { from: "20,20", to: "40,40" }), /taken/);
  });
  await t("world chat: post as yourself only, max 500 chars, no edits", async () => {
    await setDoc(doc(A.db, P("worldchat/1_" + A.uid)), { pid: A.uid, name: "A", text: "hi", ts: 1 });
    await denied(setDoc(doc(A.db, P("worldchat/2_" + A.uid)), { pid: B.uid, name: "B", text: "fake", ts: 2 }));
    await denied(setDoc(doc(A.db, P("worldchat/3_" + A.uid)), { pid: A.uid, name: "A", text: "x".repeat(501), ts: 3 }));
    await denied(updateDoc(doc(A.db, P("worldchat/1_" + A.uid)), { text: "edited" }));
  });
  await t("painted map: admin only", async () => {
    await denied(setDoc(doc(A.db, P("terrain/0_0")), { s: "0", t: 1 }));
    await setDoc(doc(ADM.db, P("terrain/0_0")), { s: "0", t: 1 });
    await denied(setDoc(doc(A.db, P("mapdecor/1_1")), { s: "x", t: 1 }));
  });
  await t("ledger: every gem change is recorded by the server, readable only by the player and admins", async () => {
    const { getDocs, collection, query, orderBy } = require("firebase/firestore");
    const q = await getDocs(query(collection(A.db, P("players/" + A.uid + "/ledger")), orderBy("at")));
    const rows = q.docs.map((x) => x.data().reason + ":" + x.data().delta + "=" + x.data().balance);
    assert.deepStrictEqual(rows, ["level_clear:50=50", "level_clear:50=100", "extinguish:-100=0", "admin_grant:1000=1000", "repair:-225=775"], JSON.stringify(rows));
    await denied(getDocs(collection(B.db, P("players/" + A.uid + "/ledger"))));
    await denied(setDoc(doc(A.db, P("players/" + A.uid + "/ledger/fake")), { item: "gems", delta: 999, balance: 999, reason: "purchase", at: 1 }));
    const adm = await getDocs(collection(ADM.db, P("players/" + A.uid + "/ledger"))); assert.strictEqual(adm.size, 5);
  });
  await t("purchases: delivered once per receipt, recorded, only admin can deliver/mark", async () => {
    await fnErr(A.call("adminDeliverPurchase", { uid: A.uid, pack: "test_gems_100", provider: "manual", receiptId: "r-0001" }), /admin only|permission/);
    let r = await ADM.call("adminDeliverPurchase", { uid: A.uid, pack: "test_gems_100", provider: "manual", receiptId: "r-0001" }); assert.ok(!r.dup); assert.strictEqual(r.gems, 875);
    r = await ADM.call("adminDeliverPurchase", { uid: A.uid, pack: "test_gems_100", provider: "manual", receiptId: "r-0001" }); assert.ok(r.dup, "second delivery of same receipt must be a no-op");
    const w = await getDoc(doc(A.db, P("players/" + A.uid + "/wallet/main"))); assert.strictEqual(w.data().gems, 875);
    const mine = await getDoc(doc(A.db, P("purchases/manual_r-0001"))); assert.strictEqual(mine.data().status, "delivered"); assert.strictEqual(mine.data().uid, A.uid);
    await denied(getDoc(doc(B.db, P("purchases/manual_r-0001"))));
    await denied(setDoc(doc(A.db, P("purchases/fake")), { uid: A.uid, status: "delivered" }));
    await fnErr(ADM.call("adminDeliverPurchase", { uid: A.uid, pack: "no_such_pack", provider: "manual", receiptId: "r-0002" }), /unknown pack/);
    const m = await ADM.call("adminMarkPurchase", { id: "manual_r-0001", status: "refunded", note: "test" }); assert.strictEqual(m.status, "refunded");
    const w2 = await getDoc(doc(A.db, P("players/" + A.uid + "/wallet/main"))); assert.strictEqual(w2.data().gems, 875, "refund marks only, never takes gems by itself");
  });
  await t("account dates: server writes created/last seen; players can't edit them", async () => {
    const r = await A.call("touch"); assert.ok(r.createdAt && r.lastSeen);
    const d = await getDoc(doc(A.db, P("players/" + A.uid + "/meta/account"))); assert.strictEqual(d.data().createdAt, r.createdAt);
    assert.deepStrictEqual(Object.keys(d.data()).sort(), ["createdAt", "lastSeen"], "only the two dates are stored");
    await denied(setDoc(doc(A.db, P("players/" + A.uid + "/meta/account")), { createdAt: 1, lastSeen: 1 }));
    await denied(getDoc(doc(B.db, P("players/" + A.uid + "/meta/account"))));
  });
  await t("live env is separate from test env", async () => {
    ENV = "live"; R = "";
    const r = await B.call("claimLevel", { chapter: 1, levelNum: 1 }); assert.strictEqual(r.gems, 50);
    const wTest = await getDoc(doc(B.db, "envs/test/players/" + B.uid + "/wallet/main")); assert.ok(!wTest.exists() || !wTest.data().gems);
    await denied(setDoc(doc(A.db, "players/" + A.uid + "/wallet/main"), { gems: 1 }));
    ENV = "test"; R = "envs/test/";
  });

  console.log("\n" + passed + " passed, " + failed + " failed");
  await Promise.all([A, B, Cc, ADM, ANON].map((p) => deleteApp(p.app).catch(() => {})));
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
