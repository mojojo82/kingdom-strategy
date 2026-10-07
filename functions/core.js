// Pure game rules used by the Cloud Functions. No Firebase imports, so it can be unit-tested anywhere.
// Numbers here MUST match the game (index.html). If you change one there, change it here.
"use strict";

const BASE = {
  HP_MAX: 10000, HIT_HP: 1000, BURN_MAX: 3000, BURN_SEC_PER_HP: 3, REGEN_PER_HOUR: 100,
  EXTINGUISH_GEMS: 100, REPAIR_GEMS: 225, REPAIR_HP: 2000
};
const LEVEL_CLEAR_GEMS = 50;
const LEVELS_PER_CHAPTER = 20;
const HIT_COOLDOWN_MS = 30000;        // one base hit per attacker per target every 30s
const LEVEL_FLOOR_TOLERANCE = 0.9;    // accept claims at 90% of the measured minimum (timing jitter)

// Conquest pacing (game: idleHordeSize / idleHordeCount). g = global level number, 1-based.
function hordeSize(g) { return Math.min(10, 5 + Math.floor((g - 1) / 25)); }
function hordeCount(g) { return Math.min(8, 4 + Math.floor((g - 1) / 30)); }
function hordeQuota(g) { return hordeSize(g) * hordeCount(g); }
// Fastest a level can possibly be cleared, in seconds. Measured in the real game with every enemy dying the instant it appears
// and the Victory screen skipped (simfork/g160_levelspeed.js): g=1 -> 4.25s, g=41 -> 6.0s, g=181 -> 13.8s.
// Fit: 0.40 s per horde + 0.1325 s per enemy. No player, however strong, can beat this.
function levelFloorSec(g) { return 0.40 * hordeCount(g) + 0.1325 * hordeQuota(g); }
function globalLevel(chapter, levelNum) { return (Math.max(1, chapter | 0) - 1) * LEVELS_PER_CHAPTER + Math.max(1, levelNum | 0); }

// Base HP over time (game: baseHpAt). rec = { hp, hpT, burnLeft } or null.
function baseHpAt(rec, t) {
  if (!rec || typeof rec.hp !== "number") return { hp: BASE.HP_MAX, burning: false, burnLeft: 0 };
  let hp = rec.hp, burnLeft = rec.burnLeft || 0, dt = Math.max(0, (t - (rec.hpT || t)) / 1000);
  if (burnLeft > 0 && hp > 0) {
    const canBurn = Math.min(burnLeft, hp), burnSec = canBurn * BASE.BURN_SEC_PER_HP;
    if (dt < burnSec) { const burnt = dt / BASE.BURN_SEC_PER_HP; return { hp: Math.max(0, hp - burnt), burning: true, burnLeft: burnLeft - burnt }; }
    hp -= canBurn; dt -= burnSec; burnLeft = 0;
  }
  return { hp: Math.min(BASE.HP_MAX, Math.max(0, hp) + dt / 3600 * BASE.REGEN_PER_HOUR), burning: false, burnLeft: 0 };
}

class GameError extends Error { constructor(code, message, extra) { super(message); this.code = code; this.extra = extra || {}; } }

// ---- decisions: each takes current docs + now and returns what to write (or throws GameError) ----

// Level reward: must be the very next level, and not faster than the game allows since the last paid level.
function decideLevelClaim(wallet, g, now) {
  const w = wallet || {}, last = w.lvl || 0, gems = w.gems || 0;
  if (!Number.isInteger(g) || g < 1 || g > 1e6) throw new GameError("invalid-argument", "bad level");
  if (g <= last) return { dup: true, wallet: null, gems };
  if (g !== last + 1) throw new GameError("failed-precondition", "out_of_order", { expected: last + 1 });
  const minMs = levelFloorSec(g) * 1000 * LEVEL_FLOOR_TOLERANCE, since = now - (w.lvlAt || 0);
  if (w.lvlAt && since < minMs) throw new GameError("resource-exhausted", "too_fast", { retryAfterMs: Math.ceil(minMs - since) });
  return { dup: false, wallet: { gems: gems + LEVEL_CLEAR_GEMS, lvl: g, lvlAt: now }, gems: gems + LEVEL_CLEAR_GEMS };
}

function needGems(wallet, cost) {
  const gems = (wallet && wallet.gems) || 0;
  if (gems < cost) throw new GameError("failed-precondition", "not_enough_gems", { gems, cost });
  return gems - cost;
}

// Put out my own fire (costs gems) or an ally's (free).
function decideExtinguish(city, now, opts) {
  if (!city) throw new GameError("not-found", "no_city");
  const cur = baseHpAt(city, now);
  if (!cur.burning) throw new GameError("failed-precondition", "not_burning");
  return { cityPatch: { hp: cur.hp, hpT: now, burnLeft: 0 }, cost: opts && opts.free ? 0 : BASE.EXTINGUISH_GEMS };
}
function decideRepair(city, now) {
  if (!city) throw new GameError("not-found", "no_city");
  const cur = baseHpAt(city, now);
  if (cur.hp >= BASE.HP_MAX - 0.5) throw new GameError("failed-precondition", "full_hp");
  return { cityPatch: { hp: Math.min(BASE.HP_MAX, cur.hp + BASE.REPAIR_HP), hpT: now, burnLeft: cur.burnLeft }, cost: BASE.REPAIR_GEMS };
}
// A won attack on a city: take HIT_HP, start a fire if not already burning (no stacking / reset).
function decideHit(city, now) {
  if (!city) throw new GameError("not-found", "no_city");
  const cur = baseHpAt(city, now), after = Math.max(0, cur.hp - BASE.HIT_HP), zeroed = after <= 0 && cur.hp > 0;
  const patch = { hp: after, hpT: now, burnLeft: after > 0 ? (cur.burning ? cur.burnLeft : BASE.BURN_MAX) : 0 };
  if (zeroed) patch.raidedAt = now;
  return { cityPatch: patch, before: Math.round(cur.hp), after: Math.round(after), zeroed };
}
function checkHitCooldown(lastHitAt, now) {
  if (lastHitAt && now - lastHitAt < HIT_COOLDOWN_MS) throw new GameError("resource-exhausted", "hit_cooldown", { retryAfterMs: HIT_COOLDOWN_MS - (now - lastHitAt) });
}

function envRoot(env) {
  if (env === "test") return "envs/test/";
  if (env === "live" || env == null) return "";
  throw new GameError("invalid-argument", "bad env");
}
function cityDocId(tileId) {
  const s = String(tileId || "");
  if (!/^\d{1,5},\d{1,5}$/.test(s)) throw new GameError("invalid-argument", "bad tile");
  return s.replace(",", "_");
}

// ---- ledger + purchases ----
// One ledger entry per change to any tracked item (gems now; gifts and other consumables later): who, what, how much, balance after, why.
const ITEMS = require("./items.json");
const LEDGER_ITEMS = Object.keys(ITEMS).filter((k) => k[0] !== "_");
function ledgerEntry(item, delta, balance, reason, ref, by, now) {
  if (LEDGER_ITEMS.indexOf(item) === -1) throw new GameError("invalid-argument", "unknown item " + item);
  const e = { item, delta: Math.trunc(delta), reason: String(reason), at: now };
  if (balance != null) e.balance = Math.trunc(balance); /* known for server-held items; save items live on the player's device */
  if (ref != null && ref !== "") e.ref = String(ref);
  if (by) e.by = String(by);
  return e;
}
// Purchases are keyed by the payment provider's receipt id, so the same payment can never be delivered twice (or lost by a retry).
function purchaseId(provider, receiptId) {
  const p = String(provider || ""), r = String(receiptId || "");
  if (!/^[a-z0-9_-]{2,32}$/.test(p) || !/^[A-Za-z0-9._:-]{4,200}$/.test(r)) throw new GameError("invalid-argument", "bad provider/receipt");
  return (p + "_" + r).replace(/[^A-Za-z0-9_-]/g, "-");
}
function decidePurchase(existing, pack, packId, wallet, uid, now) {
  if (existing) return { dup: true, record: existing };
  if (!pack || !pack.items) throw new GameError("not-found", "unknown pack " + packId);
  const gems0 = (wallet && wallet.gems) || 0, add = Math.trunc(pack.items.gems || 0);
  if (!(add > 0)) throw new GameError("failed-precondition", "pack has no deliverable items");
  return { dup: false, gems: gems0 + add, add,
    record: { uid, pack: packId, packName: pack.name || packId, price: pack.price, currency: pack.currency, items: { gems: add }, status: "delivered", at: now, deliveredAt: now } };
}

// ---- mail: admin gifts. Any catalogue item; the player claims it once; each item claimed gets a ledger entry. ----
const SAVE_PATH_OK = /^(resources|troops|heroes\.[a-z0-9_]+|idle)?\.?[a-zA-Z0-9_]+$/;
function normalizeItems(items) {
  if (!items || typeof items !== "object") throw new GameError("invalid-argument", "no items");
  const out = [];
  Object.keys(items).forEach((id) => {
    const def = ITEMS[id], qty = Math.trunc(+items[id]);
    if (!def || id[0] === "_") throw new GameError("invalid-argument", "unknown item " + id);
    if (!(qty >= 1 && qty <= 1e9)) throw new GameError("invalid-argument", "bad amount for " + id);
    if (def.kind === "save" && !SAVE_PATH_OK.test(def.path || "")) throw new GameError("internal", "bad catalogue path for " + id);
    out.push({ id, qty, kind: def.kind, path: def.path || null, name: def.name, icon: def.icon || "" });
  });
  if (!out.length || out.length > 20) throw new GameError("invalid-argument", "1-20 items per mail");
  return out;
}
const MAIL_CATEGORIES = ["wars", "alliance", "system", "reports"]; /* v914: mailbox tabs (Saved is a player bookmark, not a category) */
function makeMail(title, body, items, by, now, category) {
  const t = String(title || "").trim().slice(0, 80), b = String(body || "").trim().slice(0, 1000);
  if (!t) throw new GameError("invalid-argument", "mail needs a title");
  const cat = category == null || category === "" ? "system" : String(category).toLowerCase(); /* no category given = System */
  if (MAIL_CATEGORIES.indexOf(cat) < 0) throw new GameError("invalid-argument", "unknown mail category " + cat);
  const list = normalizeItems(items), it = {}, labels = {}; list.forEach((x) => { it[x.id] = x.qty; labels[x.id] = (x.icon ? x.icon + " " : "") + x.name; });
  return { title: t, body: b, items: it, labels, from: "Admin", category: cat, sentAt: now, by: String(by || "") };
}
function decideMailClaim(mail, now) {
  if (!mail) throw new GameError("not-found", "no such mail");
  const list = normalizeItems(mail.items);
  if (mail.claimedAt) return { dup: true, list };
  return { dup: false, list, patch: { claimedAt: now } };
}

// ---- anti-cheat stage 2: save plausibility (v920) ----
// Every save write is compared with the previous save (server timestamps). A jump the game can't produce in that time is a "flag". Bounds are
// deliberately generous: they must never trip on real play (a false flag is worse than a missed small cheat); tighten later from real flag data.
// Mail items claimed in the window are allowed on top. Pure: no I/O.
const AC = {
  slackSec: 30,                                  // clock / save-delay slack added to every time window
  build: { base: 3, perSec: 1 / 20 },            // building levels (all buildings together)
  tech: { base: 3, perSec: 1 / 20 },             // research + fortress tech levels (together)
  weapon: { base: 3, perSec: 1 / 30 },           // weapon levels (together)
  heroLvl: { base: 30, perSec: 1 / 5 },          // levels per hero
  frag: { base: 500, perSec: 2 },                // hero fragments per hero
  troops: { base: 3000, mult: 1, perSec: 30 },   // all troops together: base + what you had (healing) + rate
  res: { base: 100000, mult: 2, perSec: 200 },   // each of food / wood / stone / gold: base + 2x what you had + rate
  cur: { base: 50000, mult: 2, perSec: 100 },    // energon, research points, weapon tickets, valor, conquest books
  fresh: { maxLevel: 5, res: 200000, buildSum: 40, troops: 5000 } // a brand-new save
};
const AC_RES = ["food", "wood", "stone", "gold"];
const AC_CUR = ["energon", "researchPoints", "weaponTickets", "idle.valor", "idle.conquestBooks"];
function acNum(x) { const n = Number(x); return Number.isFinite(n) ? n : 0; }
function acGet(o, path) { return String(path).split(".").reduce((a, k) => (a && typeof a === "object" ? a[k] : undefined), o); }
function acLevelOf(v) { return v && typeof v === "object" ? acNum(v.level) : acNum(v); }
function acSumUp(b, a) { let s = 0; const bb = b || {}, aa = a || {}; Object.keys(aa).forEach((k) => { const d = acLevelOf(aa[k]) - acLevelOf(bb[k]); if (d > 0) s += d; }); return s; }
function acFmt(n) { return Math.round(n).toLocaleString("en-US"); }
function acBad(x) { return x !== undefined && x !== null && (typeof x !== "number" || !Number.isFinite(x) || x < 0); }
function mailAllowance(mails) { /* claimed mail -> { savePath: amount } */
  const out = {};
  (mails || []).forEach((m) => { Object.keys((m && m.items) || {}).forEach((id) => { const it = ITEMS[id]; if (!it || it.kind !== "save" || !it.path) return; out[it.path] = (out[it.path] || 0) + Math.max(0, acNum(m.items[id])); }); });
  return out;
}
function checkSave(before, after, dtSec, allow) {
  const reasons = [], al = allow || {}; let mailCouldHelp = false;
  if (!after || typeof after !== "object") return { reasons, mailCouldHelp };
  const R = after.resources || {};
  AC_RES.forEach((k) => { if (acBad(R[k])) reasons.push("resources." + k + " is not a valid amount (" + String(R[k]) + ")"); });
  const ga = globalLevel(acGet(after, "idle.chapter"), acGet(after, "idle.levelNum"));
  if (!before) { /* a brand-new save */
    if (ga > AC.fresh.maxLevel) reasons.push("new save already at Conquest level " + ga);
    AC_RES.forEach((k) => { if (acNum(R[k]) > AC.fresh.res + acNum(al["resources." + k])) reasons.push("new save with " + acFmt(R[k]) + " " + k); });
    if (acSumUp({}, after.buildings) > AC.fresh.buildSum) reasons.push("new save with " + acSumUp({}, after.buildings) + " building levels");
    const tr = Object.keys(after.troops || {}).reduce((s, k) => s + acNum(after.troops[k]), 0); if (tr > AC.fresh.troops) reasons.push("new save with " + acFmt(tr) + " troops");
    return { reasons, mailCouldHelp: false };
  }
  const dt = Math.max(0, acNum(dtSec)), win = dt + AC.slackSec;
  // Conquest: every level takes at least levelFloorSec (the game's measured physical minimum)
  const gb = globalLevel(acGet(before, "idle.chapter"), acGet(before, "idle.levelNum"));
  if (ga > gb) { let need = 0; for (let g = gb + 1; g <= ga && g <= gb + 5000; g++) need += levelFloorSec(g) * LEVEL_FLOOR_TOLERANCE; if (need > win) reasons.push("Conquest +" + (ga - gb) + " levels (" + gb + " to " + ga + ") in " + Math.round(dt) + "s; the game needs at least " + Math.round(need) + "s"); }
  function lim(name, up, base, perSec) { const cap = base + perSec * win; if (up > cap) reasons.push(name + " +" + acFmt(up) + " in " + Math.round(dt) + "s (limit " + acFmt(cap) + ")"); }
  lim("building levels", acSumUp(before.buildings, after.buildings), AC.build.base, AC.build.perSec);
  lim("research levels", acSumUp(before.tech, after.tech) + acSumUp(before.fortressTech, after.fortressTech), AC.tech.base, AC.tech.perSec);
  lim("weapon levels", acSumUp(before.weaponLevels, after.weaponLevels), AC.weapon.base, AC.weapon.perSec);
  const hb = before.heroes || {}, ha = after.heroes || {};
  Object.keys(ha).forEach((k) => {
    const a = ha[k] || {}, b = hb[k] || {};
    lim(k + " level", acNum(a.level) - acNum(b.level), AC.heroLvl.base, AC.heroLvl.perSec);
    const fu = acNum(a.fragments) - acNum(b.fragments), fcap = AC.frag.base + AC.frag.perSec * win, fm = acNum(al["heroes." + k + ".fragments"]);
    if (fu > fcap) { mailCouldHelp = true; if (fu > fcap + fm) reasons.push(k + " fragments +" + acFmt(fu) + " in " + Math.round(dt) + "s (limit " + acFmt(fcap + fm) + ")"); }
  });
  const sumT = (t) => Object.keys(t || {}).reduce((s, k) => s + Math.max(0, acNum(t[k])), 0);
  const tu = sumT(after.troops) - sumT(before.troops), tcap = AC.troops.base + AC.troops.mult * sumT(before.troops) + AC.troops.perSec * win, tm = Object.keys(al).filter((p) => p.indexOf("troops.") === 0).reduce((s, p) => s + al[p], 0);
  if (tu > tcap) { mailCouldHelp = true; if (tu > tcap + tm) reasons.push("troops +" + acFmt(tu) + " in " + Math.round(dt) + "s (limit " + acFmt(tcap + tm) + ")"); }
  const RB = before.resources || {};
  AC_RES.forEach((k) => { const up = acNum(R[k]) - acNum(RB[k]), cap = AC.res.base + AC.res.mult * Math.max(0, acNum(RB[k])) + AC.res.perSec * win, m = acNum(al["resources." + k]);
    if (up > cap) { mailCouldHelp = true; if (up > cap + m) reasons.push(k + " +" + acFmt(up) + " in " + Math.round(dt) + "s (limit " + acFmt(cap + m) + ")"); } });
  AC_CUR.forEach((p) => { const was = acNum(acGet(before, p)), up = acNum(acGet(after, p)) - was, cap = AC.cur.base + AC.cur.mult * Math.max(0, was) + AC.cur.perSec * win, m = acNum(al[p]);
    if (up > cap) { mailCouldHelp = true; if (up > cap + m) reasons.push(p + " +" + acFmt(up) + " in " + Math.round(dt) + "s (limit " + acFmt(cap + m) + ")"); } });
  return { reasons, mailCouldHelp };
}

module.exports = { AC, checkSave, mailAllowance, BASE, LEVEL_CLEAR_GEMS, LEVELS_PER_CHAPTER, HIT_COOLDOWN_MS, hordeQuota, hordeCount, levelFloorSec, globalLevel, baseHpAt, GameError,
  decideLevelClaim, needGems, ITEMS, LEDGER_ITEMS, ledgerEntry, purchaseId, decidePurchase, normalizeItems, makeMail, MAIL_CATEGORIES, decideMailClaim, decideExtinguish, decideRepair, decideHit, checkHitCooldown, envRoot, cityDocId };
