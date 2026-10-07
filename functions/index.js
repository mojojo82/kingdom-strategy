// Kingdom Strategy - Cloud Functions. Everything worth gems happens here, never on the player's device.
// Callable from the game with firebase.functions().httpsCallable(name)({ env, ... }). env = "live" | "test".
"use strict";
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
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
/* Admin = on the admin list AND signed in with Google (2-step verification is enforced by Google). The local emulator (tests) accepts any sign-in. */
function isAdmin(uid, req) { const prov = req && req.auth && req.auth.token && req.auth.token.firebase ? req.auth.token.firebase.sign_in_provider : null; return ADMIN_UIDS.indexOf(uid) !== -1 && (prov === "google.com" || process.env.FUNCTIONS_EMULATOR === "true"); }
/* v942: maintenance mode. <root>config/maintenance { on, msg, until, by, at }. While on, every call from a non-admin is refused
   (saves to Firestore are refused by the rules too). Read at most every 10 s per server instance. */
const maintCache = {};
async function maintOn(R) {
  const c = maintCache[R], now = Date.now();
  if (c && now - c.t < 10000) return c.on;
  let on = false; try { const s = await db.doc(R + "config/maintenance").get(); on = !!(s.exists && s.data().on === true); } catch (e) { on = c ? c.on : false; }
  maintCache[R] = { on, t: now }; return on;
}
function wrap(fn) {
  return onCall(async (req) => {
    try {
      const uid = uidOf(req), R = C.envRoot((req.data || {}).env);
      if (!isAdmin(uid, req) && await maintOn(R)) throw new HttpsError("unavailable", "maintenance");
      return await fn(req, uid, R, req.data || {});
    }
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
  if (!isAdmin(uid, req)) throw new HttpsError("permission-denied", "admin only");
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
  if (!isAdmin(uid, req)) throw new HttpsError("permission-denied", "admin only");
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
/* v943: packs live in <root>packs/<id> (made in the admin panel); packs.json keeps the built-in test pack. */
async function loadPack(R, packId) {
  const id = String(packId || "").replace(/[^A-Za-z0-9_-]/g, ""); if (!id) return null;
  const s = await db.doc(R + "packs/" + id).get(); if (s.exists) return s.data();
  return PACKS[id] && id[0] !== "_" ? PACKS[id] : null;
}
async function allPacks(R) {
  const out = {}; Object.keys(PACKS).forEach((k) => { if (k[0] !== "_") out[k] = Object.assign({ builtIn: true, shop: false, mail: false, active: true }, PACKS[k]); });
  const qs = await db.collection(R + "packs").get(); qs.docs.forEach((d) => { out[d.id] = d.data(); });
  return out;
}
async function deliverPurchase(R, uid, packId, provider, receiptId, by) {
  const id = C.purchaseId(provider, receiptId), pref = db.doc(R + "purchases/" + id), pack = await loadPack(R, packId);
  const shop = await shopConfig(R, null), points = pack ? (((shop.tiers || {})[pack.tier || 0] || {}).points || 0) : 0; /* v945: top-up points */
  if (pack && pack.limit) { /* v943: buy limits (once ever, or N per day/week/month) */
    const ex = await pref.get();
    if (!ex.exists) {
      const qs = await db.collection(R + "purchases").where("uid", "==", uid).get();
      const mine = qs.docs.map((d) => d.data()).filter((r) => r.pack === packId);
      if (C.packBuysLeft(pack, mine, Date.now()) <= 0) throw new C.GameError("failed-precondition", "buy limit reached for " + (pack.name || packId), { resetsAt: C.limitPeriodEnd(pack.reset, Date.now()) });
    }
  }
  return db.runTransaction(async (tx) => {
    const [ps, ws] = await Promise.all([tx.get(pref), tx.get(walletRef(R, uid))]);
    const r = C.decidePurchase(ps.exists ? ps.data() : null, pack, packId, ws.data(), uid, Date.now());
    if (r.dup) return { dup: true, id, record: r.record };
    const rec = Object.assign({ provider, receiptId: String(receiptId) }, r.record); if (by) rec.deliveredBy = by;
    if (Object.keys(r.others).length) { /* resources, shards etc. live in the player's save: they arrive as a mail to claim */
      const mref = mailCol(R, uid).doc(); rec.mailId = mref.id;
      tx.set(mref, C.makeMail("🛒 " + (pack.name || packId), "Thanks for your purchase! Here are your items.", r.others, "shop", Date.now(), "system"));
    }
    rec.points = points; const wd = ws.data() || {}, wpatch = {};
    if (r.add > 0) { wpatch.gems = r.gems; ledger(tx, R, uid, "gems", r.add, r.gems, "purchase", id, by); }
    if (points > 0) { wpatch.topup = C.addTopup(wd.topup, shop.topups, points, Date.now()); } /* the purchase record keeps .points */
    tx.set(pref, rec); if (Object.keys(wpatch).length) tx.set(walletRef(R, uid), wpatch, { merge: true });
    return { dup: false, id, gems: r.gems, record: rec };
  });
}
exports.adminDeliverPurchase = wrap(async (req, uid, R, d) => {
  if (!isAdmin(uid, req)) throw new HttpsError("permission-denied", "admin only");
  const target = String(d.uid || ""); if (!/^[A-Za-z0-9_-]{6,128}$/.test(target)) throw new HttpsError("invalid-argument", "bad uid");
  return deliverPurchase(R, target, String(d.pack || ""), String(d.provider || "manual"), String(d.receiptId || ""), uid);
});
// v945: a player claims a top-up milestone they've reached. Gems go to the wallet, everything else arrives by mail (like packs).
exports.claimTopup = wrap(async (req, uid, R, d) => {
  const shop = await shopConfig(R, null), ladder = (shop.topups || []).find((l) => l.id === String(d.ladder || "")), idx = Math.trunc(+d.idx);
  return db.runTransaction(async (tx) => {
    const ws = await tx.get(walletRef(R, uid)), wd = ws.data() || {};
    const r = C.decideTopupClaim(wd.topup, ladder, idx, Date.now());
    if (r.dup) return { dup: true, topup: wd.topup || null, gems: wd.gems || 0 };
    const patch = { topup: r.topup }, gems = Math.trunc(r.items.gems || 0), others = {}; Object.keys(r.items).forEach((k) => { if (k !== "gems") others[k] = r.items[k]; });
    let g = wd.gems || 0; if (gems > 0) { g += gems; patch.gems = g; ledger(tx, R, uid, "gems", gems, g, "topup_reward", ladder.id + "#" + idx); }
    if (Object.keys(others).length) tx.set(mailCol(R, uid).doc(), C.makeMail("🏆 " + ladder.name + " reward", "You reached " + ladder.tiers[idx].points.toLocaleString() + " top-up points!", others, "topup", Date.now(), "system"));
    tx.set(walletRef(R, uid), patch, { merge: true });
    return { dup: false, topup: r.topup, gems: g, items: r.items };
  });
});
// Mark a purchase refunded / charged back. Records it (and who did it); what to do about the gems is your call, so nothing is taken back automatically.
exports.adminMarkPurchase = wrap(async (req, uid, R, d) => {
  if (!isAdmin(uid, req)) throw new HttpsError("permission-denied", "admin only");
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
function adminOnly(uid, req) { if (!isAdmin(uid, req)) throw new HttpsError("permission-denied", "admin only"); }
function validUid(u) { u = String(u || ""); if (!/^[A-Za-z0-9_-]{6,128}$/.test(u)) throw new HttpsError("invalid-argument", "bad uid"); return u; }
async function allPlayerIds(R) { /* every player that has data in this environment (bots excluded) */
  const refs = await db.collection(R + "players").listDocuments();
  return refs.map((r) => r.id).filter((id) => !id.startsWith("bot_") && !id.startsWith("guest-"));
}

// Send a mail with items to one player (uid) or everyone (all: true). Nothing is given until the player claims it.
exports.adminSendMail = wrap(async (req, uid, R, d) => {
  adminOnly(uid, req);
  const mail = C.makeMail(d.title, d.body, d.items, uid, Date.now(), d.category);
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
// v942: maintenance switch. { set: { on, msg, until } } changes it; always returns the current state.
exports.adminMaintenance = wrap(async (req, uid, R, d) => {
  adminOnly(uid, req);
  const ref = db.doc(R + "config/maintenance");
  if (d.set && typeof d.set === "object") {
    const m = { on: d.set.on === true, msg: String(d.set.msg || "").trim().slice(0, 300), until: Number.isFinite(+d.set.until) && +d.set.until > 0 ? +d.set.until : null, by: uid, at: Date.now() };
    await ref.set(m); maintCache[R] = { on: m.on, t: Date.now() };
    await db.collection(R + "adminlog").add({ by: uid, maintenance: { on: m.on, msg: m.msg, until: m.until }, at: m.at });
  }
  const s = await ref.get(); return s.exists ? s.data() : { on: false, msg: "", until: null };
});
async function shopConfig(R, packIds) {
  const s = await db.doc(R + "config/shop").get(); const d = s.exists ? s.data() : {};
  try { return C.normalizeShop({ tiers: d.tiers, topups: d.topups, tabs: (d.tabs || []).map((t) => Object.assign({}, t, { items: (t.items || []).filter((e) => !packIds || packIds.indexOf(e.pack) >= 0) })) }, null); }
  catch (e) { return C.normalizeShop({}, null); }
}
async function eventsConfig(R) { const s = await db.doc(R + "config/events").get(); try { return C.normalizeEvents(s.exists ? s.data().events : []); } catch (e) { return []; } }
exports.adminCatalog = wrap(async (req, uid, R) => { adminOnly(uid, req); const packs = await allPacks(R); return { items: C.ITEMS, packs, shop: await shopConfig(R, Object.keys(packs)), events: await eventsConfig(R), currencies: C.SHOP_CURRENCIES, resets: C.PACK_RESETS }; });
// v946: events (Burst of Life etc). Players read <root>config/events; only this function writes it.
exports.adminSaveEvents = wrap(async (req, uid, R, d) => {
  adminOnly(uid, req);
  const events = C.normalizeEvents(d.events);
  await db.doc(R + "config/events").set({ events, updatedAt: Date.now(), updatedBy: uid });
  await db.collection(R + "adminlog").add({ by: uid, events: events.map((e) => e.name + ":" + e.milestones.length), at: Date.now() });
  return { events };
});
// v946: a player claims an event milestone. Progress comes from their saved game (the game saves its power with every cloud save).
exports.claimEvent = wrap(async (req, uid, R, d) => {
  const events = await eventsConfig(R), ev = events.find((e) => e.id === String(d.event || "")), idx = Math.trunc(+d.idx), base = R + "players/" + uid + "/";
  const [sv, mt] = await Promise.all([db.doc(base + "save/main").get(), db.doc(base + "meta/account").get()]);
  const save = sv.exists ? sv.data() : {}, createdAt = (mt.exists && mt.data().createdAt) || save.startedAt || null;
  const win = C.eventWindow(ev, createdAt), progress = ev ? C.eventProgress(ev.goal, save) : 0;
  return db.runTransaction(async (tx) => {
    const ws = await tx.get(walletRef(R, uid)), wd = ws.data() || {}, evs = wd.events || {};
    const r = C.decideEventClaim(evs[ev ? ev.id : ""], ev, idx, progress, win, Date.now());
    if (r.dup) return { dup: true, events: evs, gems: wd.gems || 0 };
    const patchEvents = Object.assign({}, evs); patchEvents[ev.id] = r.claimed;
    const patch = { events: patchEvents }, gems = Math.trunc(r.items.gems || 0), others = {}; Object.keys(r.items).forEach((k) => { if (k !== "gems") others[k] = r.items[k]; });
    let g = wd.gems || 0; if (gems > 0) { g += gems; patch.gems = g; ledger(tx, R, uid, "gems", gems, g, "event_reward", ev.id + "#" + idx); }
    if (Object.keys(others).length) tx.set(mailCol(R, uid).doc(), C.makeMail("🎉 " + ev.name + " reward", ev.goal === "signin" ? "Day " + (idx + 1) + " reward!" : "Milestone reached: " + ev.milestones[idx].target.toLocaleString() + "!", others, "events", Date.now(), "system"));
    tx.set(walletRef(R, uid), patch, { merge: true });
    return { dup: false, events: patchEvents, gems: g, items: r.items, progress };
  });
});
// v943: shop layout - price tiers and tabs (Deals, Shop, ...). Players read <root>config/shop; only this function writes it.
exports.adminSaveShop = wrap(async (req, uid, R, d) => {
  adminOnly(uid, req);
  const packs = await allPacks(R), cur = await shopConfig(R, Object.keys(packs));
  const shop = C.normalizeShop({ tiers: d.tiers || cur.tiers, tabs: d.tabs || cur.tabs, topups: d.topups || cur.topups }, Object.keys(packs));
  shop.updatedAt = Date.now(); shop.updatedBy = uid;
  await db.doc(R + "config/shop").set(shop);
  await db.collection(R + "adminlog").add({ by: uid, shop: { tabs: shop.tabs.map((t) => t.name + ":" + t.items.length), tiers: Object.keys(shop.tiers).length, topups: shop.topups.map((l) => l.name + ":" + l.period) }, at: shop.updatedAt });
  return { shop, packs };
});
// v943: create / edit / delete packs (shop packs and quick-pick mail bundles). Purchases already made keep what they delivered.
exports.adminSavePack = wrap(async (req, uid, R, d) => {
  adminOnly(uid, req);
  const pack = C.normalizePack(d.pack), id = d.id ? String(d.id).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40) : C.packIdFrom(pack.name);
  if (!id || PACKS[id]) throw new HttpsError("invalid-argument", "that pack id is taken by a built-in pack");
  pack.updatedAt = Date.now(); pack.updatedBy = uid;
  await db.doc(R + "packs/" + id).set(pack);
  await db.collection(R + "adminlog").add({ by: uid, pack: { id, name: pack.name, items: pack.items, tier: pack.tier, limit: pack.limit, reset: pack.reset }, at: pack.updatedAt });
  const packs = await allPacks(R); return { id, pack, packs, shop: await shopConfig(R, Object.keys(packs)) };
});
exports.adminDeletePack = wrap(async (req, uid, R, d) => {
  adminOnly(uid, req);
  const id = String(d.id || "").replace(/[^A-Za-z0-9_-]/g, ""); if (!id || PACKS[id]) throw new HttpsError("invalid-argument", "can't delete that pack");
  await db.doc(R + "packs/" + id).delete();
  const packs = await allPacks(R), shop = await shopConfig(R, Object.keys(packs)); /* drop it from every tab */
  await db.doc(R + "config/shop").set(Object.assign(shop, { updatedAt: Date.now(), updatedBy: uid }));
  await db.collection(R + "adminlog").add({ by: uid, packDeleted: id, at: Date.now() });
  return { packs, shop };
});

const NAME_DOC = "assetitems/kingdom_prototype_playername_v1";
exports.adminFindPlayers = wrap(async (req, uid, R, d) => {
  adminOnly(uid, req);
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
  adminOnly(uid, req);
  const t = validUid(d.uid), base = R + "players/" + t + "/";
  const [w, m, n, led, mail, pur, ac] = await Promise.all([
    db.doc(base + "wallet/main").get(), db.doc(base + "meta/account").get(), db.doc(base + NAME_DOC).get(),
    db.collection(base + "ledger").orderBy("at", "desc").limit(200).get(),
    db.collection(base + "mail").orderBy("sentAt", "desc").limit(100).get(),
    db.collection(R + "purchases").where("uid", "==", t).get(),
    db.doc(R + "acplayers/" + t).get()
  ]);
  const purchases = pur.docs.map((x) => Object.assign({ id: x.id }, x.data())).sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, 100);
  return { uid: t, name: n.exists ? (n.data() || {}).data || "" : "", wallet: w.exists ? w.data() : {}, meta: m.exists ? m.data() : {},
    ledger: led.docs.map((x) => Object.assign({ id: x.id }, x.data())), mail: mail.docs.map((x) => Object.assign({ id: x.id }, x.data())), purchases,
    flags: ac.exists ? ac.data() : null };
});

// ---- anti-cheat stage 2 (v920): every save write is compared with the previous one (C.checkSave). FLAG ONLY for now: a jump the game can't
// produce is recorded in <env>acplayers/<uid> (admin-only), the save is never touched. AC_REVERT = true would also put the previous save back
// (destructive: only once Harley has reviewed real flags and asked for it). Admins and bots are skipped (dev tools edit saves freely).
const AC_REVERT = false;
function acHandler(R) {
  return async (event) => {
    const uid = event.params.uid;
    if (!event.data || !event.data.after || !event.data.after.exists) return;
    if (ADMIN_UIDS.indexOf(uid) !== -1 || /^bot_/.test(uid) || uid === "owner") return;
    const bS = event.data.before, aS = event.data.after;
    const before = bS && bS.exists ? bS.data() : null, after = aS.data();
    const tA = aS.updateTime ? aS.updateTime.toMillis() : Date.now(), tB = before && bS.updateTime ? bS.updateTime.toMillis() : null;
    const dt = tB == null ? null : (tA - tB) / 1000;
    let r = C.checkSave(before, after, dt, {});
    if (!r.reasons.length) return;
    if (r.mailCouldHelp && tB != null) { /* only now look up mail claimed in that window (most saves never need this read) */
      const ms = await db.collection(R + "players/" + uid + "/mail").where("claimedAt", ">=", tB - 120000).get();
      r = C.checkSave(before, after, dt, C.mailAllowance(ms.docs.map((x) => x.data())));
      if (!r.reasons.length) return;
    }
    const ref = db.doc(R + "acplayers/" + uid), entry = { at: tA, dtSec: dt == null ? null : Math.round(dt), reasons: r.reasons.slice(0, 10) };
    await db.runTransaction(async (tx) => {
      const s0 = await tx.get(ref), cur = s0.exists ? s0.data() : {};
      const recent = [entry].concat(Array.isArray(cur.recent) ? cur.recent : []).slice(0, 20);
      tx.set(ref, { uid, count: (cur.count || 0) + 1, firstAt: cur.firstAt || tA, lastAt: tA, recent, reverted: (cur.reverted || 0) + (AC_REVERT && before ? 1 : 0) });
    });
    console.warn("anti-cheat flag", R || "live", uid, JSON.stringify(entry.reasons));
    if (AC_REVERT && before) await aS.ref.set(before);
  };
}
const FEATURES = require("./features.json");
if (FEATURES.saveTriggers || process.env.FUNCTIONS_EMULATOR === "true") { /* the save triggers need 3 one-time IAM grants on the project (HANDOVER) */
  exports.onSaveWriteLive = onDocumentWritten("players/{uid}/save/main", acHandler(""));
  exports.onSaveWriteTest = onDocumentWritten("envs/test/players/{uid}/save/main", acHandler("envs/test/"));
}

// Admin: players with anti-cheat flags, most recent first.
exports.adminFlagged = wrap(async (req, uid, R) => {
  adminOnly(uid, req);
  const q = await db.collection(R + "acplayers").orderBy("lastAt", "desc").limit(50).get();
  const rows = q.docs.map((x) => x.data());
  if (rows.length) { const ns = await db.getAll(...rows.map((x) => db.doc(R + "players/" + x.uid + "/" + NAME_DOC))); rows.forEach((x, i) => { x.name = ns[i].exists ? String((ns[i].data() || {}).data || "") : ""; }); }
  return { players: rows };
});
