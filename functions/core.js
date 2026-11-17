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
// v1092: the game freezes horde size / count at their 5-20 values (CURVE_ANCHOR = 100), so levels past chapter 5 can be cleared faster than before.
// The floor follows the TEST game; for the LIVE game (hordes still growing) this only makes the check a little looser past 5-20, never stricter.
const HORDE_FREEZE_AT = 100;
function hordeSize(g) { return Math.min(10, 5 + Math.floor((Math.min(g, HORDE_FREEZE_AT) - 1) / 25)); }
function hordeCount(g) { return Math.min(8, 4 + Math.floor((Math.min(g, HORDE_FREEZE_AT) - 1) / 30)); }
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
    mail: p.mail === true, active: p.active !== false, order: Math.trunc(+p.order || 0), grant: PACK_GRANTS.indexOf(String(p.grant || "")) >= 0 ? String(p.grant || "") : "" }; /* v1635: grant = card_weekly / card_monthly / pass_sp */
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
  /* v1596: popup deals - a pack shown as its own window (Kingshot style): a map icon while it runs and, if 'pop', it opens by itself once a
     day. hero = whose portrait sits on the deal (optional), value = the badge ("800%"). Start / end optional. */
  const pops = Array.isArray(shop.popups) ? shop.popups : []; if (pops.length > 20) throw new GameError("invalid-argument", "max 20 popup deals");
  out.popups = pops.map((x, i) => {
    const pack = String((x && x.pack) || ""); if (!pack || (ok && ok.indexOf(pack) < 0)) throw new GameError("invalid-argument", "popup deal " + (i + 1) + ": unknown pack " + pack);
    const start = +x.start > 0 ? Math.trunc(+x.start) : null, end = +x.end > 0 ? Math.trunc(+x.end) : null;
    if (start && end && end <= start) throw new GameError("invalid-argument", "popup deal " + (i + 1) + " ends before it starts");
    const hero = String(x.hero || "").toLowerCase(); if (hero && !/^[a-z0-9_]{1,24}$/.test(hero)) throw new GameError("invalid-argument", "popup deal " + (i + 1) + ": bad hero");
    return { pack, start, end, hero, value: String(x.value || "").trim().slice(0, 12), title: String(x.title || "").trim().slice(0, 40), pop: x.pop !== false, active: x.active !== false };
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
const EVENT_GOALS = ["power", "townhall", "conquest", "signin"]; /* v947: signin = daily sign-in (milestone target = day number) */
function normalizeEvents(list) {
  list = Array.isArray(list) ? list : []; if (list.length > 20) throw new GameError("invalid-argument", "max 20 events");
  const seen = {};
  return list.map((ev) => {
    const name = String((ev && ev.name) || "").trim().slice(0, 40); if (!name) throw new GameError("invalid-argument", "event needs a name");
    let id = packIdFrom(ev.id || name); while (seen[id]) id += "_2"; seen[id] = 1;
    const goal = String(ev.goal || "power"); if (EVENT_GOALS.indexOf(goal) < 0) throw new GameError("invalid-argument", "bad event goal");
    const sc = ev.schedule || {}, type = sc.type === "dates" ? "dates" : "newplayer", schedule = { type };
    if (type === "newplayer" && goal === "signin") schedule.days = 0; /* v947: no time limit - it stays until every day is claimed */
    else if (type === "newplayer") { const days = +sc.days; if (!(days > 0 && days <= 365)) throw new GameError("invalid-argument", "new-player event needs 1-365 days (" + name + ")"); schedule.days = days; }
    else { const st = Math.trunc(+sc.start || 0), en = Math.trunc(+sc.end || 0); if (!(st > 0 && en > st)) throw new GameError("invalid-argument", "dated event needs a start and an end (" + name + ")"); schedule.start = st; schedule.end = en; }
    let banner = null; if (ev.banner) { banner = String(ev.banner); if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(banner) || banner.length > 700000) throw new GameError("invalid-argument", "bad banner picture (" + name + ")"); }
    const ms = Array.isArray(ev.milestones) ? ev.milestones : []; if (!ms.length || ms.length > 30) throw new GameError("invalid-argument", "1-30 milestones (" + name + ")");
    if (goal === "signin" && ms.length > 30) throw new GameError("invalid-argument", "max 30 days (" + name + ")");
    const milestones = ms.map((m, mi) => { const target = goal === "signin" ? mi + 1 : Math.trunc(+(m && m.target) || 0); if (!(target > 0 && target <= 1e12)) throw new GameError("invalid-argument", "milestone target must be more than 0 (" + name + ")");
      /* v1630: "pick_shards" = shards of a hero the player picks when claiming (one of the Weekly Chest heroes, liveops wk.heroes) */
      const raw = Object.assign({}, (m && m.items) || {}), pick = Math.trunc(+raw.pick_shards || 0); delete raw.pick_shards;
      if (pick && !(pick >= 1 && pick <= 1e6)) throw new GameError("invalid-argument", "bad amount for pick_shards (" + name + ")");
      const list2 = pick && !Object.keys(raw).length ? [] : normalizeItems(raw), items = {}, labels = {}; list2.forEach((x) => { items[x.id] = x.qty; labels[x.id] = (x.icon ? x.icon + " " : "") + x.name; });
      if (pick) { items.pick_shards = pick; labels.pick_shards = PICK_SHARDS_LABEL; }
      return { target, worth: Math.max(0, Math.trunc(+m.worth || 0)), items, labels }; }).sort((a, b) => a.target - b.target);
    return { id, name, icon: Array.from(String(ev.icon || "🎉").trim()).slice(0, 4).join("") || "🎉", tag: String(ev.tag || "").trim().slice(0, 20), desc: String(ev.desc || "").trim().slice(0, 200),
      banner, goal, schedule, active: ev.active !== false, milestones };
  });
}
/* v1593: live events (Featured Hero Week, Event Shop, Weekly Chest, Event Tokens on the daily chests). Players read <root>config/liveops;
   only adminSaveLiveops writes it. The game pays these rewards itself (into the save), so only 'save' catalogue items (no gems) - plus
   "featured_shards" = shards of this week's featured hero. Every number is clamped; missing parts fall back to the game's own defaults. */
const LIVEOPS_KINDS = ["kill", "arena", "camp", "monster", "ticket", "newlevel", "boss", "build"];
function liveShopOk(id) { return id === "featured_shards" || id === "np_shards" || id === "sp_shards" || id === "cb_shards" || (!!ITEMS[id] && id[0] !== "_" && ITEMS[id].kind === "save"); }
/* v1625: event REWARDS may include gems (paid by the server: claimEv / mail); shops can't sell gems for event currencies */
function liveItemOk(id) { return id === "gems" || liveShopOk(id); }
function liveItems(obj, what) {
  const out = {}; Object.keys(obj || {}).forEach((id) => { const q = Math.trunc(+obj[id]); if (!liveItemOk(id)) throw new GameError("invalid-argument", "can't use " + id + " in " + what + " (unknown item)"); if (q >= 1 && q <= 1e9) out[id] = q; });
  if (!Object.keys(out).length) throw new GameError("invalid-argument", what + " needs at least one item"); if (Object.keys(out).length > 6) throw new GameError("invalid-argument", "max 6 items in " + what); return out;
}
const num = (v, lo, hi, def) => { const n = Math.trunc(+v); return isFinite(n) && n >= lo && n <= hi ? n : def; };
const heroKey = (k) => { const s = String(k || "").toLowerCase(); if (!/^[a-z0-9_]{1,24}$/.test(s)) throw new GameError("invalid-argument", "bad hero " + k); return s; };
/* v1594: Arena event. Points per win (+ a bonus for beating a higher-rated opponent), a daily milestone track (paid by the game), daily and
   weekly leaderboards per kingdom (<kingdom>arenalb/d<utc day>|w<week>/p/<uid>, written only by arenaScore) and rank rewards claimed after
   the day / week ends (claimArenaRank -> mail). rank rows: { to: last rank of the row (0 = everyone else with points), items }. */
const LIVE_ARENA_DEFAULT = {
  win: 20, upset: 10,
  ms: [{ at: 20, items: { arena_medals: 10 } }, { at: 60, items: { speedup_general_5m: 2 } }, { at: 100, items: { arena_medals: 20 } }, { at: 160, items: { weapon_tickets: 1 } }],
  rankD: [{ to: 1, items: { arena_medals: 200 } }, { to: 3, items: { arena_medals: 150 } }, { to: 10, items: { arena_medals: 100 } }, { to: 50, items: { arena_medals: 60 } }, { to: 100, items: { arena_medals: 40 } }, { to: 0, items: { arena_medals: 20 } }],
  rankW: [{ to: 1, items: { arena_medals: 1000, item_ufrag_legendary: 3 } }, { to: 3, items: { arena_medals: 700, item_ufrag_legendary: 3 } }, { to: 10, items: { arena_medals: 500, item_ufrag_legendary: 3 } }, { to: 50, items: { arena_medals: 300, item_ufrag_legendary: 3 } }, { to: 100, items: { arena_medals: 200, item_ufrag_legendary: 3 } }, { to: 0, items: { arena_medals: 100, item_ufrag_legendary: 3 } }], /* v1653: +3 Universal Legendary Fragments in every weekly rank reward */
  shop: { items: [{ id: "roran", item: "shards_roran", qty: 1, price: 150, limit: 2 }, { id: "kessa", item: "shards_kessa", qty: 1, price: 150, limit: 2 }, { id: "wsel", item: "item_chest_weapon", qty: 1, price: 400, limit: 1 },
    { id: "tix", item: "weapon_tickets", qty: 1, price: 80, limit: 5 }, { id: "su1h", item: "speedup_general_1h", qty: 1, price: 60, limit: 5 }, { id: "eq2", item: "item_chest_eq_2", qty: 1, price: 200, limit: 1 }] }
};
function arenaKeys(now) { const d = utcDay(now); return { d, w: Math.floor((d + 3) / 7) }; }
function arenaRankReward(rows, rank) { for (const r of rows || []) if ((r.to && rank <= r.to) || !r.to) return r.items; return null; }
function liveShopRows(list, what) {
  const sseen = {}; return (Array.isArray(list) ? list : []).slice(0, 24).map((x, i) => {
    const item = String((x && x.item) || ""); if (!liveShopOk(item)) throw new GameError("invalid-argument", what + " row " + (i + 1) + ": can't sell " + item);
    let id = packIdFrom((x && x.id) || item); while (sseen[id]) id += "_2"; sseen[id] = 1;
    return { id, item, qty: num(x && x.qty, 1, 1e6, 1), price: num(x && x.price, 1, 1e7, 100), limit: num(x && x.limit, 1, 9999, 1) }; });
}
function liveRankRows(list, what) {
  const rows = (Array.isArray(list) ? list : []).slice(0, 12).map((r, i) => ({ to: num(r && r.to, 0, 1e6, 0), items: liveItems(r && r.items, what + " row " + (i + 1)) }));
  rows.sort((a, b) => (a.to || 1e9) - (b.to || 1e9)); return rows;
}
function normalizeArena(a) {
  if (!a) return JSON.parse(JSON.stringify(LIVE_ARENA_DEFAULT));
  const ms = (Array.isArray(a.ms) ? a.ms : []).slice(0, 12).map((m, i) => ({ at: num(m && m.at, 1, 1e9, 0) || (() => { throw new GameError("invalid-argument", "arena milestone " + (i + 1) + " needs points"); })(), items: liveItems(m && m.items, "arena milestone " + (i + 1)) })).sort((x, y) => x.at - y.at);
  return { win: num(a.win, 0, 10000, 20), upset: num(a.upset, 0, 10000, 0), ms, rankD: liveRankRows(a.rankD, "daily rank"), rankW: liveRankRows(a.rankW, "weekly rank"), shop: { items: liveShopRows((a.shop || {}).items, "Arena Shop") } };
}
/* v1597: Forge Frenzy - every second weekend (Fri-Sun UTC, weeks where week % 2 === parity): points for weapon draw tickets and forged pieces. */
const LIVE_FF_DEFAULT = { on: true, parity: 0, pts: { ticket: 10, forge: 1 },
  ms: [{ at: 200, items: { weapon_tickets: 1 } }, { at: 500, items: { event_tokens: 15 } }, { at: 1000, items: { weapon_tickets: 2 } }, { at: 2000, items: { item_chest_eq_2: 1 } }, { at: 3500, items: { item_chest_weapon: 1 } }] };
function normalizeFF(f) {
  if (!f) return JSON.parse(JSON.stringify(LIVE_FF_DEFAULT));
  const ms = (Array.isArray(f.ms) ? f.ms : []).slice(0, 12).map((m, i) => ({ at: num(m && m.at, 1, 1e9, 0) || (() => { throw new GameError("invalid-argument", "Forge Frenzy milestone " + (i + 1) + " needs points"); })(), items: liveItems(m && m.items, "Forge Frenzy milestone " + (i + 1)) })).sort((x, y) => x.at - y.at);
  const P = f.pts || {}; return { on: f.on !== false, parity: num(f.parity, 0, 1, 0), pts: { ticket: num(P.ticket, 0, 1e5, 0), forge: num(P.forge, 0, 1e5, 0) }, ms };
}
/* v1599/v1600: Boss Rush - the kaiju, Tue-Thu (days = UTC weekdays, 0 = Sunday). He can't die: a damage ranker - your best single fight's damage ranks you in
   your kingdom (bosslb, rank rewards after the run). v1604: levels - level L has hp1 x (1 + hpGrow%)^(L-1) health and hits for the flat beam / stomp /
   stompHero numbers x (1 + dmgGrow%)^(L-1); at maxLv his bar never empties. Milestones (at) = highest level reached this run. */
const LIVE_BR_DEFAULT = { on: true, days: [2, 3, 4], tries: 3, sec: 60, hp1: 1000, hpGrow: 8, dmgGrow: 8, maxLv: 100, beam: 300, stomp: 250, stompHero: 300, blastEvery: 6, stompEvery: 10, blastFirst: 4, stompFirst: 9,
  ms: [{ at: 5, items: { conquest_books: 20 } }, { at: 10, items: { event_tokens: 15 } }, { at: 20, items: { research: 300 } }, { at: 35, items: { event_tokens: 25 } }, { at: 50, items: { featured_shards: 10 } }],
  rank: [{ to: 1, items: { featured_shards: 10 } }, { to: 3, items: { featured_shards: 5 } }, { to: 10, items: { event_tokens: 60 } }, { to: 50, items: { event_tokens: 40 } }, { to: 100, items: { event_tokens: 25 } }, { to: 0, items: { event_tokens: 10 } }] };
function normalizeBR(b) {
  if (!b) return JSON.parse(JSON.stringify(LIVE_BR_DEFAULT));
  const ms = !Array.isArray(b.ms) ? JSON.parse(JSON.stringify(LIVE_BR_DEFAULT.ms)) : b.ms.slice(0, 12).map((m, i) => ({ at: num(m && m.at, 1, 1e9, 0) || (() => { throw new GameError("invalid-argument", "Boss Rush milestone " + (i + 1) + " needs a level"); })(), items: liveItems(m && m.items, "Boss Rush milestone " + (i + 1)) })).sort((x, y) => x.at - y.at); /* no list sent = the default track */
  const days = []; (Array.isArray(b.days) ? b.days : []).forEach((d) => { const v = num(d, 0, 6, -1); if (v >= 0 && days.indexOf(v) < 0) days.push(v); }); days.sort();
  const D = LIVE_BR_DEFAULT, g = (k, lo, hi) => num(b[k], lo, hi, D[k]);
  return { on: b.on !== false, days: days.length ? days : D.days.slice(), tries: g("tries", 1, 20), sec: g("sec", 20, 180), hp1: g("hp1", 1, 1e12), hpGrow: g("hpGrow", 0, 100), dmgGrow: g("dmgGrow", 0, 100), maxLv: g("maxLv", 1, 1000),
    beam: g("beam", 0, 1e12), stomp: g("stomp", 0, 1e12), stompHero: g("stompHero", 0, 1e12), blastEvery: g("blastEvery", 2, 60), stompEvery: g("stompEvery", 3, 60), blastFirst: g("blastFirst", 1, 60), stompFirst: g("stompFirst", 1, 60), ms,
    rank: b.rank ? liveRankRows(b.rank, "Boss Rush rank") : JSON.parse(JSON.stringify(D.rank)) };
}
/* v1600: is the Boss Rush run of week w over (no run day left that week)? Weeks start Monday (same as arenaKeys). */
function bossRunOver(br, w, now) {
  const k = arenaKeys(now); if (w < k.w) return true; if (w > k.w) return false;
  const pos = (d) => (d + 6) % 7, today = pos((k.d + 4) % 7), last = Math.max.apply(null, (br.days || [2, 3, 4]).map(pos));
  return today > last;
}
/* v1601: mail can only carry real catalogue items - turn "featured_shards" into that week's featured hero's shards before a reward is mailed */
function resolveFeatured(items, lo) {
  const hero = lo && lo.fhw && lo.fhw.hero, out = {};
  Object.keys(items || {}).forEach((id) => { const k = id === "featured_shards" ? (hero && ITEMS["shards_" + hero] ? "shards_" + hero : null) : id; if (k) out[k] = (out[k] || 0) + items[id]; });
  return out;
}
function bossRunOpen(br, now) { const k = arenaKeys(now); return br.on !== false && (br.days || []).indexOf((k.d + 4) % 7) >= 0;
}
/* v1617: New Player Path - the first `days` days of an account (day 1 = the day it was made). Each task unlocks on its day and pays once (the game pays,
   into the save); all of a day's tasks done = that day's chest. "np_shards" = shards of np.hero. th / cq / heroes / hlv / eq / ally are checked against
   the save; the other kinds count from when the path starts. */
const NP_KINDS = ["th", "cq", "heroes", "hlv", "eq", "ally", "arena", "camp", "monster", "ticket", "build", "forge", "kill"];
const LIVE_NP_DEFAULT = {"on": true, "days": 14, "hero": "roran", "tasks": [{"id": "d1a", "day": 1, "kind": "cq", "need": 3, "name": "Clear 3 Conquest levels", "items": {"conquest_books": 5}}, {"id": "d1b", "day": 1, "kind": "build", "need": 2, "name": "Upgrade buildings 2 times", "items": {"speedup_general_5m": 3}}, {"id": "d1c", "day": 1, "kind": "kill", "need": 200, "name": "Defeat 200 enemies in Conquest", "items": {"food": 2000}}, {"id": "d2a", "day": 2, "kind": "eq", "need": 1, "name": "Equip a piece of equipment", "items": {"speedup_general_5m": 3}}, {"id": "d2b", "day": 2, "kind": "arena", "need": 1, "name": "Win an Arena fight", "items": {"weapon_tickets": 1}}, {"id": "d2c", "day": 2, "kind": "ticket", "need": 3, "name": "Use 3 weapon draw tickets", "items": {"wood": 2000}}, {"id": "d3a", "day": 3, "kind": "th", "need": 3, "name": "Town Hall level 3", "items": {"speedup_general_1h": 1}}, {"id": "d3b", "day": 3, "kind": "cq", "need": 8, "name": "Clear 8 Conquest levels", "items": {"conquest_books": 10}}, {"id": "d3c", "day": 3, "kind": "camp", "need": 1, "name": "Defeat a camp on the World map", "items": {"stone": 2000}}, {"id": "d4a", "day": 4, "kind": "hlv", "need": 10, "name": "Raise a hero to level 10", "items": {"conquest_books": 10}}, {"id": "d4b", "day": 4, "kind": "ally", "need": 1, "name": "Join an alliance", "items": {"speedup_general_1h": 1}}, {"id": "d4c", "day": 4, "kind": "forge", "need": 3, "name": "Forge 3 pieces of equipment", "items": {"food": 4000}}, {"id": "d5a", "day": 5, "kind": "cq", "need": 12, "name": "Clear 12 Conquest levels", "items": {"weapon_tickets": 1}}, {"id": "d5b", "day": 5, "kind": "arena", "need": 3, "name": "Win 3 Arena fights", "items": {"speedup_general_5m": 6}}, {"id": "d5c", "day": 5, "kind": "monster", "need": 2, "name": "Defeat 2 monsters on the World map", "items": {"item_stamina_10": 1}}, {"id": "d6a", "day": 6, "kind": "th", "need": 4, "name": "Town Hall level 4", "items": {"speedup_general_1h": 1}}, {"id": "d6b", "day": 6, "kind": "eq", "need": 3, "name": "Equip 3 pieces of equipment", "items": {"wood": 4000}}, {"id": "d6c", "day": 6, "kind": "kill", "need": 1500, "name": "Defeat 1,500 enemies in Conquest", "items": {"conquest_books": 10}}, {"id": "d7a", "day": 7, "kind": "cq", "need": 20, "name": "Beat the chapter 1 boss", "items": {"weapon_tickets": 2}}, {"id": "d7b", "day": 7, "kind": "heroes", "need": 3, "name": "Have 3 heroes", "items": {"stone": 4000}}, {"id": "d7c", "day": 7, "kind": "build", "need": 10, "name": "Upgrade buildings 10 times", "items": {"speedup_general_1h": 1}}, {"id": "d8a", "day": 8, "kind": "hlv", "need": 20, "name": "Raise a hero to level 20", "items": {"conquest_books": 15}}, {"id": "d8b", "day": 8, "kind": "camp", "need": 5, "name": "Defeat 5 camps on the World map", "items": {"food": 6000}}, {"id": "d8c", "day": 8, "kind": "ticket", "need": 10, "name": "Use 10 weapon draw tickets", "items": {"speedup_general_5m": 6}}, {"id": "d9a", "day": 9, "kind": "cq", "need": 26, "name": "Clear 26 Conquest levels", "items": {"weapon_tickets": 1}}, {"id": "d9b", "day": 9, "kind": "arena", "need": 8, "name": "Win 8 Arena fights", "items": {"speedup_general_1h": 1}}, {"id": "d9c", "day": 9, "kind": "forge", "need": 10, "name": "Forge 10 pieces of equipment", "items": {"wood": 6000}}, {"id": "d10a", "day": 10, "kind": "th", "need": 5, "name": "Town Hall level 5", "items": {"speedup_general_1h": 2}}, {"id": "d10b", "day": 10, "kind": "monster", "need": 5, "name": "Defeat 5 monsters on the World map", "items": {"item_stamina_10": 1}}, {"id": "d10c", "day": 10, "kind": "kill", "need": 4000, "name": "Defeat 4,000 enemies in Conquest", "items": {"conquest_books": 15}}, {"id": "d11a", "day": 11, "kind": "eq", "need": 6, "name": "Equip 6 pieces of equipment", "items": {"stone": 6000}}, {"id": "d11b", "day": 11, "kind": "cq", "need": 32, "name": "Clear 32 Conquest levels", "items": {"weapon_tickets": 2}}, {"id": "d11c", "day": 11, "kind": "build", "need": 20, "name": "Upgrade buildings 20 times", "items": {"speedup_general_1h": 1}}, {"id": "d12a", "day": 12, "kind": "hlv", "need": 30, "name": "Raise a hero to level 30", "items": {"conquest_books": 20}}, {"id": "d12b", "day": 12, "kind": "arena", "need": 15, "name": "Win 15 Arena fights", "items": {"speedup_general_1h": 1}}, {"id": "d12c", "day": 12, "kind": "camp", "need": 10, "name": "Defeat 10 camps on the World map", "items": {"food": 8000}}, {"id": "d13a", "day": 13, "kind": "th", "need": 6, "name": "Town Hall level 6", "items": {"speedup_general_1h": 2}}, {"id": "d13b", "day": 13, "kind": "heroes", "need": 4, "name": "Have 4 heroes", "items": {"wood": 8000}}, {"id": "d13c", "day": 13, "kind": "ticket", "need": 20, "name": "Use 20 weapon draw tickets", "items": {"weapon_tickets": 1}}, {"id": "d14a", "day": 14, "kind": "cq", "need": 40, "name": "Beat the chapter 2 boss", "items": {"weapon_tickets": 2}}, {"id": "d14b", "day": 14, "kind": "kill", "need": 8000, "name": "Defeat 8,000 enemies in Conquest", "items": {"conquest_books": 20}}, {"id": "d14c", "day": 14, "kind": "forge", "need": 20, "name": "Forge 20 pieces of equipment", "items": {"stone": 8000}}], "chests": [{"day": 1, "items": {"speedup_general_5m": 5}}, {"day": 2, "items": {"weapon_tickets": 1}}, {"day": 3, "items": {"np_shards": 1, "speedup_general_1h": 1}}, {"day": 4, "items": {"event_tokens": 10}}, {"day": 5, "items": {"weapon_tickets": 2}}, {"day": 6, "items": {"speedup_general_1h": 2}}, {"day": 7, "items": {"item_chest_eq_2": 1}}, {"day": 8, "items": {"event_tokens": 15}}, {"day": 9, "items": {"weapon_tickets": 2}}, {"day": 10, "items": {"speedup_general_1h": 3}}, {"day": 11, "items": {"event_tokens": 20}}, {"day": 12, "items": {"weapon_tickets": 3}}, {"day": 13, "items": {"item_chest_eq_2": 1}}, {"day": 14, "items": {"np_shards": 20}}]};
function normalizeNP(p) {
  if (!p) return JSON.parse(JSON.stringify(LIVE_NP_DEFAULT));
  const days = num(p.days, 1, 30, 14), seen = {};
  const tasks = (Array.isArray(p.tasks) ? p.tasks : []).slice(0, 90).map((t, i) => {
    const kind = String((t && t.kind) || ""); if (NP_KINDS.indexOf(kind) < 0) throw new GameError("invalid-argument", "New Player Path task " + (i + 1) + ": bad kind");
    let id = packIdFrom((t && t.id) || "t" + i); while (seen[id]) id += "_2"; seen[id] = 1;
    return { id, day: num(t && t.day, 1, days, 1), kind, need: num(t && t.need, 1, 1e9, 1), name: String((t && t.name) || "").trim().slice(0, 60) || kind, items: liveItems(t && t.items, "New Player Path task " + (i + 1)) }; });
  const cseen = {}, chests = (Array.isArray(p.chests) ? p.chests : []).slice(0, 30).map((c, i) => { const day = num(c && c.day, 1, days, 0); if (!day || cseen[day]) throw new GameError("invalid-argument", "New Player Path chest " + (i + 1) + ": needs its own day (1-" + days + ")"); cseen[day] = 1;
    return { day, items: liveItems(c && c.items, "New Player Path day " + day + " chest") }; }).sort((a, b) => a.day - b.day);
  return { on: p.on !== false, days, hero: heroKey(p.hero || "roran"), tasks, chests };
}
/* v1618: Conquest Sprint - Mon-Sun of every second week (week % 2 === parity); one-time tasks (each pays once a week, the game pays into the save);
   all tasks claimed = the final chest. Kinds = LIVEOPS_KINDS + heroup (hero level-ups). */
const CS_KINDS = ["kill", "arena", "camp", "monster", "ticket", "newlevel", "boss", "build", "forge", "heroup"];
const LIVE_CS_DEFAULT = {"on": true, "parity": 1, "tasks": [{"id": "lvl", "kind": "newlevel", "need": 3, "name": "Clear 3 new Conquest levels", "items": {"conquest_books": 10}}, {"id": "boss", "kind": "boss", "need": 1, "name": "Beat your next chapter boss", "items": {"weapon_tickets": 2}}, {"id": "kill", "kind": "kill", "need": 2000, "name": "Defeat 2,000 enemies in Conquest (farming counts)", "items": {"speedup_general_1h": 1}}, {"id": "arena", "kind": "arena", "need": 5, "name": "Win 5 Arena fights", "items": {"event_tokens": 10}}, {"id": "hero", "kind": "heroup", "need": 3, "name": "Level up your heroes 3 times", "items": {"conquest_books": 10}}, {"id": "tix", "kind": "ticket", "need": 20, "name": "Use 20 weapon draw tickets", "items": {"speedup_general_5m": 6}}, {"id": "bld", "kind": "build", "need": 3, "name": "Upgrade buildings 3 times", "items": {"food": 5000}}, {"id": "camp", "kind": "camp", "need": 3, "name": "Win 3 fights against camps", "items": {"item_stamina_10": 1}}], "fin": {"speedup_general_1h": 3, "event_tokens": 25, "conquest_books": 20, "featured_shards": 3}};
function normalizeCS(p) {
  if (!p) return JSON.parse(JSON.stringify(LIVE_CS_DEFAULT));
  const seen = {}, tasks = (Array.isArray(p.tasks) ? p.tasks : []).slice(0, 16).map((t, i) => {
    const kind = String((t && t.kind) || ""); if (CS_KINDS.indexOf(kind) < 0) throw new GameError("invalid-argument", "Conquest Sprint task " + (i + 1) + ": bad kind");
    let id = packIdFrom((t && t.id) || kind + "_" + i); while (seen[id]) id += "_2"; seen[id] = 1;
    return { id, kind, need: num(t && t.need, 1, 1e9, 1), name: String((t && t.name) || "").trim().slice(0, 60) || kind, items: liveItems(t && t.items, "Conquest Sprint task " + (i + 1)) }; });
  return { on: p.on !== false, parity: num(p.parity, 0, 1, 1), tasks, fin: liveItems(p.fin, "Conquest Sprint final chest") };
}
/* v1621: Season Pass - `days`-long seasons from UTC day `start`; XP = Event Tokens earned; `xp` tokens a level; each level a free + a premium reward
   (premium = a paid pass - payments not connected yet). The game pays the rewards into the save. "sp_shards" = shards of the season hero. */
const LIVE_SP_DEFAULT = {"on": true, "start": 20766, "days": 28, "hero": "halo7", "name": "Season of the Iron Golem", "xp": 20, "levels": [{"free": {"conquest_books": 10}, "prem": {"sp_shards": 2}}, {"free": {"weapon_tickets": 1}, "prem": {"sp_shards": 2}}, {"free": {"speedup_general_5m": 5}, "prem": {"sp_shards": 2}}, {"free": {"research": 300}, "prem": {"sp_shards": 2}}, {"free": {"item_stamina_10": 1}, "prem": {"sp_shards": 2, "speedup_general_1h": 2}}, {"free": {"conquest_books": 10}, "prem": {"sp_shards": 2}}, {"free": {"weapon_tickets": 1}, "prem": {"sp_shards": 2}}, {"free": {"speedup_general_5m": 5}, "prem": {"sp_shards": 2}}, {"free": {"research": 300}, "prem": {"sp_shards": 2}}, {"free": {"sp_shards": 2}, "prem": {"sp_shards": 2, "item_chest_eq_3": 1}}, {"free": {"conquest_books": 10}, "prem": {"sp_shards": 2}}, {"free": {"weapon_tickets": 1}, "prem": {"sp_shards": 2}}, {"free": {"speedup_general_5m": 5}, "prem": {"sp_shards": 2}}, {"free": {"research": 300}, "prem": {"sp_shards": 2}}, {"free": {"item_stamina_10": 1}, "prem": {"sp_shards": 2, "speedup_general_1h": 2}}, {"free": {"conquest_books": 10}, "prem": {"sp_shards": 2}}, {"free": {"weapon_tickets": 1}, "prem": {"sp_shards": 2}}, {"free": {"speedup_general_5m": 5}, "prem": {"sp_shards": 2}}, {"free": {"research": 300}, "prem": {"sp_shards": 2}}, {"free": {"sp_shards": 2}, "prem": {"sp_shards": 2, "item_chest_weapon": 1}}, {"free": {"conquest_books": 10}, "prem": {"sp_shards": 2}}, {"free": {"weapon_tickets": 1}, "prem": {"sp_shards": 2}}, {"free": {"speedup_general_5m": 5}, "prem": {"sp_shards": 2}}, {"free": {"research": 300}, "prem": {"sp_shards": 2}}, {"free": {"item_stamina_10": 1}, "prem": {"sp_shards": 2, "speedup_general_1h": 2}}, {"free": {"conquest_books": 10}, "prem": {"sp_shards": 2}}, {"free": {"weapon_tickets": 1}, "prem": {"sp_shards": 2}}, {"free": {"speedup_general_5m": 5}, "prem": {"sp_shards": 2}}, {"free": {"research": 300}, "prem": {"sp_shards": 2}}, {"free": {"sp_shards": 2}, "prem": {"sp_shards": 2, "item_chest_eq_4": 1}}]};
function normalizeSP(p) {
  if (!p) return JSON.parse(JSON.stringify(LIVE_SP_DEFAULT));
  const levels = (Array.isArray(p.levels) ? p.levels : []).slice(0, 60).map((l, i) => ({ free: liveItems(l && l.free, "Season Pass level " + (i + 1) + " free"), prem: liveItems(l && l.prem, "Season Pass level " + (i + 1) + " premium") }));
  if (!levels.length) throw new GameError("invalid-argument", "Season Pass needs at least one level");
  return { on: p.on !== false, start: num(p.start, 0, 1e6, LIVE_SP_DEFAULT.start), days: num(p.days, 7, 120, 28), hero: heroKey(p.hero || "halo7"), name: String(p.name || "").trim().slice(0, 50), xp: num(p.xp, 1, 1e6, 20), levels };
}
/* v1623: Alliance Siege (Bear Hunt style). Each alliance gets `perWeek` hunts a UTC week; an R4/R5 schedules each one (or starts it now). A hunt lasts
   `mins` minutes: the siege boss stands at the alliance's spot on the World map and members attack it in RALLIES - one member starts a rally, others
   join within `wait` seconds (up to `maxRally` players), then it hits once. Each member's share = their power (alliance roster) x `dpp`, x0.9-1.1, x the
   rally bonus (1 + bonusPer per extra member, at most +bonusCap). Rewards after the hunt (by mail): the highest personal tier reached + the highest
   alliance tier reached. The boss never dies - it's all about total damage. */
const LIVE_SG_DEFAULT = {"on": true, "perWeek": 3, "mins": 30, "wait": 60, "maxRally": 15, "dpp": 1.0, "bonusPer": 0.04, "bonusCap": 0.5, "boss": {"sec": 60}, "capTp": 25, "capLp": 2, "capFlat": 2000000, "personal": [{"dmg": 1, "items": {"speedup_general_5m": 5, "conquest_books": 5}}, {"dmg": 100000, "items": {"speedup_general_5m": 10, "conquest_books": 10}}, {"dmg": 1000000, "items": {"speedup_general_1h": 2, "conquest_books": 20, "weapon_tickets": 1}}, {"dmg": 5000000, "items": {"speedup_general_1h": 4, "conquest_books": 40, "weapon_tickets": 2, "event_tokens": 15}}, {"dmg": 20000000, "items": {"speedup_general_1h": 6, "conquest_books": 60, "weapon_tickets": 3, "event_tokens": 25}}, {"dmg": 60000000, "items": {"speedup_general_1h": 10, "conquest_books": 100, "weapon_tickets": 5, "event_tokens": 40, "item_chest_eq_3": 1}}, {"dmg": 150000000, "items": {"speedup_general_1h": 15, "conquest_books": 150, "weapon_tickets": 8, "event_tokens": 60, "item_chest_eq_4": 1}}], "alliance": [{"dmg": 1, "items": {"speedup_general_5m": 5}}, {"dmg": 10000000, "items": {"speedup_general_1h": 2, "research": 500}}, {"dmg": 100000000, "items": {"speedup_general_1h": 4, "research": 1500, "weapon_tickets": 1}}, {"dmg": 500000000, "items": {"speedup_general_1h": 6, "research": 3000, "weapon_tickets": 2, "event_tokens": 20}}, {"dmg": 1500000000, "items": {"speedup_general_1h": 10, "research": 6000, "weapon_tickets": 3, "event_tokens": 30, "featured_shards": 3}}, {"dmg": 4000000000, "items": {"speedup_general_1h": 15, "research": 10000, "weapon_tickets": 5, "event_tokens": 50, "featured_shards": 5}}]};
/* v1631: Comeback Bonus ("Welcome back") - a player who comes back after `away` days gets a `days`-day reward track (day n opens on the n-th day back)
   and boosts while it runs: gather (World map loot) and Conquest Valor + `boost` %. The server notices the return (touch: meta.account.cb = { start: utc
   day }) and pays the rewards (claimEv src "cb"). "cb_shards" = shards of cb.hero. */
const LIVE_CB_DEFAULT = {"on": true, "away": 7, "days": 7, "hero": "kessa", "name": "Welcome Back", "boost": {"gather": 50, "valor": 50}, "rewards": [{"day": 1, "items": {"gems": 300, "speedup_general_1h": 2, "food": 20000}}, {"day": 2, "items": {"gems": 300, "weapon_tickets": 3, "conquest_books": 20}}, {"day": 3, "items": {"gems": 400, "cb_shards": 10, "speedup_general_1h": 2}}, {"day": 4, "items": {"gems": 400, "item_stamina_10": 2, "wood": 30000}}, {"day": 5, "items": {"gems": 500, "weapon_tickets": 5, "research": 1000}}, {"day": 6, "items": {"gems": 500, "item_chest_eq_3": 1, "speedup_general_1h": 3}}, {"day": 7, "items": {"gems": 1000, "cb_shards": 30, "item_chest_weapon": 1}}]};
function normalizeCB(p) {
  if (!p) return JSON.parse(JSON.stringify(LIVE_CB_DEFAULT));
  const days = num(p.days, 1, 14, 7), B = p.boost || {}, seen = {};
  const rewards = (Array.isArray(p.rewards) ? p.rewards : []).slice(0, 14).map((r, i) => { const day = num(r && r.day, 1, days, 0); if (!day || seen[day]) throw new GameError("invalid-argument", "Welcome Back reward " + (i + 1) + ": needs its own day (1-" + days + ")"); seen[day] = 1;
    return { day, items: liveItems(r && r.items, "Welcome Back day " + day) }; }).sort((a, b) => a.day - b.day);
  return { on: p.on !== false, away: num(p.away, 2, 90, 7), days, hero: heroKey(p.hero || "kessa"), name: String(p.name || "").trim().slice(0, 40) || "Welcome Back", boost: { gather: num(B.gather, 0, 500, 50), valor: num(B.valor, 0, 500, 50) }, rewards };
}
/* touch: has this player just come back? d = meta.account before this visit. Returns the cb record to keep (or null). */
function comebackCheck(d, CB, now) {
  const cur = d && d.cb && utcDay(now) - d.cb.start < ((CB && CB.days) || 7) ? d.cb : null; if (cur) return cur;
  if (!CB || CB.on === false || !d || !d.lastSeen) return null;
  return now - d.lastSeen >= CB.away * 86400000 ? { start: utcDay(now) } : null;
}
/* v1632: Hero Collection Book - rewards for each hero you own (stars 0 = owning it) and reach 3 / 5 stars with, and for how many heroes you own.
   Paid once per account by the server (claimEv src "hc", period 0), checked against the saved game (heroes[k].owned / .stars = star arms, 5 a star). */
const LIVE_HC_DEFAULT = {"on": true, "steps": [{"stars": 0, "items": {"gems": 100, "conquest_books": 10}}, {"stars": 3, "items": {"gems": 300, "speedup_general_1h": 2}}, {"stars": 5, "items": {"gems": 800, "weapon_tickets": 5}}], "counts": [{"n": 3, "items": {"gems": 300, "item_chest_eq_2": 1}}, {"n": 6, "items": {"gems": 600, "item_chest_eq_3": 1}}, {"n": 10, "items": {"gems": 1200, "item_chest_weapon": 1}}, {"n": 15, "items": {"gems": 2500, "item_chest_eq_4": 1}}]};
function normalizeHC(p) {
  if (!p) return JSON.parse(JSON.stringify(LIVE_HC_DEFAULT));
  const steps = (Array.isArray(p.steps) ? p.steps : []).slice(0, 6).map((x, i) => ({ stars: num(x && x.stars, 0, 5, 0), items: liveItems(x && x.items, "Collection step " + (i + 1)) })).sort((a, b) => a.stars - b.stars);
  const counts = (Array.isArray(p.counts) ? p.counts : []).slice(0, 12).map((x, i) => ({ n: num(x && x.n, 1, 200, 1), items: liveItems(x && x.items, "Collection milestone " + (i + 1)) })).sort((a, b) => a.n - b.n);
  return { on: p.on !== false, steps, counts };
}
const HC_HEROES = () => Object.keys(ITEMS).filter((k) => /^shards_/.test(k)).map((k) => k.slice(7)); /* collectable heroes = the ones with shards */
function hcOwned(save) { const H = (save && save.heroes) || {}; return HC_HEROES().filter((k) => H[k] && H[k].owned); }
function hcStars(save, k) { const h = ((save && save.heroes) || {})[k]; return h && h.owned ? Math.floor(Math.max(0, Math.min(25, +h.stars || 0)) / 5) : -1; }
/* v1633: Seasonal Festivals - dated festivals (UTC days, start..end inclusive) set in the admin page. While one runs: festival points from play
   (pts per action, like Featured Hero Week) fill a milestone track; rewards paid by the server (claimEv src "fs", period = the festival's start day). */
const FS_ARTS = ["", "winter", "lunar"]; /* v1639: festival banners (art/events/banner_fs_<art>.webp) */
const FS_KINDS = ["kill", "arena", "camp", "monster", "ticket", "build", "newlevel"];
const LIVE_FS_DEFAULT = {"on": true, "list": [{"id": "winter26", "name": "Winter Festival", "start": 20805, "end": 20821, "art": "winter", "pts": {"kill": 2, "arena": 20, "camp": 15, "monster": 15, "ticket": 3, "build": 10, "newlevel": 30}, "ms": [{"at": 200, "items": {"gems": 200, "speedup_general_1h": 2}}, {"at": 600, "items": {"gems": 400, "weapon_tickets": 3}}, {"at": 1200, "items": {"gems": 600, "item_chest_eq_3": 1}}, {"at": 2000, "items": {"gems": 1000, "featured_shards": 10}}, {"at": 3500, "items": {"gems": 1500, "item_chest_weapon": 1}}, {"at": 5000, "items": {"gems": 2500, "item_chest_eq_4": 1, "featured_shards": 20}}]}, {"id": "lunar27", "name": "Lunar Festival", "start": 20855, "end": 20865, "art": "lunar", "pts": {"kill": 2, "arena": 20, "camp": 15, "monster": 15, "ticket": 3, "build": 10, "newlevel": 30}, "ms": [{"at": 200, "items": {"gems": 200, "conquest_books": 20}}, {"at": 600, "items": {"gems": 400, "weapon_tickets": 3}}, {"at": 1200, "items": {"gems": 600, "item_chest_eq_3": 1}}, {"at": 2000, "items": {"gems": 1000, "featured_shards": 10}}, {"at": 3500, "items": {"gems": 2000, "item_chest_weapon": 1, "item_chest_eq_4": 1}}]}]};
function normalizeFS(p) {
  if (!p) return JSON.parse(JSON.stringify(LIVE_FS_DEFAULT));
  const seen = {}, list = (Array.isArray(p.list) ? p.list : []).slice(0, 12).map((f, i) => {
    let id = packIdFrom((f && f.id) || (f && f.name) || "fest" + i); while (seen[id]) id += "_2"; seen[id] = 1;
    const start = num(f && f.start, 1, 1e6, 0), end = num(f && f.end, 1, 1e6, 0); if (!start || end < start || end - start > 60) throw new GameError("invalid-argument", "festival " + (i + 1) + ": needs a start and an end date (at most 60 days)");
    const P = (f && f.pts) || {}, pts = {}; FS_KINDS.forEach((k) => { pts[k] = num(P[k], 0, 1e5, 0); });
    const ms = (Array.isArray(f.ms) ? f.ms : []).slice(0, 12).map((m, j) => ({ at: num(m && m.at, 1, 1e9, 0) || (() => { throw new GameError("invalid-argument", "festival " + (i + 1) + " milestone " + (j + 1) + " needs points"); })(), items: liveItems(m && m.items, "festival " + (i + 1) + " milestone " + (j + 1)) })).sort((a, b) => a.at - b.at);
    return { id, name: String((f && f.name) || "").trim().slice(0, 40) || "Festival", start, end, art: FS_ARTS.indexOf(String((f && f.art) || "")) >= 0 ? String(f.art || "") : "", pts, ms }; }).sort((a, b) => a.start - b.start);
  for (let i = 1; i < list.length; i++) if (list[i].start <= list[i - 1].end) throw new GameError("invalid-argument", "festivals " + list[i - 1].name + " and " + list[i].name + " overlap");
  return { on: p.on !== false, list };
}
function fsAt(FS, day) { return FS && FS.on !== false ? (FS.list || []).find((f) => day >= f.start && day <= f.end) || null : null; }
/* v1635: Weekly / Monthly Cards (paid, "best value" packs). A card = `days` days: gems + items the moment it's bought (the shop pack carries
   them), and a daily reward claimed each day it's active (claimEv src "cdd", ref = card id). Card owners also get the weekly "pick your reward"
   track: festival-style points from play, each milestone lets the player choose 1 of its options (src "cdp", ref "<milestone>:<option>").
   Ownership: wallet.cards = { <id>: { from: utc day, until: utc day (not included) } }, set by a purchase of a pack with grant "card_<id>". */
const LIVE_CD_DEFAULT = {"on": true, "cards": [{"id": "weekly", "name": "Weekly Card", "days": 7, "tier": 4, "now": {"gems": 2500}, "daily": {"gems": 600, "speedup_general_1h": 1, "weapon_tickets": 1}}, {"id": "monthly", "name": "Monthly Card", "days": 30, "tier": 5, "now": {"gems": 5000}, "daily": {"gems": 800, "speedup_general_1h": 2, "item_stamina_10": 1}}], "pts": {"kill": 2, "arena": 20, "camp": 15, "monster": 15, "ticket": 3, "build": 10, "newlevel": 30}, "track": [{"at": 300, "opts": [{"gems": 500}, {"speedup_general_1h": 5}, {"weapon_tickets": 5}]}, {"at": 600, "opts": [{"gems": 800}, {"featured_shards": 5}, {"item_chest_eq_3": 1}]}, {"at": 1200, "opts": [{"gems": 1200}, {"featured_shards": 10}, {"item_chest_weapon": 1}]}, {"at": 2500, "opts": [{"gems": 2000}, {"featured_shards": 20}, {"item_chest_eq_4": 1}]}]};
function normalizeCD(p) {
  if (!p) return JSON.parse(JSON.stringify(LIVE_CD_DEFAULT));
  const cards = ["weekly", "monthly"].map((id, i) => { const c = (Array.isArray(p.cards) ? p.cards : []).find((x) => x && x.id === id) || LIVE_CD_DEFAULT.cards[i];
    return { id, name: String(c.name || "").trim().slice(0, 30) || LIVE_CD_DEFAULT.cards[i].name, days: num(c.days, 1, 90, LIVE_CD_DEFAULT.cards[i].days), tier: num(c.tier, 0, 50, LIVE_CD_DEFAULT.cards[i].tier), now: liveItems(c.now, id + " card - when bought"), daily: liveItems(c.daily, id + " card - daily") }; });
  const P = p.pts || {}, pts = {}; FS_KINDS.forEach((k) => { pts[k] = num(P[k], 0, 1e5, 0); });
  const track = (Array.isArray(p.track) ? p.track : []).slice(0, 10).map((m, i) => ({ at: num(m && m.at, 1, 1e9, 0) || (() => { throw new GameError("invalid-argument", "card track milestone " + (i + 1) + " needs points"); })(),
    opts: (Array.isArray(m.opts) ? m.opts : []).slice(0, 4).map((o, j) => liveItems(o, "card track milestone " + (i + 1) + " choice " + (j + 1))) })).filter((m) => m.opts.length).sort((a, b) => a.at - b.at);
  return { on: p.on !== false, cards, pts, track };
}
function cardActive(cards, id, day) { const c = cards && cards[id]; return !!c && day >= (c.from || 0) && day < (c.until || 0); }
function anyCardActive(cards, day) { return cardActive(cards, "weekly", day) || cardActive(cards, "monthly", day); }
/* a purchase's grant -> wallet patch (cards extend from their current end; pass_sp unlocks this season's premium track) */
const PACK_GRANTS = ["", "card_weekly", "card_monthly", "pass_sp"];
function applyGrant(wallet, grant, lo, now) {
  const day = utcDay(now), w = wallet || {};
  if (grant === "card_weekly" || grant === "card_monthly") { const id = grant.slice(5), C0 = ((lo.cd || {}).cards || []).find((c) => c.id === id) || LIVE_CD_DEFAULT.cards.find((c) => c.id === id), cur = (w.cards || {})[id];
    const live = cur && cur.until > day, cards = Object.assign({}, w.cards || {}); cards[id] = { from: live ? cur.from : day, until: (live ? cur.until : day) + C0.days }; return { cards }; }
  if (grant === "pass_sp") { const k = evPeriodAt(lo, "sp", now, null); return k == null ? {} : { spPrem: k }; }
  return {};
}
/* v1636: Hero Shop - hero shards (and a few items) for GEMS, with a stock per player that refills every Monday (UTC). The server takes the
   gems and records the buy (buyHeroShop); the game adds the items. A gem sink for the ~5,000 gems a day an active player earns. */
const LIVE_HS_DEFAULT = {"on": true, "items": [{"id": "feat", "item": "featured_shards", "qty": 1, "price": 60, "stock": 50}, {"id": "kessa", "item": "shards_kessa", "qty": 1, "price": 100, "stock": 20}, {"id": "roran", "item": "shards_roran", "qty": 1, "price": 100, "stock": 20}, {"id": "halo7", "item": "shards_halo7", "qty": 1, "price": 100, "stock": 20}, {"id": "pip", "item": "shards_pip", "qty": 1, "price": 100, "stock": 20}, {"id": "ironlily", "item": "shards_ironlily", "qty": 1, "price": 100, "stock": 20}, {"id": "hchest", "item": "item_chest_hero", "qty": 1, "price": 500, "stock": 3}, {"id": "ulegend", "item": "item_ufrag_legendary", "qty": 1, "price": 80, "stock": 7}, {"id": "uepic", "item": "item_ufrag_epic", "qty": 1, "price": 40, "stock": 10}, {"id": "tix", "item": "weapon_tickets", "qty": 1, "price": 50, "stock": 20}]};
function normalizeHS(p) {
  if (!p) return JSON.parse(JSON.stringify(LIVE_HS_DEFAULT));
  const seen = {}, items = (Array.isArray(p.items) ? p.items : []).slice(0, 24).map((x, i) => { const item = String((x && x.item) || ""); if (!liveShopOk(item)) throw new GameError("invalid-argument", "Hero Shop row " + (i + 1) + ": can't sell " + item);
    let id = packIdFrom((x && x.id) || item); while (seen[id]) id += "_2"; seen[id] = 1; return { id, item, qty: num(x && x.qty, 1, 1e6, 1), price: num(x && x.price, 1, 1e7, 100), stock: num(x && x.stock, 1, 9999, 10) }; });
  return { on: p.on !== false, items };
}
/* rec = wallet.hs { w: week, b: { id: bought this week } } */
function decideHeroShop(rec, HS, id, n, gems, lo, now) {
  if (!HS || HS.on === false) throw new GameError("failed-precondition", "the Hero Shop is closed");
  const x = (HS.items || []).find((r) => r.id === id); if (!x) throw new GameError("not-found", "no such item");
  n = Math.trunc(+n || 1); if (!(n >= 1 && n <= 100)) throw new GameError("invalid-argument", "bad amount");
  const w = Math.floor((utcDay(now) + 3) / 7), cur = rec && rec.w === w ? { w, b: Object.assign({}, rec.b || {}) } : { w, b: {} };
  if ((cur.b[id] || 0) + n > x.stock) throw new GameError("resource-exhausted", "sold out for this week", { left: x.stock - (cur.b[id] || 0) });
  const cost = x.price * n; if ((gems || 0) < cost) throw new GameError("failed-precondition", "not_enough_gems", { gems: gems || 0, cost });
  cur.b[id] = (cur.b[id] || 0) + n; const items = evRealItems({ [x.item]: x.qty * n }, lo);
  return { hs: cur, cost, gems: (gems || 0) - cost, items, left: x.stock - cur.b[id] };
}
/* v1629: gems in the starting event rewards (Harley: lack of gems, rewards should be groups) - added on top of each default reward, so most become groups.
   An admin-saved event keeps what was saved; "Load the starting numbers" in the admin page brings these in. */
const LIVE_GEMS_PATCH = {"fhw": [50, 100, 150, 250, 400], "arena": [10, 20, 30, 50], "rankD": [200, 150, 100, 60, 40, 20], "rankW": [1000, 700, 500, 300, 200, 100], "ff": [50, 100, 200, 300, 500], "br": [50, 100, 200, 300, 500], "brRank": [1000, 700, 400, 250, 150, 50], "npChest": [100, 100, 150, 150, 200, 200, 300, 200, 200, 250, 250, 300, 300, 500], "csTask": 50, "csFin": 600, "spFree": {"5": 50, "10": 50, "15": 50, "20": 50, "25": 50, "30": 50}, "spPrem": 200, "sgP": [20, 50, 100, 150, 200, 250, 300], "sgA": [50, 100, 150, 200, 300, 500]};
function liveGemsPatch(D, P) { /* keep the same in functions/core.js, test/index.html and admin/index.html */
  function add(list, vals, key) { (list || []).forEach(function (x, i) { var v = typeof vals === "number" ? vals : (vals || [])[i], it = x && x[key || "items"]; if (v > 0 && it && !it.gems) it.gems = v; }); }
  if (D.fhw) add(D.fhw.ms, P.fhw); if (D.arena) { add(D.arena.ms, P.arena); add(D.arena.rankD, P.rankD); add(D.arena.rankW, P.rankW); }
  if (D.ff) add(D.ff.ms, P.ff); if (D.br) { add(D.br.ms, P.br); add(D.br.rank, P.brRank); }
  if (D.np) add((D.np.chests || []).slice().sort(function (a, b) { return a.day - b.day; }), P.npChest);
  if (D.cs) { add(D.cs.tasks, P.csTask); if (D.cs.fin && !D.cs.fin.gems) D.cs.fin.gems = P.csFin; }
  if (D.sp) (D.sp.levels || []).forEach(function (l, i) { var f = P.spFree[String(i + 1)]; if (f > 0 && l.free && !l.free.gems) l.free.gems = f; if (P.spPrem > 0 && l.prem && !l.prem.gems) l.prem.gems = P.spPrem; });
  if (D.sg) { add(D.sg.personal, P.sgP); add(D.sg.alliance, P.sgA); }
  return D;
}
liveGemsPatch({ arena: LIVE_ARENA_DEFAULT, ff: LIVE_FF_DEFAULT, br: LIVE_BR_DEFAULT, np: LIVE_NP_DEFAULT, cs: LIVE_CS_DEFAULT, sp: LIVE_SP_DEFAULT, sg: LIVE_SG_DEFAULT }, LIVE_GEMS_PATCH);
function sgTiers(a, what) { return (Array.isArray(a) ? a : []).slice(0, 12).map((t, i) => ({ dmg: num(t && t.dmg, 1, 1e15, 0), items: liveItems(t && t.items, "Alliance Siege " + what + " tier " + (i + 1)) })).filter((t) => t.dmg > 0).sort((x, y) => x.dmg - y.dmg); }
function normalizeSG(p) {
  if (!p) return JSON.parse(JSON.stringify(LIVE_SG_DEFAULT));
  const fl = (v, lo, hi, d) => { v = +v; return isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };
  return { on: p.on !== false, perWeek: num(p.perWeek, 1, 14, 3), mins: num(p.mins, 5, 180, 30), wait: num(p.wait, 10, 600, 60), maxRally: num(p.maxRally, 2, 100, 15),
    dpp: fl(p.dpp, 0.001, 1000, 1), bonusPer: fl(p.bonusPer, 0, 1, 0.04), bonusCap: fl(p.bonusCap, 0, 5, 0.5), personal: sgTiers(p.personal, "personal"), alliance: sgTiers(p.alliance, "alliance"),
    boss: sgBoss(p.boss), capTp: fl(p.capTp, 1, 10000, LIVE_SG_DEFAULT.capTp), capLp: fl(p.capLp, 0, 10000, LIVE_SG_DEFAULT.capLp), capFlat: fl(p.capFlat, 0, 1e12, LIVE_SG_DEFAULT.capFlat) };
}
/* v1705: the siege boss's fight settings (the Boss Rush kaiju's rules; anything left out = the Boss Rush value) */
const SG_BOSS_KEYS = { sec: [10, 300], hp1: [1, 1e12], hpGrow: [0, 100], dmgGrow: [0, 100], maxLv: [1, 1000], beam: [0, 1e12], stomp: [0, 1e12], stompHero: [0, 1e12], blastEvery: [1, 120], stompEvery: [1, 120], blastFirst: [0, 120], stompFirst: [0, 120] };
function sgBoss(b) { b = b || {}; const out = {}; Object.keys(SG_BOSS_KEYS).forEach((k) => { const v = +b[k], r = SG_BOSS_KEYS[k]; if (b[k] != null && b[k] !== "" && isFinite(v)) out[k] = Math.max(r[0], Math.min(r[1], v)); }); if (out.sec == null) out.sec = 60; return out; }
/* v1705 (Harley): rallies use troops. Kingshot march / rally sizes (game: MARCH_BASE_CAP, MARCH_CC_DEPLOY, HERO_TROOP_CAP_PTS x HERO_TROOP_CAP_MULT;
   rally = 2,000 + the Command Center's rally value + the leader's march size - dev/plans/march_capacity.md). Keep in step with the game. */
const SG_CC_DEPLOY = [400,700,1000,1400,1800,2800,3800,5000,6500,8000,10500,13000,16000,19000,22000,27000,32000,34000,36000,38000,40500,43000,46000,48500,52000,54500,57000,60500,64000,67000];
const SG_CC_RALLY = [1500,3500,5700,8000,11500,15000,19000,24000,29500,35500,43500,52000,62000,73500,87500,105000,120000,140000,165000,195000,225000,260000,305000,350000,400000,470000,550000,630000,725000,840000];
const SG_HERO_CAP_PTS = [[0,0],[17,2040],[30,4905],[45,9245],[50,10685],[60,12370],[72,13150],[79,13430],[80,13470]], SG_HERO_CAP_MULT = 0.6;
const SG_TROOP_POWER = [0, 3, 4, 6, 9, 13, 20, 28, 38, 50, 66]; /* game TROOP_POWER_BY_TIER */
function sgHeroCap(lv) { lv = Math.max(0, Math.min(80, lv | 0)); const P = SG_HERO_CAP_PTS; for (let i = 1; i < P.length; i++) if (lv <= P[i][0]) { const a = P[i - 1], b = P[i]; return Math.round(Math.round(a[1] + (b[1] - a[1]) * (lv - a[0]) / (b[0] - a[0])) * SG_HERO_CAP_MULT); } return Math.round(P[P.length - 1][1] * SG_HERO_CAP_MULT); }
function sgCcLevel(save) { return Math.max(0, Math.min(30, ((((save || {}).buildings || {}).commandcenter || {}).level) | 0)); }
/* a march's size from a save: 500 + Command Center + the heroes leading it (heroKeys null = the 5 best owned heroes - the most this player could send) */
function sgMarchCap(save, heroKeys) {
  const H = (save && save.heroes) || {}, cc = sgCcLevel(save);
  let caps = (heroKeys ? heroKeys : Object.keys(H)).filter((k) => H[k] && H[k].owned).map((k) => sgHeroCap(H[k].level || 1)).sort((a, b) => b - a).slice(0, 5);
  return 500 + (cc > 0 ? SG_CC_DEPLOY[cc - 1] : 0) + caps.reduce((s, x) => s + x, 0);
}
function sgRallyCap(save, heroKeys) { const cc = sgCcLevel(save); return 2000 + (cc > 0 ? SG_CC_RALLY[cc - 1] : 0) + sgMarchCap(save, heroKeys); }
const SG_TROOP_KEY = /^(infantry|archer|cavalry)(_t([2-9]|10))?$/;
/* clean an army from the game: troop keys only, whole numbers > 0 */
function sgArmy(a) { const out = {}; if (!a || typeof a !== "object") return out; Object.keys(a).slice(0, 40).forEach((k) => { const n = Math.floor(+a[k]); if (SG_TROOP_KEY.test(k) && n > 0 && n < 1e9) out[k] = n; }); return out; }
function sgArmyTotal(a) { return Object.keys(a || {}).reduce((s, k) => s + (a[k] || 0), 0); }
function sgTroopPower(a) { return Object.keys(a || {}).reduce((s, k) => { const m = /_t(\d+)$/.exec(k), t = m ? +m[1] : 1; return s + (a[k] || 0) * (SG_TROOP_POWER[t] || 3); }, 0); }
/* the most damage a rally may report: troop power x capTp + leader power x capLp + capFlat (generous - the fight itself runs in the game) */
function sgDmgCap(SG, troopPower, leaderPower) { return Math.round(troopPower * SG.capTp + Math.max(0, +leaderPower || 0) * SG.capLp + SG.capFlat); }
/* highest tier reached (or null) */
function sgTier(tiers, dmg) { let out = null; (tiers || []).forEach((t) => { if (dmg >= t.dmg) out = t; }); return out; }
/* one member's share of a rally hit */
function sgShare(SG, power, nMembers, roll) { const bonus = 1 + Math.min(SG.bonusCap, SG.bonusPer * Math.max(0, nMembers - 1)); return Math.max(1, Math.round(Math.max(0, +power || 0) * SG.dpp * (0.9 + 0.2 * roll) * bonus)); }
function normalizeLiveops(c) {
  c = c || {}; const f = c.fhw || {}, sh = c.shop || {}, wk = c.wk || {}, pts = {}, P = f.pts || {};
  ["kill", "arena", "camp", "monster", "ticket"].forEach((k) => { pts[k] = num(P[k], 0, 100000, 0); });
  const ms = (Array.isArray(f.ms) ? f.ms : []).slice(0, 12).map((m, i) => ({ at: num(m && m.at, 1, 1e9, 0) || (() => { throw new GameError("invalid-argument", "milestone " + (i + 1) + " needs points"); })(), items: liveItems(m && m.items, "milestone " + (i + 1)) })).sort((a, b) => a.at - b.at);
  const seen = {}, check = (Array.isArray(f.check) ? f.check : []).slice(0, 12).map((t, i) => {
    const kind = String((t && t.kind) || ""); if (LIVEOPS_KINDS.indexOf(kind) < 0) throw new GameError("invalid-argument", "checklist task " + (i + 1) + ": bad kind");
    let id = packIdFrom((t && t.id) || kind + "_" + i); while (seen[id]) id += "_2"; seen[id] = 1;
    return { id, kind, name: String((t && t.name) || "").trim().slice(0, 60) || kind, need: num(t && t.need, 1, 1e6, 1), pts: num(t && t.pts, 0, 1e6, 0) }; });
  const sseen = {}, items = (Array.isArray(sh.items) ? sh.items : []).slice(0, 24).map((x, i) => {
    const item = String((x && x.item) || ""); if (!liveShopOk(item)) throw new GameError("invalid-argument", "shop row " + (i + 1) + ": can't sell " + item);
    let id = packIdFrom((x && x.id) || item); while (sseen[id]) id += "_2"; sseen[id] = 1;
    return { id, item, qty: num(x && x.qty, 1, 1e6, 1), price: num(x && x.price, 1, 1e7, 100), limit: num(x && x.limit, 1, 9999, 1) }; });
  const heroes = (Array.isArray(wk.heroes) ? wk.heroes : []).slice(0, 6).map(heroKey);
  const tok = (Array.isArray(c.dailyTok) ? c.dailyTok : []).slice(0, 5).map((v) => num(v, 0, 1e5, 0)); while (tok.length < 5) tok.push(0);
  return { hs: normalizeHS(c.hs), cd: normalizeCD(c.cd), fs: normalizeFS(c.fs), hc: normalizeHC(c.hc), cb: normalizeCB(c.cb), ga: normalizeGA(c.ga), items: normalizeItemModes(c.items), sg: normalizeSG(c.sg), sp: normalizeSP(c.sp), cs: normalizeCS(c.cs), np: normalizeNP(c.np), br: normalizeBR(c.br), ff: normalizeFF(c.ff), arena: normalizeArena(c.arena), fhw: { hero: heroKey(f.hero || "caelum"), killsPer: num(f.killsPer, 1, 1e6, 100), pts, ms, check }, shop: { items }, wk: { heroes, shards: num(wk.shards, 0, 1e5, 10), days: num(wk.days, 1, 7, 7), act: num(wk.act, 1, 100, 60) }, dailyTok: tok };
}
/* v1628: activity gems - gems for everyday play, paid by the server with a cap per day for each activity (Harley: an active player ~5,000 gems a
   day from all sources). The game reports each activity (claimGemAct; the server trusts the report like Daily Tasks, the daily caps limit it);
   Alliance Siege rallies are paid inside siegeRally / siegeJoin (server-checked). ga = { <act>: { g: gems each, n: times a day } }. */
const GEM_ACTS = ["monster", "camp", "arena", "rally", "login"];
const LIVE_GA_DEFAULT = { on: true, monster: { g: 20, n: 20 }, camp: { g: 10, n: 20 }, arena: { g: 30, n: 10 }, rally: { g: 50, n: 10 }, login: { g: 300, n: 1 } };
function normalizeGA(p) {
  p = p || {}; const out = { on: p.on !== false };
  GEM_ACTS.forEach((a) => { const x = p[a] || {}, d = LIVE_GA_DEFAULT[a]; out[a] = { g: num(x.g, 0, 100000, d.g), n: num(x.n, 0, 1000, d.n) }; });
  return out;
}
/* rec = wallet.ga { d: utc day, c: { act: times paid today } }. Over the cap or switched off = nothing paid (not an error). */
function decideGemAct(rec, act, GA, now) {
  if (GEM_ACTS.indexOf(act) < 0) throw new GameError("invalid-argument", "bad activity");
  const d = utcDay(now), cur = rec && rec.d === d ? { d, c: Object.assign({}, rec.c || {}) } : { d, c: {} }, A = (GA || LIVE_GA_DEFAULT)[act] || { g: 0, n: 0 };
  if ((GA && GA.on === false) || !(A.g > 0) || (cur.c[act] || 0) >= A.n) return { gems: 0, ga: cur, left: Math.max(0, A.n - (cur.c[act] || 0)) };
  cur.c[act] = (cur.c[act] || 0) + 1; return { gems: A.g, ga: cur, left: A.n - cur.c[act] };
}
/* v1625: who pays each event-reward item. Default: the server records + checks every event claim (claimEv). Gems are always the server's.
   items = { off: true = master switch, everything back to the phone (gems still server), phone: [ids paid by the phone only], gemDay: gems a
   player can get from event claims per UTC day } */
const ITEM_MODE_DEFAULT = { off: false, phone: [], gemDay: 5000 };
function normalizeItemModes(m) {
  m = m || {}; const phone = [];
  (Array.isArray(m.phone) ? m.phone : []).forEach((id) => { id = String(id); if (id !== "gems" && liveShopOk(id) && phone.indexOf(id) < 0) phone.push(id); });
  return { off: m.off === true, phone: phone.slice(0, 200), gemDay: num(m.gemDay, 0, 1e7, ITEM_MODE_DEFAULT.gemDay) };
}
function itemServerPaid(modes, id) { if (id === "gems") return true; const M = modes || ITEM_MODE_DEFAULT; return !M.off && (M.phone || []).indexOf(id) < 0; }
/* The event reward a claim is for, worked out from the live config on the server (the phone only says which reward; it never sends items or
   amounts). src + ref:
     fhw  "ms:<i>"   Featured Hero Week milestone   (period = week)      arena "ms:<i>"  Arena daily milestone (period = day)
     ff   "ms:<i>"   Forge Frenzy milestone          (period = week)      br    "ms:<i>"  Boss Rush milestone   (period = week)
     wk   "<hero>"   Weekly Chest (picked hero)      (period = week)
     np   "t:<id>" | "d:<day>"  New Player Path task / day chest (period = 0, once per account; day must be open)
     cs   "t:<id>" | "fin"      Conquest Sprint task / final chest (period = week)
     sp   "<lv>:free" | "<lv>:prem"  Season Pass level (period = season)
   The period must be the current one or one that was running in the last 2 days (a claim made offline just before a reset still pays).
   ctx = { now, createdAt (account), prem(season) -> bool }. Returns { k, items } with featured/np/sp shards turned into real hero shards. */
const EV_SRCS = ["fhw", "arena", "ff", "br", "wk", "np", "cs", "sp", "cb", "hc", "fs", "cdd", "cdp"];
function evPeriodAt(lo, src, t, createdAt) {
  const d = utcDay(t), w = Math.floor((d + 3) / 7), dow = (d + 4) % 7;
  if (src === "fhw" || src === "wk") return w;
  if (src === "arena") return d;
  if (src === "ff") { const F = lo.ff || {}; if (F.on === false || (dow !== 5 && dow !== 6 && dow !== 0)) return null; return (w % 2) === (F.parity || 0) ? w : null; }
  if (src === "br") { const B = lo.br || {}; return B.on !== false && (B.days || []).indexOf(dow) >= 0 ? w : null; }
  if (src === "cs") { const P = lo.cs || {}; return P.on !== false && (w % 2) === (P.parity || 0) ? w : null; }
  if (src === "sp") { const P = lo.sp || {}; if (P.on === false || !(P.days > 0) || d < (P.start || 0)) return null; return Math.floor((d - (P.start || 0)) / P.days); }
  if (src === "hc") return (lo.hc || {}).on === false ? null : 0;
  if (src === "fs") { const f = fsAt(lo.fs, d); return f ? f.start : null; }
  if (src === "cdd") return (lo.cd || {}).on === false ? null : d;
  if (src === "cdp") return (lo.cd || {}).on === false ? null : w;
  if (src === "cb") { const P = lo.cb || {}, st = createdAt; if (!st && st !== 0) return null; return d - st >= 0 && d - st < (P.days || 7) ? st : null; } /* createdAt = the comeback start day here */
  if (src === "np") { const P = lo.np || {}; if (P.on === false || !createdAt) return null; const day = d - utcDay(createdAt) + 1; return day >= 1 && day <= (P.days || 14) ? 0 : null; }
  return null;
}
function evRealItems(items, lo) {
  const out = {}; Object.keys(items || {}).forEach((id) => {
    let k = id; if (id === "cb_shards") k = "shards_" + ((lo.cb || {}).hero || "kessa"); else if (id === "featured_shards") k = "shards_" + lo.fhw.hero; else if (id === "np_shards") k = "shards_" + ((lo.np || {}).hero || "roran"); else if (id === "sp_shards") k = "shards_" + ((lo.sp || {}).hero || "halo7");
    const q = Math.trunc(+items[id] || 0); if (q > 0) out[k] = (out[k] || 0) + q; });
  return out;
}
function evClaimPlan(lo, src, k, ref, ctx) {
  if (EV_SRCS.indexOf(src) < 0) throw new GameError("invalid-argument", "bad source");
  ref = String(ref || ""); k = Math.trunc(+k); const now = ctx.now, ok = [];
  [0, 1, 2].forEach((back) => { const p = evPeriodAt(lo, src, now - back * 86400000, ctx.createdAt); if (p != null && ok.indexOf(p) < 0) ok.push(p); });
  if (ok.indexOf(k) < 0) throw new GameError("failed-precondition", "event not running");
  const idx = (re) => { const m = re.exec(ref); return m ? m[1] : null; };
  let items = null, canon = null; /* canon = the once-only key when it differs from ref (a card pick: one choice per milestone) */
  if (src === "fhw" || src === "arena" || src === "ff" || src === "br") { const i = idx(/^ms:(\d{1,3})$/), list = (src === "fhw" ? lo.fhw : lo[src] || {}).ms || []; if (i != null && list[+i]) items = list[+i].items; }
  else if (src === "wk") { if ((lo.wk.heroes || []).indexOf(ref) >= 0 && lo.wk.shards > 0) { items = {}; items["shards_" + ref] = lo.wk.shards; } }
  else if (src === "np") {
    const P = lo.np || {}, day = utcDay(now) - utcDay(ctx.createdAt) + 1, t = idx(/^t:([A-Za-z0-9_-]{1,40})$/), c = idx(/^d:(\d{1,2})$/);
    if (t != null) { const x = (P.tasks || []).find((y) => y.id === t); if (x && x.day <= day) items = x.items; }
    else if (c != null) { const x = (P.chests || []).find((y) => y.day === +c); if (x && x.day <= day) items = x.items; }
  }
  else if (src === "cdd") { const c = ((lo.cd || {}).cards || []).find((x) => x.id === ref); if (c) { if (!cardActive(ctx.cards, ref, k)) throw new GameError("failed-precondition", "card not active"); items = c.daily; } }
  else if (src === "cdp") { const m = /^(\d{1,2}):(\d)$/.exec(ref), t = m && ((lo.cd || {}).track || [])[+m[1]];
    if (t && t.opts[+m[2]]) { if (!anyCardActive(ctx.cards, k * 7 - 3 + 6) && !anyCardActive(ctx.cards, utcDay(now))) throw new GameError("failed-precondition", "card not active"); items = t.opts[+m[2]]; canon = m[1]; } }
  else if (src === "fs") { const f = ((lo.fs || {}).list || []).find((x) => x.start === k), i = idx(/^ms:(\d{1,2})$/); if (f && i != null && f.ms[+i]) items = f.ms[+i].items; }
  else if (src === "hc") { const P = lo.hc || {}, m = /^h:([a-z0-9_]{1,24}):(\d)$/.exec(ref), c = idx(/^c:(\d{1,2})$/);
    if (m) { const st = (P.steps || [])[+m[2]]; if (st && HC_HEROES().indexOf(m[1]) >= 0) { if (hcStars(ctx.save, m[1]) < st.stars) throw new GameError("aborted", "not in your saved game yet"); items = st.items; } }
    else if (c != null) { const x = (P.counts || [])[+c]; if (x) { if (hcOwned(ctx.save).length < x.n) throw new GameError("aborted", "not in your saved game yet"); items = x.items; } } }
  else if (src === "cb") { const c = idx(/^d:(\d{1,2})$/), x = c != null && ((lo.cb || {}).rewards || []).find((y) => y.day === +c); if (x && x.day <= utcDay(now) - k + 1) items = x.items; }
  else if (src === "cs") { const P = lo.cs || {}, t = idx(/^t:([A-Za-z0-9_-]{1,40})$/); if (ref === "fin") items = P.fin; else if (t != null) { const x = (P.tasks || []).find((y) => y.id === t); if (x) items = x.items; } }
  else if (src === "sp") { const m = /^(\d{1,2}):(free|prem)$/.exec(ref), L = m && ((lo.sp || {}).levels || [])[+m[1] - 1]; if (L) { if (m[2] === "prem" && !(ctx.prem && ctx.prem(k))) throw new GameError("permission-denied", "premium pass needed"); items = m[2] === "prem" ? L.prem : L.free; } }
  if (!items) throw new GameError("not-found", "no such reward");
  return canon != null ? { k, items: evRealItems(items, lo), ref: canon } : { k, items: evRealItems(items, lo) };
}
/* Pay a planned claim. rec = this period's claim record { r: [refs] }, gd = gems from event claims today { d, n }. Gems over the daily cap are
   dropped (the rest still pays). Returns what the server pays: gems (wallet) + the server-paid save items (recorded in the ledger; the game
   adds them to the save). dup = already paid. */
function decideEvClaim(rec, plan, ref, modes, gd, now) {
  const r = (rec && Array.isArray(rec.r)) ? rec.r.slice() : [];
  if (r.indexOf(ref) >= 0) return { dup: true };
  r.push(ref); const d = utcDay(now), M = modes || ITEM_MODE_DEFAULT, g0 = gd && gd.d === d ? (gd.n || 0) : 0;
  const want = Math.trunc(plan.items.gems || 0), gems = Math.max(0, Math.min(want, M.gemDay - g0)), save = {};
  Object.keys(plan.items).forEach((id) => { if (id !== "gems" && itemServerPaid(M, id)) save[id] = plan.items[id]; });
  return { dup: false, rec: { r }, gems, capped: want - gems, gd: { d, n: g0 + gems }, save };
}
/* when this event runs for this player (createdAt = when their account was made); null = never */
function eventWindow(ev, createdAt) {
  if (!ev || ev.active === false) return null;
  if (ev.schedule.type === "newplayer") { const c = +createdAt || 0; return c ? { start: c, end: ev.schedule.days ? c + ev.schedule.days * 86400000 : 8.64e15 } : null; }
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
/* v947: daily sign-in. One day can be claimed per calendar day (UTC, like the daily reset), in order. Missing days just pauses it. */
function utcDay(t) { return Math.floor(t / 86400000); }
function signinProgress(rec, win, now) { /* days unlocked = days claimed + 1 if today's claim is still free */
  const c = (rec && win && rec.k === win.start) ? (rec.c || []) : [], last = rec && win && rec.k === win.start ? rec.d : null;
  return c.length + ((last == null || utcDay(now) > last) ? 1 : 0);
}
function decideEventClaim(claimed, ev, idx, progress, win, now) {
  if (ev && ev.goal === "signin") {
    if (!win || now < win.start || now >= win.end) throw new GameError("failed-precondition", "this event isn't running for you");
    if (!ev.milestones[idx]) throw new GameError("not-found", "no such milestone");
    const c = (claimed && claimed.k === win.start) ? (claimed.c || []) : [];
    if (c.indexOf(idx) >= 0) return { dup: true };
    if (idx !== c.length) throw new GameError("failed-precondition", "claim the days in order", { next: c.length });
    if (signinProgress(claimed, win, now) <= c.length) throw new GameError("failed-precondition", "not reached yet - come back tomorrow", { next: (utcDay(now) + 1) * 86400000 });
    return { dup: false, claimed: { k: win.start, c: c.concat([idx]), d: utcDay(now) }, items: ev.milestones[idx].items };
  }
  if (!ev) throw new GameError("not-found", "no such event");
  if (!win || now < win.start || now >= win.end) throw new GameError("failed-precondition", "this event isn't running for you");
  const m = ev.milestones[idx]; if (!m) throw new GameError("not-found", "no such milestone");
  const c = (claimed && claimed.k === win.start) ? (claimed.c || []) : [];
  if (c.indexOf(idx) >= 0) return { dup: true };
  if (progress < m.target) throw new GameError("failed-precondition", "not reached yet", { have: progress, need: m.target });
  return { dup: false, claimed: { k: win.start, c: c.concat([idx]) }, items: m.items };
}
/* admin save import (moving Harley's claude.ai owner save into Firebase): the old save, with the parts that belong to the CURRENT world kept
   from the account's current save (its kingdom, map position, world version, marches), mail claims merged, gems from the wallet. */
// v977: shared card catalog (assetitems/cardcatalog). Fill only EMPTY slots from `incoming` (e.g. the card text of an old save), never
// overwrite a slot that already has text, and make sure a card named Drop Signal exists (in the LAST free slot). 30 slots.
const CARD_SLOTS = 30;
const CARD_DROP_SIGNAL = { name: "Drop Signal", type: "Summon", effect: "Each time your Railgun fires, your fallen summons are redeployed and any switched-off drones come back online.", narrative: "" };
function cardText(c) {
  c = c && typeof c === "object" ? c : {};
  const s = (v, max) => (typeof v === "string" ? v : "").slice(0, max);
  return { name: s(c.name, 40), type: s(c.type, 40), effect: s(c.effect, 300), narrative: s(c.narrative, 2000) };
}
function cardBlank(c) { return !(c.name || c.type || c.effect || c.narrative); }
function mergeCardCatalog(existing, incoming) {
  const out = [], inc = Array.isArray(incoming) ? incoming : [], cur = Array.isArray(existing) ? existing : [];
  let filled = 0;
  for (let i = 0; i < CARD_SLOTS; i++) {
    const have = cardText(cur[i]), add = cardText(inc[i]);
    if (cardBlank(have) && !cardBlank(add)) { out.push(add); filled++; } else out.push(have);
  }
  let drop = false;
  if (!out.some((c) => c.name.trim().toLowerCase() === "drop signal")) { for (let i = CARD_SLOTS - 1; i >= 0; i--) if (cardBlank(out[i])) { out[i] = cardText(CARD_DROP_SIGNAL); drop = true; break; } }
  return { cards: out, filled, drop };
}
const IMPORT_KEEP = ["serverId", "homeTileId", "worldVersion", "marches", "nextMarchId"];
function prepareImportSave(oldSave, current, gems) {
  if (!oldSave || typeof oldSave !== "object" || Array.isArray(oldSave)) throw new GameError("invalid-argument", "no save in the file");
  if (!oldSave.buildings || !oldSave.heroes || !oldSave.idle) throw new GameError("invalid-argument", "that file doesn't look like a game save");
  const out = JSON.parse(JSON.stringify(oldSave)); current = current || {};
  IMPORT_KEEP.forEach((k) => { if (current[k] !== undefined) out[k] = JSON.parse(JSON.stringify(current[k])); else if (k === "marches") out.marches = []; else delete out[k]; });
  out.mailApplied = Object.assign({}, oldSave.mailApplied || {}, current.mailApplied || {});
  if (gems != null) out.gems = gems;
  const size = JSON.stringify(out).length; if (size > 900000) throw new GameError("invalid-argument", "save too big (" + size + ")");
  return out;
}
function shopEntryLive(e, now) { return (!e.start || now >= e.start) && (!e.end || now < e.end); }
function packIdFrom(name) { return String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "pack"; }

// ---- mail: admin gifts. Any catalogue item; the player claims it once; each item claimed gets a ledger entry. ----
const SAVE_PATH_OK = /^(resources|troops|heroes\.[a-z0-9_]+|idle|speedups|skins|items|weaponFrags|ev)?\.?[a-zA-Z0-9_]+$/; /* v946: + speedups, skins; v1593: + items (backpack items), weaponFrags */
const WK_HEROES_DEFAULT = ["roran", "kessa", "halo7", "caelum"]; /* the game's default Weekly Chest heroes (used when none are saved) */
const PICK_SHARDS_LABEL = "🦸 Hero of your choice shards";
/* the hero picked for a "pick_shards" reward must be one of the Weekly Chest heroes */
function resolvePickShards(items, pick, heroes) {
  if (!items || !items.pick_shards) return items; const h = String(pick || "");
  if (!h) throw new GameError("failed-precondition", "pick a hero"); if ((heroes || []).indexOf(h) < 0 || !ITEMS["shards_" + h]) throw new GameError("invalid-argument", "that hero can't be picked");
  const out = Object.assign({}, items); out["shards_" + h] = (out["shards_" + h] || 0) + out.pick_shards; delete out.pick_shards; return out;
}
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
const AC_DEFAULT = {
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
function checkSave(before, after, dtSec, allow, limits) {
  const AC = mergeLimits(limits); /* v995: admin-tuned limits (Security panel) on top of the defaults */
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

// ---- v995: Security panel. Limits the admin can tune (merged over AC_DEFAULT), the security config, flag summaries. Pure: no I/O. ----
const AC = AC_DEFAULT; /* the defaults, exported under the old name */
const LIMIT_KEYS = { build: ["base", "perSec"], tech: ["base", "perSec"], weapon: ["base", "perSec"], heroLvl: ["base", "perSec"], frag: ["base", "perSec"],
  troops: ["base", "mult", "perSec"], res: ["base", "mult", "perSec"], cur: ["base", "mult", "perSec"] };
const LIMIT_LABELS = { build: "Building levels", tech: "Research levels", weapon: "Weapon levels", heroLvl: "Hero levels (each hero)", frag: "Hero fragments (each hero)",
  troops: "Troops (all)", res: "Food / wood / stone / gold (each)", cur: "Energon, Research Points, draw tickets, Valor, Conquest Books (each)" };
function mergeLimits(over) {
  const L = JSON.parse(JSON.stringify(AC_DEFAULT));
  if (!over || typeof over !== "object") return L;
  if (Number.isFinite(+over.slackSec) && +over.slackSec >= 0) L.slackSec = Math.min(3600, +over.slackSec);
  Object.keys(LIMIT_KEYS).forEach((k) => { const o = over[k]; if (!o || typeof o !== "object") return;
    LIMIT_KEYS[k].forEach((f) => { const v = +o[f]; if (Number.isFinite(v) && v >= 0) L[k][f] = Math.min(1e12, v); }); });
  return L;
}
/* the config doc <root>secconfig/main: { autoRevert, limits (only the changed fields), updatedAt, updatedBy } */
function normalizeSecConfig(d) {
  d = d || {}; const limits = {};
  if (Number.isFinite(+(d.limits || {}).slackSec) && +d.limits.slackSec >= 0 && +d.limits.slackSec !== AC_DEFAULT.slackSec) limits.slackSec = Math.min(3600, +d.limits.slackSec);
  Object.keys(LIMIT_KEYS).forEach((k) => { const o = (d.limits || {})[k]; if (!o || typeof o !== "object") return;
    LIMIT_KEYS[k].forEach((f) => { const v = +o[f]; if (Number.isFinite(v) && v >= 0 && v !== AC_DEFAULT[k][f]) { limits[k] = limits[k] || {}; limits[k][f] = Math.min(1e12, v); } }); });
  return { autoRevert: d.autoRevert === true, limits };
}
/* what kind of thing a flag reason is about: "wood", "gareth level", "Conquest", "building levels"... */
function reasonKey(r) {
  r = String(r || ""); let m;
  if ((m = /^new save/.exec(r))) return "new save";
  if ((m = /^Conquest /.exec(r))) return "Conquest";
  if ((m = /^resources\.(\w+) is not a valid/.exec(r))) return m[1] + " (broken value)";
  if ((m = /^([^+]+?) \+/.exec(r))) return m[1].replace(/^idle\./, "").replace(/^(\w+) (level|fragments)$/, "hero $2");
  return r.slice(0, 40);
}
const SEC_ACTIONS = ["dismiss", "watch", "unwatch", "trust", "untrust", "rollback", "suspend", "unsuspend", "ban", "unban", "restrict", "unrestrict"];
const SUSPEND_MAX_HOURS = 24 * 90;
/* ban record a player sees: kind "suspend" | "ban" | "restore" (a short write lock while an admin rollback lands) */
function banActive(b, now) { return !!(b && (b.kind === "ban" || ((b.kind === "suspend" || b.kind === "restore") && +b.untilMs > now))); }
/* overview numbers for the Security panel from the acplayers rows (+ bans) */
function secSummary(rows, bans, now) {
  const day = 86400000, out = { flags24h: 0, flags7d: 0, players24h: 0, open: 0, watching: 0, trusted: 0, restricted: 0, reverted: 0, suspended: 0, banned: 0, topReasons: [], repeat: [] };
  const rc = {};
  (rows || []).forEach((p) => {
    let had24 = false;
    (p.recent || []).forEach((e) => { if (now - e.at <= day) { out.flags24h++; had24 = true; } if (now - e.at <= 7 * day) { out.flags7d++; (e.reasons || []).forEach((r) => { const k = reasonKey(r); rc[k] = (rc[k] || 0) + 1; }); } });
    if (had24) out.players24h++;
    const st = p.status || "open"; if (st === "open") out.open++; if (st === "watch") out.watching++;
    if (p.trusted) out.trusted++; if (p.restricted) out.restricted++; out.reverted += p.reverted || 0;
    if ((p.count || 0) >= 3 && st !== "dismissed") out.repeat.push({ uid: p.uid, name: p.name || "", count: p.count, lastAt: p.lastAt });
  });
  (bans || []).forEach((b) => { if (!banActive(b, now)) return; if (b.kind === "ban") out.banned++; else if (b.kind === "suspend") out.suspended++; });
  out.topReasons = Object.keys(rc).map((k) => ({ what: k, n: rc[k] })).sort((a, b) => b.n - a.n).slice(0, 8);
  out.repeat.sort((a, b) => b.count - a.count); out.repeat = out.repeat.slice(0, 10);
  return out;
}

/* v1081: bases by map patch (world map plan, phase 2). A kingdom's map is cut into 50x50-tile patches; patches/<px>_<py> = { b: { "<x>_<y>": entry }, t }.
   An entry is what other players need to draw a base: owner, skin, bot name, HP / fire. */
const PATCH_TILES = 50;
function patchIdOfCity(cid) { const m = /^(\d+)_(\d+)$/.exec(String(cid)); return m ? Math.floor(+m[1] / PATCH_TILES) + "_" + Math.floor(+m[2] / PATCH_TILES) : null; }
function patchEntry(city) {
  if (!city || !city.owner) return null;
  const e = { o: String(city.owner) };
  [["sk", "sk"], ["bn", "bn"], ["hp", "hp"], ["hpT", "hpT"], ["burnLeft", "burnLeft"], ["raidedAt", "raidedAt"]].forEach(([k, j]) => { if (city[k] !== undefined && city[k] !== null) e[j] = city[k]; });
  return e;
}
function buildPatches(cities) { /* cities: [{id, data}] -> { pid: { cid: entry } } */
  const P = {}; cities.forEach((c) => { const pid = patchIdOfCity(c.id), e = patchEntry(c.data); if (!pid || !e) return; (P[pid] = P[pid] || {})[c.id] = e; }); return P;
}
/* v1231: Daily Tasks. The game pays everything except gems; gems come from here: 20 per task (each task once per UTC day) and 300 for the
   last chest (once per day, only after the server has paid tasks worth 100 activity points). wallet.daily = { d: utc day, t: [task ids], c: true } */
const DAILY_TASK_PTS = { login: 5, chest: 5, arena: 10, monster: 10, gather: 10, recon: 5, train: 10, build: 10, research: 10, tickets: 5, levelup: 10, speedup: 10 };
const DAILY_TASK_GEMS = 40, DAILY_CHEST_GEMS = 500, DAILY_CHEST_PTS = 100; /* v1628: 20 / 300 -> 40 / 500 (toward ~5,000 gems a day) */
function decideDailyClaim(rec, kind, id, now) {
  const d = utcDay(now), cur = rec && rec.d === d ? { d, t: (rec.t || []).slice(), c: !!rec.c } : { d, t: [], c: false };
  if (kind === "task") {
    if (!Object.prototype.hasOwnProperty.call(DAILY_TASK_PTS, id)) throw new GameError("not-found", "no such task");
    if (cur.t.indexOf(id) >= 0) return { dup: true, daily: cur };
    cur.t.push(id); return { dup: false, daily: cur, gems: DAILY_TASK_GEMS };
  }
  if (kind === "chest") {
    if (cur.c) return { dup: true, daily: cur };
    const pts = cur.t.reduce((a, k) => a + (DAILY_TASK_PTS[k] || 0), 0);
    if (pts < DAILY_CHEST_PTS) throw new GameError("failed-precondition", "not reached yet", { have: pts, need: DAILY_CHEST_PTS });
    cur.c = true; return { dup: false, daily: cur, gems: DAILY_CHEST_GEMS };
  }
  throw new GameError("invalid-argument", "bad kind");
}

module.exports = { sgBoss, sgMarchCap, sgRallyCap, sgArmy, sgArmyTotal, sgTroopPower, sgDmgCap, sgHeroCap, LIVE_HS_DEFAULT, normalizeHS, decideHeroShop, LIVE_CD_DEFAULT, normalizeCD, cardActive, anyCardActive, PACK_GRANTS, applyGrant, LIVE_FS_DEFAULT, normalizeFS, fsAt, LIVE_HC_DEFAULT, normalizeHC, hcOwned, hcStars, LIVE_CB_DEFAULT, normalizeCB, comebackCheck, WK_HEROES_DEFAULT, PICK_SHARDS_LABEL, resolvePickShards, LIVE_GEMS_PATCH, liveGemsPatch, GEM_ACTS, LIVE_GA_DEFAULT, normalizeGA, decideGemAct, ITEM_MODE_DEFAULT, normalizeItemModes, itemServerPaid, EV_SRCS, evPeriodAt, evClaimPlan, decideEvClaim, sgTier, sgShare, LIVE_SG_DEFAULT, resolveFeatured, bossRunOver, bossRunOpen, LIVE_BR_DEFAULT, LIVE_FF_DEFAULT, normalizeLiveops, LIVEOPS_KINDS, LIVE_ARENA_DEFAULT, arenaKeys, arenaRankReward, DAILY_TASK_PTS, DAILY_TASK_GEMS, DAILY_CHEST_GEMS, decideDailyClaim, PATCH_TILES, patchIdOfCity, patchEntry, buildPatches, AC_DEFAULT, LIMIT_KEYS, LIMIT_LABELS, mergeLimits, normalizeSecConfig, reasonKey, SEC_ACTIONS, SUSPEND_MAX_HOURS, banActive, secSummary, CARD_SLOTS, mergeCardCatalog, AC, checkSave, mailAllowance, BASE, LEVEL_CLEAR_GEMS, LEVELS_PER_CHAPTER, HIT_COOLDOWN_MS, hordeQuota, hordeCount, levelFloorSec, globalLevel, baseHpAt, GameError,
  decideLevelClaim, needGems, ITEMS, LEDGER_ITEMS, ledgerEntry, purchaseId, decidePurchase, normalizePack, normalizeShop, shopEntryLive, EVENT_GOALS, normalizeEvents, eventWindow, eventProgress, decideEventClaim, signinProgress, prepareImportSave, IMPORT_KEEP, utcDay, TOPUP_PERIODS, topupKey, topupEnd, addTopup, decideTopupClaim, limitPeriodStart, limitPeriodEnd, packBuysLeft, PACK_RESETS, SHOP_CURRENCIES, DEFAULT_TIERS, packIdFrom, normalizeItems, makeMail, MAIL_CATEGORIES, decideMailClaim, decideExtinguish, decideRepair, decideHit, checkHitCooldown, envRoot, cityDocId };
