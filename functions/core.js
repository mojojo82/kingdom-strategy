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
  const gems0 = (wallet && wallet.gems) || 0, add = Math.max(0, Math.trunc(pack.items.gems || 0));
  const others = {}; Object.keys(pack.items).forEach((k) => { if (k !== "gems" && +pack.items[k] > 0) others[k] = Math.trunc(+pack.items[k]); }); /* v943: non-gem items go to the player by mail */
  if (!(add > 0) && !Object.keys(others).length) throw new GameError("failed-precondition", "pack has no deliverable items");
  const items = Object.assign(add > 0 ? { gems: add } : {}, others);
  return { dup: false, gems: gems0 + add, add, others,
    record: { uid, pack: packId, packName: pack.name || packId, tier: pack.tier == null ? null : pack.tier, price: pack.price == null ? null : pack.price, currency: pack.currency || null, items, status: "delivered", at: now, deliveredAt: now } };
}
// v943: packs made in the admin panel (one library: shop packs placed in shop tabs, and/or quick-pick mail gifts).
const SHOP_CURRENCIES = ["USD", "NZD", "MXN", "EUR", "TRY"];
/* Suggested starting tiers (Harley: US$0.99 is NZ$1.69). MXN/EUR/TRY are rough suggestions to check and adjust in the admin panel. Tier 0 = free. */
const DEFAULT_TIERS = {
  0: { USD: 0, NZD: 0, MXN: 0, EUR: 0, TRY: 0, points: 0 },
  1: { USD: 0.99, NZD: 1.69, MXN: 19, EUR: 0.99, TRY: 44.99, points: 500 },
  2: { USD: 1.99, NZD: 3.49, MXN: 39, EUR: 1.99, TRY: 89.99, points: 1000 },
  3: { USD: 2.99, NZD: 4.99, MXN: 59, EUR: 2.99, TRY: 134.99, points: 1500 },
  4: { USD: 4.99, NZD: 8.49, MXN: 99, EUR: 4.99, TRY: 224.99, points: 2500 },
  5: { USD: 9.99, NZD: 16.99, MXN: 199, EUR: 9.99, TRY: 449.99, points: 5000 },
  6: { USD: 19.99, NZD: 33.99, MXN: 379, EUR: 19.99, TRY: 899.99, points: 10000 },
  7: { USD: 49.99, NZD: 84.99, MXN: 949, EUR: 49.99, TRY: 2249.99, points: 25000 },
  8: { USD: 99.99, NZD: 169.99, MXN: 1899, EUR: 99.99, TRY: 4499.99, points: 50000 }
};
function normalizePack(p) {
  if (!p || typeof p !== "object") throw new GameError("invalid-argument", "no pack");
  const name = String(p.name || "").trim().slice(0, 60); if (!name) throw new GameError("invalid-argument", "pack needs a name");
  const list = normalizeItems(p.items), items = {}, labels = {}; list.forEach((x) => { items[x.id] = x.qty; labels[x.id] = (x.icon ? x.icon + " " : "") + x.name; });
  const tier = Math.trunc(+p.tier || 0); if (!(tier >= 0 && tier <= 50)) throw new GameError("invalid-argument", "bad price tier");
  const limit = Math.trunc(+p.limit || 0); if (!(limit >= 0 && limit <= 999)) throw new GameError("invalid-argument", "bad buy limit");
  const reset = String(p.reset || "none"); if (PACK_RESETS.indexOf(reset) < 0) throw new GameError("invalid-argument", "bad reset");
  let banner = null; /* v944: optional banner picture (the admin page shrinks it to a small JPEG first) */
  if (p.banner) { banner = String(p.banner); if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(banner)) throw new GameError("invalid-argument", "banner must be a JPEG, PNG or WebP picture"); if (banner.length > 700000) throw new GameError("invalid-argument", "banner picture is too big (max ~500 KB)"); }
  return { name, desc: String(p.desc || "").trim().slice(0, 200), icon: Array.from(String(p.icon || "📦").trim()).slice(0, 4).join("") || "📦", items, labels, banner, tier, limit, reset: limit ? reset : "none",
    mail: p.mail === true, active: p.active !== false, order: Math.trunc(+p.order || 0) };
}
/* Repeating buy limits: "daily" resets at 00:00 UTC, "weekly" on Monday 00:00 UTC, "monthly" on the 1st 00:00 UTC. Returns when the current period began. */
const PACK_RESETS = ["none", "daily", "weekly", "monthly"];
function limitPeriodStart(reset, now) {
  const d = new Date(now);
  if (reset === "daily") return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  if (reset === "weekly") { const day0 = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); return day0 - ((d.getUTCDay() + 6) % 7) * 86400000; }
  if (reset === "monthly") return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
  return 0;
}
function limitPeriodEnd(reset, now) {
  const s0 = limitPeriodStart(reset, now), d = new Date(s0);
  if (reset === "daily") return s0 + 86400000; if (reset === "weekly") return s0 + 7 * 86400000;
  if (reset === "monthly") return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1); return null;
}
/* how many more the player may buy right now; purchases = that player's delivered purchase records of this pack */
function packBuysLeft(pack, purchases, now) {
  if (!pack || !pack.limit) return Infinity;
  const from = limitPeriodStart(pack.reset || "none", now);
  return Math.max(0, pack.limit - (purchases || []).filter((r) => r && r.status !== "refunded" && (r.at || 0) >= from).length);
}
/* Shop layout: price tiers (tier -> price per currency) and tabs (Deals, Shop, ...) each holding an ordered list of packs with optional start/end time and badge. */
function normalizeShop(shop, packIds) {
  shop = shop || {}; const ok = packIds || null, out = { tiers: {}, tabs: [] };
  const tiers = shop.tiers && typeof shop.tiers === "object" ? shop.tiers : DEFAULT_TIERS;
  Object.keys(tiers).forEach((t) => {
    const n = Math.trunc(+t); if (!(n >= 0 && n <= 50) || String(n) !== String(t)) throw new GameError("invalid-argument", "bad tier " + t);
    const row = {}; SHOP_CURRENCIES.forEach((c) => { const v = +((tiers[t] || {})[c]); if (!(v >= 0 && v <= 1e6)) throw new GameError("invalid-argument", "bad price for tier " + t + " " + c); row[c] = Math.round(v * 100) / 100; });
    const pts = Math.trunc(+((tiers[t] || {}).points) || 0); if (!(pts >= 0 && pts <= 1e7)) throw new GameError("invalid-argument", "bad top-up points for tier " + t); row.points = pts;
    out.tiers[n] = row;
  });
  const tabs = Array.isArray(shop.tabs) ? shop.tabs : [];
  if (tabs.length > 10) throw new GameError("invalid-argument", "max 10 tabs");
  const seen = {};
  tabs.forEach((tb) => {
    const name = String((tb && tb.name) || "").trim().slice(0, 24); if (!name) throw new GameError("invalid-argument", "tab needs a name");
    let id = packIdFrom(tb.id || name); while (seen[id]) id += "_2"; seen[id] = 1;
    const entries = Array.isArray(tb.items) ? tb.items : []; if (entries.length > 60) throw new GameError("invalid-argument", "max 60 packs per tab");
    out.tabs.push({ id, name, icon: Array.from(String(tb.icon || "").trim()).slice(0, 4).join(""), items: entries.map((e) => {
      const pack = String((e && e.pack) || ""); if (!pack || (ok && ok.indexOf(pack) < 0)) throw new GameError("invalid-argument", "unknown pack " + pack + " in tab " + name);
      const start = +e.start > 0 ? Math.trunc(+e.start) : null, end = +e.end > 0 ? Math.trunc(+e.end) : null;
      if (start && end && end <= start) throw new GameError("invalid-argument", "deal ends before it starts (" + pack + ")");
      return { pack, start, end, badge: String(e.badge || "").trim().slice(0, 20) };
    }) });
  });
  /* v945: top-up reward ladders. period: daily | weekly | monthly | lifetime | event (event = between start and end). */
  const tops = Array.isArray(shop.topups) ? shop.topups : []; if (tops.length > 10) throw new GameError("invalid-argument", "max 10 top-up ladders");
  const seenL = {}; out.topups = tops.map((l) => {
    const name = String((l && l.name) || "").trim().slice(0, 40); if (!name) throw new GameError("invalid-argument", "top-up ladder needs a name");
    let id = packIdFrom(l.id || name); while (seenL[id]) id += "_2"; seenL[id] = 1;
    const period = String(l.period || "daily"); if (TOPUP_PERIODS.indexOf(period) < 0) throw new GameError("invalid-argument", "bad top-up period");
    const start = +l.start > 0 ? Math.trunc(+l.start) : null, end = +l.end > 0 ? Math.trunc(+l.end) : null;
    if (period === "event" && !(start && end && end > start)) throw new GameError("invalid-argument", "an event ladder needs a start and an end (" + name + ")");
    const ms = Array.isArray(l.tiers) ? l.tiers : []; if (!ms.length || ms.length > 30) throw new GameError("invalid-argument", "1-30 milestones per ladder (" + name + ")");
    const tiersOut = ms.map((m) => { const pts = Math.trunc(+(m && m.points) || 0); if (!(pts > 0 && pts <= 1e9)) throw new GameError("invalid-argument", "milestone points must be more than 0 (" + name + ")");
      const list = normalizeItems(m.items), items = {}, labels = {}; list.forEach((x) => { items[x.id] = x.qty; labels[x.id] = (x.icon ? x.icon + " " : "") + x.name; }); return { points: pts, items, labels }; })
      .sort((a, b) => a.points - b.points);
    return { id, name, icon: Array.from(String(l.icon || "🏆").trim()).slice(0, 4).join("") || "🏆", period, start, end, active: l.active !== false, tiers: tiersOut };
  });
  return out;
}
const TOPUP_PERIODS = ["daily", "weekly", "monthly", "lifetime", "event"];
/* which counting window a ladder is in right now (null = not running) */
function topupKey(l, now) {
  if (!l || l.active === false) return null;
  if (l.period === "event") return now >= l.start && now < l.end ? "e" + l.start : null;
  if (l.period === "lifetime") return "life";
  return l.period[0] + limitPeriodStart(l.period, now);
}
function topupEnd(l, now) { return l.period === "event" ? l.end : l.period === "lifetime" ? null : limitPeriodEnd(l.period, now); }
/* add a purchase's points to the player's counters (wallet.topup = { life, l: { ladderId: { k, n, c: [claimed milestone indexes] } } }) */
function addTopup(topup, ladders, points, now) {
  const t = JSON.parse(JSON.stringify(topup || {})); t.life = (t.life || 0) + points; t.l = t.l || {};
  (ladders || []).forEach((l) => { const k = topupKey(l, now); if (!k) return; const c = t.l[l.id]; t.l[l.id] = c && c.k === k ? { k, n: c.n + points, c: c.c || [] } : { k, n: points, c: [] }; });
  return t;
}
function decideTopupClaim(topup, ladder, idx, now) {
  if (!ladder) throw new GameError("not-found", "no such top-up ladder");
  const k = topupKey(ladder, now); if (!k) throw new GameError("failed-precondition", "this top-up event isn't running");
  const m = ladder.tiers[idx]; if (!m) throw new GameError("not-found", "no such milestone");
  const c = (topup && topup.l && topup.l[ladder.id]) || null, n = c && c.k === k ? c.n : 0, claimed = c && c.k === k ? (c.c || []) : [];
  if (claimed.indexOf(idx) >= 0) return { dup: true };
  if (n < m.points) throw new GameError("failed-precondition", "not enough top-up points yet", { have: n, need: m.points });
  const t = JSON.parse(JSON.stringify(topup || {})); t.l = t.l || {}; t.l[ladder.id] = { k, n, c: claimed.concat([idx]) };
  return { dup: false, topup: t, items: m.items };
}
// ---- v946: events (e.g. Burst of Life: reach a total power, claim a reward at each milestone; the last one is the grand prize) ----
const EVENT_GOALS = ["power", "townhall", "conquest"];
function normalizeEvents(list) {
  list = Array.isArray(list) ? list : []; if (list.length > 20) throw new GameError("invalid-argument", "max 20 events");
  const seen = {};
  return list.map((ev) => {
    const name = String((ev && ev.name) || "").trim().slice(0, 40); if (!name) throw new GameError("invalid-argument", "event needs a name");
    let id = packIdFrom(ev.id || name); while (seen[id]) id += "_2"; seen[id] = 1;
    const goal = String(ev.goal || "power"); if (EVENT_GOALS.indexOf(goal) < 0) throw new GameError("invalid-argument", "bad event goal");
    const sc = ev.schedule || {}, type = sc.type === "dates" ? "dates" : "newplayer", schedule = { type };
    if (type === "newplayer") { const days = +sc.days; if (!(days > 0 && days <= 365)) throw new GameError("invalid-argument", "new-player event needs 1-365 days (" + name + ")"); schedule.days = days; }
    else { const st = Math.trunc(+sc.start || 0), en = Math.trunc(+sc.end || 0); if (!(st > 0 && en > st)) throw new GameError("invalid-argument", "dated event needs a start and an end (" + name + ")"); schedule.start = st; schedule.end = en; }
    let banner = null; if (ev.banner) { banner = String(ev.banner); if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(banner) || banner.length > 700000) throw new GameError("invalid-argument", "bad banner picture (" + name + ")"); }
    const ms = Array.isArray(ev.milestones) ? ev.milestones : []; if (!ms.length || ms.length > 30) throw new GameError("invalid-argument", "1-30 milestones (" + name + ")");
    const milestones = ms.map((m) => { const target = Math.trunc(+(m && m.target) || 0); if (!(target > 0 && target <= 1e12)) throw new GameError("invalid-argument", "milestone target must be more than 0 (" + name + ")");
      const list2 = normalizeItems(m.items), items = {}, labels = {}; list2.forEach((x) => { items[x.id] = x.qty; labels[x.id] = (x.icon ? x.icon + " " : "") + x.name; });
      return { target, worth: Math.max(0, Math.trunc(+m.worth || 0)), items, labels }; }).sort((a, b) => a.target - b.target);
    return { id, name, icon: Array.from(String(ev.icon || "🎉").trim()).slice(0, 4).join("") || "🎉", tag: String(ev.tag || "").trim().slice(0, 20), desc: String(ev.desc || "").trim().slice(0, 200),
      banner, goal, schedule, active: ev.active !== false, milestones };
  });
}
/* when this event runs for this player (createdAt = when their account was made); null = never */
function eventWindow(ev, createdAt) {
  if (!ev || ev.active === false) return null;
  if (ev.schedule.type === "newplayer") { const c = +createdAt || 0; return c ? { start: c, end: c + ev.schedule.days * 86400000 } : null; }
  return { start: ev.schedule.start, end: ev.schedule.end };
}
/* the player's progress on the goal, from their saved game */
function eventProgress(goal, save) {
  save = save || {};
  if (goal === "power") return Math.max(0, Math.trunc(+save.power || 0));
  if (goal === "townhall") return Math.max(0, Math.trunc(+(((save.buildings || {}).townhall || {}).level) || 0));
  if (goal === "conquest") { const i = save.idle || {}; return Math.max(0, globalLevel(+i.chapter || 1, +i.levelNum || 1) - 1); } /* levels cleared */
  return 0;
}
function decideEventClaim(claimed, ev, idx, progress, win, now) {
  if (!ev) throw new GameError("not-found", "no such event");
  if (!win || now < win.start || now >= win.end) throw new GameError("failed-precondition", "this event isn't running for you");
  const m = ev.milestones[idx]; if (!m) throw new GameError("not-found", "no such milestone");
  const c = (claimed && claimed.k === win.start) ? (claimed.c || []) : [];
  if (c.indexOf(idx) >= 0) return { dup: true };
  if (progress < m.target) throw new GameError("failed-precondition", "not reached yet", { have: progress, need: m.target });
  return { dup: false, claimed: { k: win.start, c: c.concat([idx]) }, items: m.items };
}
function shopEntryLive(e, now) { return (!e.start || now >= e.start) && (!e.end || now < e.end); }
function packIdFrom(name) { return String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "pack"; }

// ---- mail: admin gifts. Any catalogue item; the player claims it once; each item claimed gets a ledger entry. ----
const SAVE_PATH_OK = /^(resources|troops|heroes\.[a-z0-9_]+|idle|speedups|skins)?\.?[a-zA-Z0-9_]+$/; /* v946: + speedups, skins */
function normalizeItems(items, allowEmpty) { /* allowEmpty: mails may be a message only (v939) */
  if (allowEmpty && (items == null || (typeof items === "object" && !Array.isArray(items) && !Object.keys(items).length))) return [];
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
  const list = normalizeItems(items, true), it = {}, labels = {}; list.forEach((x) => { it[x.id] = x.qty; labels[x.id] = (x.icon ? x.icon + " " : "") + x.name; });
  return { title: t, body: b, items: it, labels, from: "Admin", category: cat, sentAt: now, by: String(by || "") };
}
function decideMailClaim(mail, now) {
  if (!mail) throw new GameError("not-found", "no such mail");
  const list = normalizeItems(mail.items, true); /* message-only mail: claiming just marks it read */
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
  decideLevelClaim, needGems, ITEMS, LEDGER_ITEMS, ledgerEntry, purchaseId, decidePurchase, normalizePack, normalizeShop, shopEntryLive, EVENT_GOALS, normalizeEvents, eventWindow, eventProgress, decideEventClaim, TOPUP_PERIODS, topupKey, topupEnd, addTopup, decideTopupClaim, limitPeriodStart, limitPeriodEnd, packBuysLeft, PACK_RESETS, SHOP_CURRENCIES, DEFAULT_TIERS, packIdFrom, normalizeItems, makeMail, MAIL_CATEGORIES, decideMailClaim, decideExtinguish, decideRepair, decideHit, checkHitCooldown, envRoot, cityDocId };
