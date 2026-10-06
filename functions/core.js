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
const LEDGER_ITEMS = ["gems"];
function ledgerEntry(item, delta, balance, reason, ref, by, now) {
  if (LEDGER_ITEMS.indexOf(item) === -1) throw new GameError("invalid-argument", "unknown item " + item);
  const e = { item, delta: Math.trunc(delta), balance: Math.trunc(balance), reason: String(reason), at: now };
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

module.exports = { BASE, LEVEL_CLEAR_GEMS, LEVELS_PER_CHAPTER, HIT_COOLDOWN_MS, hordeQuota, hordeCount, levelFloorSec, globalLevel, baseHpAt, GameError,
  decideLevelClaim, needGems, LEDGER_ITEMS, ledgerEntry, purchaseId, decidePurchase, decideExtinguish, decideRepair, decideHit, checkHitCooldown, envRoot, cityDocId };
