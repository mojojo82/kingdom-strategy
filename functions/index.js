// Kingdom Strategy - Cloud Functions. Everything worth gems happens here, never on the player's device.
// Callable from the game with firebase.functions().httpsCallable(name)({ env, ... }). env = "live" | "test".
"use strict";
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const C = require("./core");
const ADMIN_UIDS = require("./admins.json");

initializeApp();
setGlobalOptions({ region: "us-central1", maxInstances: 20 });
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

// Pay 50 gems for the next Conquest level. Order + speed checked against the game's own pacing.
exports.claimLevel = wrap(async (req, uid, R, d) => {
  const g = C.globalLevel(d.chapter, d.levelNum);
  return db.runTransaction(async (tx) => {
    const ws = await tx.get(walletRef(R, uid));
    const r = C.decideLevelClaim(ws.exists ? ws.data() : null, g, Date.now());
    if (r.wallet) tx.set(walletRef(R, uid), r.wallet, { merge: true });
    return { gems: r.gems, lvl: r.wallet ? r.wallet.lvl : (ws.data() || {}).lvl, dup: r.dup };
  });
});

function ownCityCheck(city, uid) { if (!city || city.owner !== uid) throw new C.GameError("permission-denied", "not_your_city"); }

exports.extinguishBase = wrap(async (req, uid, R, d) => db.runTransaction(async (tx) => {
  const cs = await tx.get(cityRef(R, d.tileId)), ws = await tx.get(walletRef(R, uid));
  const city = cs.exists ? cs.data() : null; ownCityCheck(city, uid);
  const r = C.decideExtinguish(city, Date.now()), left = C.needGems(ws.data(), r.cost);
  tx.set(walletRef(R, uid), { gems: left }, { merge: true }); tx.update(cityRef(R, d.tileId), r.cityPatch);
  return { gems: left, city: r.cityPatch };
}));

exports.repairBase = wrap(async (req, uid, R, d) => db.runTransaction(async (tx) => {
  const cs = await tx.get(cityRef(R, d.tileId)), ws = await tx.get(walletRef(R, uid));
  const city = cs.exists ? cs.data() : null; ownCityCheck(city, uid);
  const r = C.decideRepair(city, Date.now()), left = C.needGems(ws.data(), r.cost);
  tx.set(walletRef(R, uid), { gems: left }, { merge: true }); tx.update(cityRef(R, d.tileId), r.cityPatch);
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
    const ws = await tx.get(walletRef(R, target)), gems = Math.max(0, ((ws.data() || {}).gems || 0) + amount);
    tx.set(walletRef(R, target), { gems }, { merge: true });
    tx.set(db.collection(R + "adminlog").doc(), { by: uid, uid: target, amount, at: Date.now() });
    return { gems };
  });
});

// Admin only: set a player's wallet outright (used once when moving an existing save across).
exports.adminSetWallet = wrap(async (req, uid, R, d) => {
  if (!isAdmin(uid)) throw new HttpsError("permission-denied", "admin only");
  const target = String(d.uid || ""), gems = Math.trunc(+d.gems), lvl = Math.trunc(+d.lvl);
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(target) || !(gems >= 0) || !(lvl >= 0)) throw new HttpsError("invalid-argument", "bad values");
  await walletRef(R, target).set({ gems, lvl, lvlAt: Date.now() }, { merge: true });
  await db.collection(R + "adminlog").add({ by: uid, uid: target, setWallet: { gems, lvl }, at: Date.now() });
  return { gems, lvl };
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
