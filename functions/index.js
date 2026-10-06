// Kingdom Strategy - Cloud Functions. Everything worth gems happens here, never on the player's device.
// Callable from the game with firebase.functions().httpsCallable(name)({ env, ... }). env = "live" | "test".
"use strict";
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const C = require("./core");
const ADMIN_UIDS = require("./admins.json");
const PACKS = require("./packs.json");

initializeApp();
setGlobalOptions({ region: "us-central1", maxInstances: 20, invoker: "public" }); /* reachable by the game; every function still checks the signed-in player itself */
const db = getFirestore();

function uidOf(req) {
  const a = req.auth;
  if (!a) throw new HttpsError("unauthenticated", "sign in first");
  if (a.token && a.token.firebase && a.token.firebase.sign_in_provider === "anonymous") throw new HttpsError("permission-denied", "guest accounts can't do this");
  return a.uid;
}
function isAdmin(uid) { return ADMIN_UIDS.indexOf(uid) !== -1; }
function wrap(fn) {
  return onCall(async (req) => {
    try { return await fn(req, uidOf(req), C.envRoot((req.data || {}).env), req.data || {}); }
    catch (e) {
      if (e instanceof HttpsError) throw e;
      if (e instanceof C.GameError) throw new HttpsError(e.code, e.message, e.extra);
      console.error(e); throw new HttpsError("internal", "server error");
    }
  });
}
const walletRef = (R, uid) => db.doc(R + "players/" + uid + "/wallet/main");
const cityRef = (R, tileId) => db.doc(R + "cities/" + C.cityDocId(tileId));
// Server-only ledger: players/<uid>/ledger/<auto id>. Written in the same transaction as the change it records, so the two can't disagree.
function ledger(tx, R, uid, item, delta, balance, reason, ref, by) { tx.set(db.collection(R + "players/" + uid + "/ledger").doc(), C.ledgerEntry(item, delta, balance, reason, ref, by, Date.now())); }

// Pay 50 gems for the next Conquest level. Order + speed checked against the game's own pacing.
exports.claimLevel = wrap(async (req, uid, R, d) => {
  const g = C.globalLevel(d.chapter, d.levelNum);
  return db.runTransaction(async (tx) => {
    const ws = await tx.get(walletRef(R, uid));
    const r = C.decideLevelClaim(ws.exists ? ws.data() : null, g, Date.now());
    if (r.wallet) { tx.set(walletRef(R, uid), r.wallet, { merge: true }); ledger(tx, R, uid, "gems", C.LEVEL_CLEAR_GEMS, r.gems, "level_clear", "level " + g); }
    return { gems: r.gems, lvl: r.wallet ? r.wallet.lvl : (ws.data() || {}).lvl, dup: r.dup };
  });
});

function ownCityCheck(city, uid) { if (!city || city.owner !== uid) throw new C.GameError("permission-denied", "not_your_city"); }

exports.extinguishBase = wrap(async (req, uid, R, d) => db.runTransaction(async (tx) => {
  const cs = await tx.get(cityRef(R, d.tileId)), ws = await tx.get(walletRef(R, uid));
  const city = cs.exists ? cs.data() : null; ownCityCheck(city, uid);
  const r = C.decideExtinguish(city, Date.now()), left = C.needGems(ws.data(), r.cost);
  tx.set(walletRef(R, uid), { gems: left }, { merge: true }); tx.update(cityRef(R, d.tileId), r.cityPatch); ledger(tx, R, uid, "gems", -r.cost, left, "extinguish", d.tileId);
  return { gems: left, city: r.cityPatch };
}));

exports.repairBase = wrap(async (req, uid, R, d) => db.runTransaction(async (tx) => {
  const cs = await tx.get(cityRef(R, d.tileId)), ws = await tx.get(walletRef(R, uid));
  const city = cs.exists ? cs.data() : null; ownCityCheck(city, uid);
  const r = C.decideRepair(city, Date.now()), left = C.needGems(ws.data(), r.cost);
  tx.set(walletRef(R, uid), { gems: left }, { merge: true }); tx.update(cityRef(R, d.tileId), r.cityPatch); ledger(tx, R, uid, "gems", -r.cost, left, "repair", d.tileId);
  return { gems: left, city: r.cityPatch };
}));

async function sameAlliance(tx, R, a, b) {
  const [x, y] = await Promise.all([tx.get(db.doc(R + "allyindex/" + a)), tx.get(db.doc(R + "allyindex/" + b))]);
  return x.exists && y.exists && !!x.data().aid && x.data().aid === y.data().aid;
}

// Allies put each other's fires out for free.
exports.extinguishAllyBase = wrap(async (req, uid, R, d) => db.runTransaction(async (tx) => {
  const cs = await tx.get(cityRef(R, d.tileId)); const city = cs.exists ? cs.data() : null;
  if (!city) throw new C.GameError("not-found", "no_city");
  if (city.owner === uid) throw new C.GameError("failed-precondition", "use_extinguishBase");
  if (!(await sameAlliance(tx, R, uid, city.owner))) throw new C.GameError("permission-denied", "not_allies");
  const r = C.decideExtinguish(city, Date.now(), { free: true });
  tx.update(cityRef(R, d.tileId), r.cityPatch);
  return { city: r.cityPatch };
}));

// A won attack on someone's city. No friendly fire, one hit per attacker per target every 30s.
exports.hitBase = wrap(async (req, uid, R, d) => db.runTransaction(async (tx) => {
  const cs = await tx.get(cityRef(R, d.tileId)); const city = cs.exists ? cs.data() : null;
  if (!city) throw new C.GameError("not-found", "no_city");
  if (city.owner === uid) throw new C.GameError("failed-precondition", "own_city");
  if (city.owner && !String(city.owner).startsWith("bot_") && await sameAlliance(tx, R, uid, city.owner)) throw new C.GameError("failed-precondition", "ally_city");
  const limRef = db.doc(R + "players/" + uid + "/wallet/hits_" + C.cityDocId(d.tileId));
  const lim = await tx.get(limRef); C.checkHitCooldown(lim.exists ? lim.data().at : 0, Date.now());
  const now = Date.now(), r = C.decideHit(city, now);
  tx.update(cityRef(R, d.tileId), r.cityPatch); tx.set(limRef, { at: now });
  return { before: r.before, after: r.after, zeroed: r.zeroed, city: r.cityPatch };
}));

// Admin only: add or remove gems (testing now, pack purchases later).
exports.adminGrantGems = wrap(async (req, uid, R, d) => {
  if (!isAdmin(uid)) throw new HttpsError("permission-denied", "admin only");
  const target = String(d.uid || ""), amount = Math.trunc(+d.amount || 0);
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(target) || !amount || Math.abs(amount) > 1e7) throw new HttpsError("invalid-argument", "bad uid/amount");
  return db.runTransaction(async (tx) => {
    const ws = await tx.get(walletRef(R, target)), before = (ws.data() || {}).gems || 0, gems = Math.max(0, before + amount);
    tx.set(walletRef(R, target), { gems }, { merge: true }); ledger(tx, R, target, "gems", gems - before, gems, "admin_grant", String(d.note || "").slice(0, 200), uid);
    tx.set(db.collection(R + "adminlog").doc(), { by: uid, uid: target, amount, at: Date.now() });
    return { gems };
  });
});

// Admin only: set a player's wallet outright (used once when moving an existing save across).
exports.adminSetWallet = wrap(async (req, uid, R, d) => {
  if (!isAdmin(uid)) throw new HttpsError("permission-denied", "admin only");
  const target = String(d.uid || ""), gems = Math.trunc(+d.gems), lvl = Math.trunc(+d.lvl);
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(target) || !(gems >= 0) || !(lvl >= 0)) throw new HttpsError("invalid-argument", "bad values");
  return db.runTransaction(async (tx) => {
    const ws = await tx.get(walletRef(R, target)), before = (ws.data() || {}).gems || 0;
    tx.set(walletRef(R, target), { gems, lvl, lvlAt: Date.now() }, { merge: true });
    ledger(tx, R, target, "gems", gems - before, gems, "admin_set", "level " + lvl, uid);
    tx.set(db.collection(R + "adminlog").doc(), { by: uid, uid: target, setWallet: { gems, lvl }, at: Date.now() });
    return { gems, lvl };
  });
});

// Move my city to another tile. Done on the server so damage and fire move with it (teleporting can't be used as a free repair).
exports.relocateCity = wrap(async (req, uid, R, d) => db.runTransaction(async (tx) => {
  const fromRef = cityRef(R, d.from), toRef = cityRef(R, d.to);
  if (fromRef.path === toRef.path) throw new C.GameError("invalid-argument", "same_tile");
  const [fs, ts] = await Promise.all([tx.get(fromRef), tx.get(toRef)]);
  const from = fs.exists ? fs.data() : null; ownCityCheck(from, uid);
  if (ts.exists && ts.data() && ts.data().owner) throw new C.GameError("failed-precondition", "taken");
  const moved = { owner: uid, claimedAt: Date.now() };
  ["hp", "hpT", "burnLeft", "raidedAt"].forEach((k) => { if (from[k] !== undefined) moved[k] = from[k]; });
  tx.set(toRef, moved); tx.delete(fromRef);
  return { ok: true };
}));

// ---- purchases ----
// Delivers a paid pack exactly once per payment receipt: purchases/<provider>_<receipt> + wallet + ledger, all in one transaction.
// For now only an admin can call it (testing, or fixing a payment that didn't come through). When a payment provider is connected,
// its server-to-server webhook will call the same deliverPurchase() after verifying the payment.
async function deliverPurchase(R, uid, packId, provider, receiptId, by) {
  const id = C.purchaseId(provider, receiptId), pref = db.doc(R + "purchases/" + id);
  return db.runTransaction(async (tx) => {
    const [ps, ws] = await Promise.all([tx.get(pref), tx.get(walletRef(R, uid))]);
    const r = C.decidePurchase(ps.exists ? ps.data() : null, PACKS[packId], packId, ws.data(), uid, Date.now());
    if (r.dup) return { dup: true, id, record: r.record };
    const rec = Object.assign({ provider, receiptId: String(receiptId) }, r.record); if (by) rec.deliveredBy = by;
    tx.set(pref, rec); tx.set(walletRef(R, uid), { gems: r.gems }, { merge: true });
    ledger(tx, R, uid, "gems", r.add, r.gems, "purchase", id, by);
    return { dup: false, id, gems: r.gems, record: rec };
  });
}
exports.adminDeliverPurchase = wrap(async (req, uid, R, d) => {
  if (!isAdmin(uid)) throw new HttpsError("permission-denied", "admin only");
  const target = String(d.uid || ""); if (!/^[A-Za-z0-9_-]{6,128}$/.test(target)) throw new HttpsError("invalid-argument", "bad uid");
  return deliverPurchase(R, target, String(d.pack || ""), String(d.provider || "manual"), String(d.receiptId || ""), uid);
});
// Mark a purchase refunded / charged back. Records it (and who did it); what to do about the gems is your call, so nothing is taken back automatically.
exports.adminMarkPurchase = wrap(async (req, uid, R, d) => {
  if (!isAdmin(uid)) throw new HttpsError("permission-denied", "admin only");
  const status = String(d.status || ""); if (["refunded", "chargeback", "delivered"].indexOf(status) === -1) throw new HttpsError("invalid-argument", "bad status");
  const pref = db.doc(R + "purchases/" + String(d.id || "").replace(/[^A-Za-z0-9_-]/g, "-"));
  return db.runTransaction(async (tx) => {
    const ps = await tx.get(pref); if (!ps.exists) throw new C.GameError("not-found", "no such purchase");
    const patch = { status, statusAt: Date.now(), statusBy: uid, statusNote: String(d.note || "").slice(0, 300) };
    tx.update(pref, patch); return Object.assign({}, ps.data(), patch);
  });
});

// ---- account dates ----
// "Account created" and "last seen" only. No IPs, devices or sessions. Called by the game once per session (and at most hourly).
exports.touch = wrap(async (req, uid, R) => {
  const ref = db.doc(R + "players/" + uid + "/meta/account"), now = Date.now();
  return db.runTransaction(async (tx) => {
    const s = await tx.get(ref), d = s.exists ? s.data() : {};
    if (d.lastSeen && now - d.lastSeen < 10 * 60 * 1000) return { createdAt: d.createdAt, lastSeen: d.lastSeen };
    const out = { createdAt: d.createdAt || now, lastSeen: now }; tx.set(ref, out, { merge: true }); return out;
  });
});

// ---- mail (admin gifts of any catalogue item) ----
const mailCol = (R, uid) => db.collection(R + "players/" + uid + "/mail");
function adminOnly(uid) { if (!isAdmin(uid)) throw new HttpsError("permission-denied", "admin only"); }
function validUid(u) { u = String(u || ""); if (!/^[A-Za-z0-9_-]{6,128}$/.test(u)) throw new HttpsError("invalid-argument", "bad uid"); return u; }
async function allPlayerIds(R) { /* every player that has data in this environment (bots excluded) */
  const refs = await db.collection(R + "players").listDocuments();
  return refs.map((r) => r.id).filter((id) => !id.startsWith("bot_") && !id.startsWith("guest-"));
}

// Send a mail with items to one player (uid) or everyone (all: true). Nothing is given until the player claims it.
exports.adminSendMail = wrap(async (req, uid, R, d) => {
  adminOnly(uid);
  const mail = C.makeMail(d.title, d.body, d.items, uid, Date.now());
  const targets = d.all === true ? await allPlayerIds(R) : [validUid(d.uid)];
  for (let i = 0; i < targets.length; i += 400) {
    const batch = db.batch();
    targets.slice(i, i + 400).forEach((t) => batch.set(mailCol(R, t).doc(), mail));
    await batch.commit();
  }
  await db.collection(R + "adminlog").add({ by: uid, mail: { title: mail.title, items: mail.items }, to: d.all === true ? "ALL" : targets[0], count: targets.length, at: Date.now() });
  return { sent: targets.length };
});

// Player claims a mail: once only. Server-held items (gems) are added here; save items are returned for the game to add to the save.
exports.claimMail = wrap(async (req, uid, R, d) => {
  const ref = mailCol(R, uid).doc(String(d.id || "x").replace(/[^A-Za-z0-9_-]/g, ""));
  return db.runTransaction(async (tx) => {
    const [ms, ws] = await Promise.all([tx.get(ref), tx.get(walletRef(R, uid))]);
    const r = C.decideMailClaim(ms.exists ? ms.data() : null, Date.now());
    if (r.dup) return { dup: true, id: ref.id, items: r.list, claimedAt: ms.data().claimedAt };
    let gems = (ws.data() || {}).gems || 0, walletPatch = null;
    r.list.forEach((x) => {
      if (x.kind === "wallet" && x.id === "gems") { gems += x.qty; walletPatch = { gems }; ledger(tx, R, uid, "gems", x.qty, gems, "mail", ref.id); }
      else ledger(tx, R, uid, x.id, x.qty, null, "mail", ref.id);
    });
    if (walletPatch) tx.set(walletRef(R, uid), walletPatch, { merge: true });
    tx.update(ref, r.patch);
    return { dup: false, id: ref.id, items: r.list, gems, claimedAt: r.patch.claimedAt };
  });
});

// ---- admin panel lookups ----
exports.adminCatalog = wrap(async (req, uid) => { adminOnly(uid); return { items: C.ITEMS, packs: PACKS }; });

const NAME_DOC = "assetitems/kingdom_prototype_playername_v1";
exports.adminFindPlayers = wrap(async (req, uid, R, d) => {
  adminOnly(uid);
  const q = String(d.q || "").trim().toLowerCase(); if (!q) throw new HttpsError("invalid-argument", "type a name or player id");
  const ids = (await allPlayerIds(R)).slice(0, 5000);
  if (!ids.length) return { players: [] };
  const nameSnaps = await db.getAll(...ids.map((id) => db.doc(R + "players/" + id + "/" + NAME_DOC)));
  const hits = [];
  ids.forEach((id, i) => { const n = nameSnaps[i].exists ? String((nameSnaps[i].data() || {}).data || "") : ""; if (id.toLowerCase() === q || id.toLowerCase().startsWith(q) || (n && n.toLowerCase().includes(q))) hits.push({ uid: id, name: n }); });
  const top = hits.slice(0, 25);
  if (top.length) { const metas = await db.getAll(...top.map((h) => db.doc(R + "players/" + h.uid + "/meta/account"))); top.forEach((h, i) => { const m = metas[i].exists ? metas[i].data() : {}; h.lastSeen = m.lastSeen || null; h.createdAt = m.createdAt || null; }); }
  return { players: top, total: hits.length };
});

exports.adminPlayerInfo = wrap(async (req, uid, R, d) => {
  adminOnly(uid);
  const t = validUid(d.uid), base = R + "players/" + t + "/";
  const [w, m, n, led, mail, pur] = await Promise.all([
    db.doc(base + "wallet/main").get(), db.doc(base + "meta/account").get(), db.doc(base + NAME_DOC).get(),
    db.collection(base + "ledger").orderBy("at", "desc").limit(200).get(),
    db.collection(base + "mail").orderBy("sentAt", "desc").limit(100).get(),
    db.collection(R + "purchases").where("uid", "==", t).get()
  ]);
  const purchases = pur.docs.map((x) => Object.assign({ id: x.id }, x.data())).sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, 100);
  return { uid: t, name: n.exists ? (n.data() || {}).data || "" : "", wallet: w.exists ? w.data() : {}, meta: m.exists ? m.data() : {},
    ledger: led.docs.map((x) => Object.assign({ id: x.id }, x.data())), mail: mail.docs.map((x) => Object.assign({ id: x.id }, x.data())), purchases };
});
