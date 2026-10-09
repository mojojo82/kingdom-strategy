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
  await t("anti-cheat: an impossible save jump is flagged (admins can read it, the player can't read or erase it, the save is untouched)", async () => {
    await setDoc(doc(A.db, P("players/" + A.uid + "/save/main")), { resources: { food: 500, wood: 500, stone: 300, gold: 100 }, idle: { chapter: 1, levelNum: 1 } });
    await sleep(1500);
    await setDoc(doc(A.db, P("players/" + A.uid + "/save/main")), { resources: { food: 500, wood: 500, stone: 300, gold: 1e9 }, idle: { chapter: 9, levelNum: 1 } });
    let f = null; for (let i = 0; i < 20 && !(f && f.exists()); i++) { await sleep(1000); f = await getDoc(doc(ADM.db, P("acplayers/" + A.uid))); }
    assert.ok(f && f.exists(), "flag written by the save trigger");
    const reasons = (f.data().recent || [])[0].reasons.join(" | "); assert.ok(/Conquest/.test(reasons) && /gold/.test(reasons), reasons);
    await denied(getDoc(doc(A.db, P("acplayers/" + A.uid))));
    await denied(setDoc(doc(A.db, P("acplayers/" + A.uid)), { count: 0 }));
    const sv = await getDoc(doc(A.db, P("players/" + A.uid + "/save/main"))); assert.strictEqual(sv.data().resources.gold, 1e9, "flag only: save untouched");
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
  await t("mail: admin sends any items; player claims once; each item recorded; players can't fake mail", async () => {
    await fnErr(A.call("adminSendMail", { uid: B.uid, title: "x", items: { gems: 5 } }), /admin only|permission/);
    await fnErr(ADM.call("adminSendMail", { uid: A.uid, title: "x", items: { dragons: 5 } }), /unknown item/);
    await ADM.call("adminSendMail", { uid: A.uid, title: "Sorry!", body: "For the bug", items: { gems: 25, food: 1000, shards_gareth: 3 } });
    const { getDocs, collection } = require("firebase/firestore");
    const ms = await getDocs(collection(A.db, P("players/" + A.uid + "/mail"))); assert.strictEqual(ms.size, 1); const mid = ms.docs[0].id;
    assert.deepStrictEqual(ms.docs[0].data().items, { gems: 25, food: 1000, shards_gareth: 3 });
    await denied(getDocs(collection(B.db, P("players/" + A.uid + "/mail"))));
    await denied(setDoc(doc(A.db, P("players/" + A.uid + "/mail/fake")), { title: "free stuff", items: { gems: 99999 }, sentAt: 1 }));
    await denied(updateDoc(doc(A.db, P("players/" + A.uid + "/mail/" + mid)), { claimedAt: null }));
    const before = (await getDoc(doc(A.db, P("players/" + A.uid + "/wallet/main")))).data().gems;
    let r = await A.call("claimMail", { id: mid }); assert.ok(!r.dup); assert.strictEqual(r.gems, before + 25);
    assert.deepStrictEqual(r.items.map((x) => x.id + ":" + x.qty + ":" + x.kind).sort(), ["food:1000:save", "gems:25:wallet", "shards_gareth:3:save"]);
    r = await A.call("claimMail", { id: mid }); assert.ok(r.dup, "second claim is a no-op");
    assert.strictEqual((await getDoc(doc(A.db, P("players/" + A.uid + "/wallet/main")))).data().gems, before + 25);
    await fnErr(B.call("claimMail", { id: mid }), /no such mail/);
    const info = await ADM.call("adminPlayerInfo", { uid: A.uid });
    const mailRows = info.ledger.filter((l) => l.reason === "mail" && l.ref === mid).map((l) => l.item + "+" + l.delta).sort();
    assert.deepStrictEqual(mailRows, ["food+1000", "gems+25", "shards_gareth+3"]);
    assert.ok(info.mail[0].claimedAt > 0);
  });
  await t("admin lookups: search by id/name, info, catalog; mail to all; non-admins refused", async () => {
    await setDoc(doc(A.db, P("players/" + A.uid + "/assetitems/kingdom_prototype_playername_v1")), { data: "Alicia", ts: 1 });
    let f = await ADM.call("adminFindPlayers", { q: "alic" }); assert.ok(f.players.some((p) => p.uid === A.uid && p.name === "Alicia"), JSON.stringify(f));
    f = await ADM.call("adminFindPlayers", { q: B.uid }); assert.strictEqual(f.players[0].uid, B.uid);
    await fnErr(A.call("adminFindPlayers", { q: "a" }), /admin only|permission/);
    await fnErr(A.call("adminPlayerInfo", { uid: B.uid }), /admin only|permission/);
    const c = await ADM.call("adminCatalog"); assert.ok(c.items.gems && c.items.food && c.packs.test_gems_100);
    const all = await ADM.call("adminSendMail", { all: true, title: "Event", items: { wood: 10 } }); assert.ok(all.sent >= 3, "sent " + all.sent);
  });
  await t("message-only mail (v939): no items, claiming just marks it read", async () => {
    await ADM.call("adminSendMail", { uid: Cc.uid, title: "Server news", body: "Maintenance at 9pm" });
    const { getDocs, collection } = require("firebase/firestore");
    const ms = await getDocs(collection(Cc.db, P("players/" + Cc.uid + "/mail"))); const m = ms.docs.find((d) => d.data().title === "Server news");
    assert.ok(m); assert.deepStrictEqual(m.data().items, {});
    const r = await Cc.call("claimMail", { id: m.id }); assert.ok(!r.dup); assert.deepStrictEqual(r.items, []); assert.ok(r.claimedAt > 0);
  });
  await t("shop (v943): packs + tiers + tabs made by admins only; players read them; delivery = gems + other items by mail; buy limits", async () => {
    await fnErr(A.call("adminSavePack", { pack: { name: "Free gems", items: { gems: 999 } } }), /admin only|permission/);
    const sv = await ADM.call("adminSavePack", { pack: { name: "Starter Pack", icon: "🎁", items: { gems: 300, wood: 5000 }, tier: 4, limit: 1 } }); assert.strictEqual(sv.id, "starter_pack");
    await ADM.call("adminSavePack", { pack: { name: "Daily Deal", items: { gems: 60 }, tier: 1, limit: 1, reset: "daily" } });
    const pd = await getDoc(doc(A.db, P("packs/starter_pack"))); assert.strictEqual(pd.data().tier, 4, "players can read packs (for the shop)");
    await denied(setDoc(doc(A.db, P("packs/starter_pack")), { name: "x", items: { gems: 1e6 } }));
    await fnErr(A.call("adminSaveShop", { tabs: [] }), /admin only|permission/);
    await fnErr(ADM.call("adminSaveShop", { tabs: [{ name: "Deals", items: [{ pack: "nope" }] }] }), /unknown pack/);
    const sh = await ADM.call("adminSaveShop", { tabs: [{ name: "Deals", icon: "🔥", items: [{ pack: "daily_deal", badge: "-50%" }, { pack: "starter_pack" }] }] });
    assert.strictEqual(sh.shop.tiers[1].NZD, 1.69);
    const cfg = await getDoc(doc(A.db, P("config/shop"))); assert.strictEqual(cfg.data().tabs[0].items[0].badge, "-50%", "players can read the shop layout");
    await denied(setDoc(doc(A.db, P("config/shop")), { tabs: [] }));
    const c = await ADM.call("adminCatalog"); assert.ok(c.packs.starter_pack && c.packs.test_gems_100 && c.shop.tabs.length === 1, "catalog = built-in + admin packs + shop");
    const before = ((await getDoc(doc(Cc.db, P("players/" + Cc.uid + "/wallet/main")))).data() || {}).gems || 0;
    const r = await ADM.call("adminDeliverPurchase", { uid: Cc.uid, pack: "starter_pack", receiptId: "ci-pack-0001" }); assert.strictEqual(r.gems, before + 300);
    const { getDocs, collection } = require("firebase/firestore");
    const ms = await getDocs(collection(Cc.db, P("players/" + Cc.uid + "/mail"))); const m = ms.docs.find((d) => d.id === r.record.mailId);
    assert.ok(m && m.data().items.wood === 5000 && !m.data().items.gems, "wood comes by mail");
    assert.ok((await ADM.call("adminDeliverPurchase", { uid: Cc.uid, pack: "starter_pack", receiptId: "ci-pack-0001" })).dup, "same receipt never twice");
    await fnErr(ADM.call("adminDeliverPurchase", { uid: Cc.uid, pack: "starter_pack", receiptId: "ci-pack-0002" }), /limit/);
    await ADM.call("adminDeliverPurchase", { uid: Cc.uid, pack: "daily_deal", receiptId: "ci-pack-0003" });
    await fnErr(ADM.call("adminDeliverPurchase", { uid: Cc.uid, pack: "daily_deal", receiptId: "ci-pack-0004" }), /limit/);
    /* v945: top-up points from the purchases above (tier 4 = 2,500, tier 1 = 500) + a ladder to claim from */
    await ADM.call("adminSaveShop", { topups: [{ name: "Daily Top-up", period: "daily", tiers: [{ points: 3000, items: { gems: 70, wood: 100 } }, { points: 9000, items: { gems: 1 } }] }] });
    await ADM.call("adminDeliverPurchase", { uid: Cc.uid, pack: "starter_pack", receiptId: "ci-pack-0009" }).catch(() => {}); /* one-time pack: refused, adds nothing */
    const w1 = (await getDoc(doc(Cc.db, P("players/" + Cc.uid + "/wallet/main")))).data(); assert.strictEqual(w1.topup.life, 3000, "2,500 + 500 lifetime points");
    await denied(setDoc(doc(Cc.db, P("players/" + Cc.uid + "/wallet/main")), { topup: { life: 1e9 } }));
    /* the ladder was saved after those purchases, so its daily counter starts empty: buy something now */
    await ADM.call("adminSavePack", { pack: { name: "Gem Chest", items: { gems: 10 }, tier: 5 } });
    await ADM.call("adminDeliverPurchase", { uid: Cc.uid, pack: "gem_chest", receiptId: "ci-pack-0010" });
    const cl = await Cc.call("claimTopup", { ladder: "daily_top_up", idx: 0 }); assert.ok(!cl.dup && cl.items.gems === 70);
    assert.ok((await Cc.call("claimTopup", { ladder: "daily_top_up", idx: 0 })).dup, "once");
    await fnErr(Cc.call("claimTopup", { ladder: "daily_top_up", idx: 1 }), /not enough/);
    await fnErr(ADM.call("adminDeletePack", { id: "test_gems_100" }), /can't delete/);
    const dl = await ADM.call("adminDeletePack", { id: "daily_deal" }); assert.ok(!dl.packs.daily_deal && dl.shop.tabs[0].items.length === 1, "deleted + removed from tabs");
  });
  await t("events (v946): admins make events; claims checked against the saved power and the player's own window", async () => {
    await fnErr(A.call("adminSaveEvents", { events: [] }), /admin only|permission/);
    const r = await ADM.call("adminSaveEvents", { events: [{ name: "Burst of Life", tag: "Beginner", goal: "power", schedule: { type: "newplayer", days: 7 }, milestones: [{ target: 50000, worth: 300, items: { gems: 100, wood: 1000 } }, { target: 4000000, worth: 54000, items: { skin_city_titan: 1 } }] }] });
    assert.strictEqual(r.events[0].id, "burst_of_life");
    const cfg = await getDoc(doc(A.db, P("config/events"))); assert.strictEqual(cfg.data().events[0].milestones.length, 2, "players can read events");
    await denied(setDoc(doc(A.db, P("config/events")), { events: [] }));
    await A.call("touch"); /* account created now -> the 7-day window is open */
    await setDoc(doc(A.db, P("players/" + A.uid + "/save/main")), { power: 20000 });
    await fnErr(A.call("claimEvent", { event: "burst_of_life", idx: 0 }), /not reached/);
    await setDoc(doc(A.db, P("players/" + A.uid + "/save/main")), { power: 60000 });
    const c = await A.call("claimEvent", { event: "burst_of_life", idx: 0 }); assert.ok(!c.dup && c.items.gems === 100);
    assert.ok((await A.call("claimEvent", { event: "burst_of_life", idx: 0 })).dup, "once");
    await fnErr(A.call("claimEvent", { event: "burst_of_life", idx: 1 }), /not reached/);
  });
  await t("maintenance (v942): admin switch; players locked out of saves and server calls; admins and the other env unaffected", async () => {
    await fnErr(A.call("adminMaintenance", { set: { on: true } }), /admin only|permission/);
    let m = await ADM.call("adminMaintenance", { set: { on: true, msg: "Upgrading the forge", until: 1893456000000 } }); assert.strictEqual(m.on, true); assert.strictEqual(m.msg, "Upgrading the forge");
    const cfg = await getDoc(doc(A.db, P("config/maintenance"))); assert.strictEqual(cfg.data().on, true, "players can read the switch");
    await denied(setDoc(doc(A.db, P("config/maintenance")), { on: false }));
    await denied(setDoc(doc(A.db, P("players/" + A.uid + "/save/main")), { x: 2 }));
    await sleep(11000); /* each server instance re-reads the switch at most every 10 s (the save lock in the rules is instant) */
    await fnErr(A.call("claimLevel", { chapter: 1, levelNum: 2 }), /maintenance|unavailable/);
    await fnErr(A.call("claimMail", { id: "x" }), /maintenance|unavailable/);
    const f = await ADM.call("adminFindPlayers", { q: A.uid }); assert.strictEqual(f.players[0].uid, A.uid, "admins still work");
    await setDoc(doc(ADM.db, P("players/" + ADM.uid + "/save/main")), { x: 1 }); /* admin can still save */
    await setDoc(doc(A.db, "players/" + A.uid + "/save/main"), { x: 3 }); /* live env is not in maintenance */
    m = await ADM.call("adminMaintenance", { set: { on: false } }); assert.strictEqual(m.on, false);
    await setDoc(doc(A.db, P("players/" + A.uid + "/save/main")), { x: 4 });
    m = await ADM.call("adminMaintenance", {}); assert.strictEqual(m.on, false, "read without changing");
  });
  await t("security panel (v995): suspend / ban lock saves + server calls, the player sees their own notice, rollback restores the pre-flag save, auto-rollback, restrict", async () => {
    await fnErr(Cc.call("adminSecAction", { uid: B.uid, action: "ban" }), /admin only|permission/);
    await fnErr(Cc.call("adminSecOverview", {}), /admin only|permission/);
    await setDoc(doc(Cc.db, P("players/" + Cc.uid + "/save/main")), { resources: { food: 500, wood: 500, stone: 300, gold: 100 }, idle: { chapter: 1, levelNum: 1 } });
    /* suspend: rules refuse writes at once, the player can read (only) their own ban doc, server calls refused */
    let r = await ADM.call("adminSecAction", { uid: Cc.uid, action: "suspend", hours: 2, note: "test" }); assert.strictEqual(r.ban.kind, "suspend");
    await denied(setDoc(doc(Cc.db, P("players/" + Cc.uid + "/save/main")), { x: 1 }));
    const own = await getDoc(doc(Cc.db, P("bans/" + Cc.uid))); assert.strictEqual(own.data().kind, "suspend");
    await denied(getDoc(doc(Cc.db, P("bans/" + B.uid))));
    await denied(setDoc(doc(Cc.db, P("bans/" + Cc.uid)), { kind: "none" }));
    await sleep(16000); /* the server re-reads a ban at most every 15 s per instance (the rules are instant) */
    await fnErr(Cc.call("claimLevel", { chapter: 1, levelNum: 2 }), /suspended|permission/);
    await ADM.call("adminSecAction", { uid: Cc.uid, action: "unsuspend" });
    await setDoc(doc(Cc.db, P("players/" + Cc.uid + "/save/main")), { resources: { food: 500, wood: 500, stone: 300, gold: 100 }, idle: { chapter: 1, levelNum: 1 } });
    /* ban: same lock, no end date */
    await ADM.call("adminSecAction", { uid: Cc.uid, action: "ban" }); await denied(setDoc(doc(Cc.db, P("players/" + Cc.uid + "/save/main")), { x: 2 }));
    await ADM.call("adminSecAction", { uid: Cc.uid, action: "unban" });
    /* a cheat jump -> flag + snapshot of the save before it -> rollback puts that save back (and backs up the cheated one) */
    await sleep(1500);
    await setDoc(doc(Cc.db, P("players/" + Cc.uid + "/save/main")), { resources: { food: 500, wood: 500, stone: 300, gold: 9e9 }, idle: { chapter: 1, levelNum: 1 } });
    let f = null; for (let i = 0; i < 20 && !(f && f.exists()); i++) { await sleep(1000); f = await getDoc(doc(ADM.db, P("acplayers/" + Cc.uid))); }
    assert.ok(f && f.exists() && f.data().snapAt, "flag with a snapshot");
    const ov = await ADM.call("adminSecOverview", {}); assert.ok(ov.feed.some((e) => e.uid === Cc.uid) && ov.summary.flags24h >= 1 && ov.players.some((p) => p.uid === Cc.uid));
    r = await ADM.call("adminSecAction", { uid: Cc.uid, action: "rollback" }); assert.ok(r.ok && r.ban && r.ban.kind === "restore");
    const sv = await getDoc(doc(ADM.db, P("players/" + Cc.uid + "/save/main"))); assert.strictEqual(sv.data().resources.gold, 100, "pre-flag save restored");
    await denied(setDoc(doc(Cc.db, P("players/" + Cc.uid + "/save/main")), { x: 3 })); /* their old open game can't overwrite it for a minute */
    const au = await ADM.call("adminSecAudit", {}); assert.ok(au.rows.some((x) => x.action === "rollback" && x.target === Cc.uid) && au.rows.some((x) => x.action === "suspend"));
    /* auto-rollback switch: a flagged save is put back by the server */
    let c = await ADM.call("adminSecConfig", { autoRevert: true, limits: { res: { perSec: 150 } } }); assert.strictEqual(c.config.autoRevert, true); assert.strictEqual(c.config.limits.res.perSec, 150);
    await sleep(16000);
    await setDoc(doc(B.db, P("players/" + B.uid + "/save/main")), { resources: { food: 500, wood: 500, stone: 300, gold: 100 }, idle: { chapter: 1, levelNum: 1 } });
    await sleep(1500);
    await setDoc(doc(B.db, P("players/" + B.uid + "/save/main")), { resources: { food: 500, wood: 500, stone: 300, gold: 9e9 }, idle: { chapter: 1, levelNum: 1 } });
    let g = 9e9; for (let i = 0; i < 20 && g === 9e9; i++) { await sleep(1000); g = (await getDoc(doc(B.db, P("players/" + B.uid + "/save/main")))).data().resources.gold; }
    assert.strictEqual(g, 100, "auto-rollback put the save back");
    c = await ADM.call("adminSecConfig", { autoRevert: false }); assert.strictEqual(c.config.autoRevert, false);
    /* restrict: no event rewards */
    await ADM.call("adminSecAction", { uid: B.uid, action: "restrict" });
    await setDoc(doc(B.db, P("players/" + B.uid + "/save/main")), { power: 60000 });
    await fnErr(B.call("claimEvent", { event: "burst_of_life", idx: 0 }), /restricted|permission/);
    await ADM.call("adminSecAction", { uid: B.uid, action: "unrestrict" });
    await fnErr(ADM.call("adminSecAction", { uid: ADM.uid, action: "ban" }), /admin account|failed-precondition/);
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
