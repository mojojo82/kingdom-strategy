// Unit tests for functions/core.js. Run: node functions/test/core.test.js   (no dependencies)
"use strict";
const assert = require("assert");
const fs = require("fs"), path = require("path");
const C = require("../core");
let n = 0; function t(name, fn) { fn(); n++; console.log("ok -", name); }

// The server's copy of the base-HP maths must match the game's exactly.
t("baseHpAt matches the game", () => {
  const html = fs.readFileSync(path.join(__dirname, "../../test/index.html"), "utf8");
  const consts = html.match(/var BASE_HP_MAX = [^;]+;/)[0];
  const fn = html.match(/function baseHpAt\(rec, t\) \{[\s\S]*?\n\}/)[0];
  const gameHp = new Function(consts + fn + "; return baseHpAt;")();
  const now = 1.8e12;
  for (let i = 0; i < 2000; i++) {
    const rec = Math.random() < 0.1 ? null : { hp: Math.random() * 10000, hpT: now - Math.random() * 4e7, burnLeft: Math.random() < 0.5 ? 0 : Math.random() * 3000 };
    const a = gameHp(rec, now), b = C.baseHpAt(rec, now);
    assert.ok(Math.abs(a.hp - b.hp) < 1e-9 && a.burning === b.burning && Math.abs(a.burnLeft - b.burnLeft) < 1e-9, JSON.stringify({ rec, a, b }));
  }
  ["BASE_HP_MAX = 10000", "BASE_HIT_HP = 1000", "BASE_BURN_MAX = 3000", "BASE_EXTINGUISH_GEMS = 100", "BASE_REPAIR_GEMS = 225", "BASE_REPAIR_HP = 2000"].forEach((s) => assert.ok(html.includes(s), "game constant changed: " + s));
  assert.ok(html.includes("var LEVEL_CLEAR_GEMS = 50") && html.includes("IDLE_LEVELS_PER_CHAPTER = 20"), "level constants changed");
  assert.ok(html.includes("function idleHordeSize() { return Math.min(10, 5 + Math.floor((idleCurveLvl() - 1) / 25)); }") && html.includes("var CURVE_ANCHOR = 100,"), "horde size formula changed");
  assert.ok(html.includes("function idleHordeCount() { return Math.min(8, 4 + Math.floor((idleCurveLvl() - 1) / 30)); }"), "horde count formula changed");
});

t("level floor matches measurements", () => {
  assert.ok(Math.abs(C.levelFloorSec(1) - 4.25) < 0.1);
  assert.ok(Math.abs(C.levelFloorSec(41) - 6.0) < 0.1);
  assert.ok(Math.abs(C.levelFloorSec(100) - 10.2) < 0.1); assert.ok(Math.abs(C.levelFloorSec(181) - 10.2) < 0.1, "v1092: hordes frozen after 5-20");
  assert.strictEqual(C.globalLevel(1, 1), 1); assert.strictEqual(C.globalLevel(10, 1), 181);
});

t("level claims: order, once each, speed", () => {
  let w = null, now = 1e12;
  let r = C.decideLevelClaim(w, 1, now); assert.strictEqual(r.gems, 50); w = r.wallet;
  assert.ok(C.decideLevelClaim(w, 1, now + 1).dup, "same level twice is a no-op");
  assert.throws(() => C.decideLevelClaim(w, 3, now + 60000), /out_of_order/);
  assert.throws(() => C.decideLevelClaim(w, 2, now + 1000), /too_fast/);
  r = C.decideLevelClaim(w, 2, now + 4000); assert.strictEqual(r.gems, 100); w = r.wallet;
  // a cheater claiming nonstop can't beat the floor: simulate 24h of claims as fast as allowed
  let t0 = now + 4000, g = 2, gems = w.gems;
  while (t0 < now + 86400000) { try { const x = C.decideLevelClaim(w, g + 1, t0); w = x.wallet; g++; gems = x.gems; } catch (e) { t0 += e.extra.retryAfterMs || 1000; } }
  console.log("   max gems a cheater could farm in 24h:", gems, "(levels:", g + ")");
  assert.ok(gems < 1e6);
});

t("gem spends", () => {
  const now = 1e12, burning = { hp: 9000, hpT: now - 1000, burnLeft: 3000 };
  const e = C.decideExtinguish(burning, now); assert.strictEqual(e.cost, 100); assert.strictEqual(e.cityPatch.burnLeft, 0);
  assert.strictEqual(C.decideExtinguish(burning, now, { free: true }).cost, 0);
  assert.throws(() => C.decideExtinguish({ hp: 9000, hpT: now, burnLeft: 0 }, now), /not_burning/);
  assert.throws(() => C.needGems({ gems: 99 }, 100), /not_enough_gems/);
  assert.strictEqual(C.needGems({ gems: 300 }, 225), 75);
  const rp = C.decideRepair({ hp: 5000, hpT: now, burnLeft: 0 }, now); assert.strictEqual(rp.cityPatch.hp, 7000);
  assert.throws(() => C.decideRepair({ hp: 10000, hpT: now, burnLeft: 0 }, now), /full_hp/);
});

t("hits", () => {
  const now = 1e12;
  let h = C.decideHit(null === 1 ? null : { hp: 10000, hpT: now, burnLeft: 0 }, now); assert.strictEqual(h.after, 9000); assert.strictEqual(h.cityPatch.burnLeft, 3000);
  h = C.decideHit({ hp: 9000, hpT: now - 3000, burnLeft: 3000 }, now); assert.strictEqual(h.cityPatch.burnLeft, 2999, "no fire reset while burning");
  h = C.decideHit({ hp: 500, hpT: now, burnLeft: 0 }, now); assert.ok(h.zeroed && h.cityPatch.raidedAt === now);
  assert.throws(() => C.checkHitCooldown(now - 1000, now), /hit_cooldown/); C.checkHitCooldown(now - 31000, now);
});

t("paths", () => {
  assert.strictEqual(C.envRoot("test"), "envs/test/"); assert.strictEqual(C.envRoot("live"), "");
  assert.throws(() => C.envRoot("../x"), /bad env/);
  assert.strictEqual(C.cityDocId("12,34"), "12_34"); assert.throws(() => C.cityDocId("1/2"), /bad tile/);
});
t("ledger + purchases", () => {
  const e = C.ledgerEntry("gems", -100, 50, "extinguish", "12,34", null, 5); assert.deepStrictEqual(e, { item: "gems", delta: -100, balance: 50, reason: "extinguish", at: 5, ref: "12,34" });
  assert.throws(() => C.ledgerEntry("dragons", 1, 1, "x", null, null, 1), /unknown item/);
  assert.strictEqual(C.purchaseId("stripe", "pi_3Nabc.def"), "stripe_pi_3Nabc-def");
  assert.throws(() => C.purchaseId("Stripe!", "x"), /bad provider/);
  const pack = { name: "Pouch", price: 4.99, currency: "NZD", items: { gems: 2500 } };
  const r = C.decidePurchase(null, pack, "pouch", { gems: 10 }, "u1", 9); assert.strictEqual(r.gems, 2510); assert.strictEqual(r.record.status, "delivered");
  assert.ok(C.decidePurchase(r.record, pack, "pouch", { gems: 2510 }, "u1", 10).dup, "same receipt twice is not delivered twice");
  assert.throws(() => C.decidePurchase(null, null, "nope", {}, "u1", 1), /unknown pack/);
});
t("item catalogue + mail", () => {
  const html = fs.readFileSync(path.join(__dirname, "../../test/index.html"), "utf8");
  Object.keys(C.ITEMS).filter((k) => k[0] !== "_").forEach((k) => { const d = C.ITEMS[k]; assert.ok(d.name && (d.kind === "wallet" || d.kind === "save"), k);
    if (d.kind === "save") { const root = d.path.split(".")[0]; assert.ok(new RegExp("\\b" + root + ":").test(html) || /^heroes\./.test(d.path), "save field not in game: " + d.path); } });
  const m = C.makeMail("Sorry!", "Compensation", { gems: 50, food: 1000 }, "adm", 7);
  assert.deepStrictEqual(m.items, { gems: 50, food: 1000 }); assert.strictEqual(m.from, "Admin");
  assert.throws(() => C.makeMail("x", "", { gems: 0 }, "a", 1), /bad amount/);
  assert.throws(() => C.makeMail("x", "", { dragons: 1 }, "a", 1), /unknown item/);
  assert.throws(() => C.makeMail("", "", { gems: 1 }, "a", 1), /title/);
  assert.strictEqual(m.category, "system", "no category = system");
  assert.strictEqual(C.makeMail("x", "", { gems: 1 }, "a", 1, "Wars").category, "wars", "category is case-insensitive");
  C.MAIL_CATEGORIES.forEach((k) => assert.strictEqual(C.makeMail("x", "", { gems: 1 }, "a", 1, k).category, k));
  assert.throws(() => C.makeMail("x", "", { gems: 1 }, "a", 1, "saved"), /unknown mail category/); /* Saved is a player bookmark, never a sent category */
  assert.throws(() => C.makeMail("x", "", { gems: 1 }, "a", 1, "spam"), /unknown mail category/);
  const c1 = C.decideMailClaim(m, 9); assert.ok(!c1.dup); assert.strictEqual(c1.list.length, 2); assert.strictEqual(c1.list[1].path, "resources.food");
  assert.ok(C.decideMailClaim(Object.assign({}, m, { claimedAt: 9 }), 10).dup, "claim twice = no-op");
  /* v943: packs + shop */
  const pk = C.normalizePack({ name: " Starter Pack ", items: { gems: 300, wood: 5000 }, tier: "4", limit: 1, mail: true, icon: "🎁" });
  assert.deepStrictEqual([pk.name, pk.tier, pk.limit, pk.mail, pk.active, pk.icon], ["Starter Pack", 4, 1, true, true, "🎁"]);
  assert.strictEqual(C.packIdFrom("Starter Pack!"), "starter_pack");
  assert.throws(() => C.normalizePack({ name: "", items: { gems: 1 } }), /name/); assert.throws(() => C.normalizePack({ name: "x", items: {} }), /1-20|no items/);
  assert.throws(() => C.normalizePack({ name: "x", items: { gems: 1 }, tier: -1 }), /tier/);
  const sh = C.normalizeShop({ tabs: [{ name: "Deals", icon: "🔥", items: [{ pack: "starter_pack", start: 100, end: 200, badge: "-50%" }] }, { name: "Shop", items: [] }] }, ["starter_pack"]);
  assert.strictEqual(sh.tiers[1].USD, 0.99); assert.strictEqual(sh.tiers[1].NZD, 1.69, "Harley's reference price");
  assert.deepStrictEqual(sh.tabs.map((t) => t.id), ["deals", "shop"]); assert.ok(C.shopEntryLive(sh.tabs[0].items[0], 150) && !C.shopEntryLive(sh.tabs[0].items[0], 250) && !C.shopEntryLive(sh.tabs[0].items[0], 50));
  assert.throws(() => C.normalizeShop({ tabs: [{ name: "Deals", items: [{ pack: "nope" }] }] }, ["starter_pack"]), /unknown pack/);
  assert.throws(() => C.normalizeShop({ tiers: { 1: { USD: -1 } } }, []), /bad price/);
  assert.throws(() => C.normalizeShop({ tabs: [{ name: "D", items: [{ pack: "starter_pack", start: 200, end: 100 }] }] }, ["starter_pack"]), /ends before/);
  assert.strictEqual(C.normalizePack({ name: "b", items: { gems: 1 }, banner: "data:image/jpeg;base64,AAAA" }).banner, "data:image/jpeg;base64,AAAA");
  assert.strictEqual(C.normalizePack({ name: "b", items: { gems: 1 } }).banner, null);
  assert.throws(() => C.normalizePack({ name: "b", items: { gems: 1 }, banner: "javascript:alert(1)" }), /banner/);
  assert.throws(() => C.normalizePack({ name: "b", items: { gems: 1 }, banner: "data:image/jpeg;base64," + "A".repeat(800000) }), /too big/);
  /* v945: top-up points + reward ladders */
  const shT = C.normalizeShop({ topups: [{ name: "Daily Top-up", period: "daily", tiers: [{ points: 2500, items: { gems: 500 } }, { points: 500, items: { wood: 1000 } }] }, { name: "Lifetime", period: "lifetime", tiers: [{ points: 50000, items: { gems: 9999 } }] }] }, []);
  assert.strictEqual(shT.tiers[8].points, 50000, "NZ$169.99 = 50,000 pts"); assert.strictEqual(shT.tiers[1].points, 500);
  assert.deepStrictEqual(shT.topups[0].tiers.map((m) => m.points), [500, 2500], "milestones sorted");
  assert.throws(() => C.normalizeShop({ topups: [{ name: "E", period: "event", tiers: [{ points: 1, items: { gems: 1 } }] }] }, []), /start and an end/);
  const T0 = Date.UTC(2026, 9, 8, 10); let tp = C.addTopup(null, shT.topups, 2500, T0);
  assert.strictEqual(tp.life, 2500); assert.strictEqual(tp.l.daily_top_up.n, 2500);
  const tc1 = C.decideTopupClaim(tp, shT.topups[0], 0, T0); assert.ok(!tc1.dup); assert.deepStrictEqual(tc1.items, { wood: 1000 });
  assert.ok(C.decideTopupClaim(tc1.topup, shT.topups[0], 0, T0).dup, "claim once");
  assert.throws(() => C.decideTopupClaim(tc1.topup, shT.topups[1], 0, T0), /not enough/);
  tp = C.addTopup(tc1.topup, shT.topups, 500, T0 + 86400e3); assert.strictEqual(tp.l.daily_top_up.n, 500, "next day starts again"); assert.deepStrictEqual(tp.l.daily_top_up.c, []);
  assert.strictEqual(tp.l.lifetime.n, 3000, "lifetime keeps counting");
  /* v946: events */
  const evs = C.normalizeEvents([{ name: "Burst of Life", tag: "Beginner", goal: "power", schedule: { type: "newplayer", days: 7 }, milestones: [{ target: 300000, worth: 700, items: { gems: 300 } }, { target: 50000, worth: 300, items: { gems: 100, wood: 100000 } }] }]);
  assert.strictEqual(evs[0].id, "burst_of_life"); assert.deepStrictEqual(evs[0].milestones.map((m) => m.target), [50000, 300000]);
  assert.throws(() => C.normalizeEvents([{ name: "x", schedule: { type: "newplayer", days: 0 }, milestones: [{ target: 1, items: { gems: 1 } }] }]), /days/);
  const W = C.eventWindow(evs[0], 1000); assert.deepStrictEqual(W, { start: 1000, end: 1000 + 7 * 86400000 });
  assert.strictEqual(C.eventProgress("power", { power: 61234 }), 61234); assert.strictEqual(C.eventProgress("townhall", { buildings: { townhall: { level: 7 } } }), 7);
  const ec = C.decideEventClaim(null, evs[0], 0, 61234, W, 5000); assert.ok(!ec.dup); assert.deepStrictEqual(ec.claimed, { k: 1000, c: [0] });
  assert.ok(C.decideEventClaim(ec.claimed, evs[0], 0, 61234, W, 5000).dup);
  assert.throws(() => C.decideEventClaim(ec.claimed, evs[0], 1, 61234, W, 5000), /not reached/);
  assert.throws(() => C.decideEventClaim(null, evs[0], 0, 61234, W, W.end + 1), /isn't running/);
  // v947: daily sign-in - one day per UTC day, in order, no time limit, a missed day just waits
  const si = C.normalizeEvents([{ name: "7-Day Sign-in", goal: "signin", schedule: { type: "newplayer", days: 9 }, milestones: [{ target: 99, items: { gems: 500 } }, { items: { hero_roran: 1 } }, { items: { shards_roran: 30 } }] }])[0];
  assert.deepStrictEqual(si.milestones.map((m) => m.target), [1, 2, 3]); assert.strictEqual(si.schedule.days, 0);
  const D = 86400000, SW = C.eventWindow(si, 5 * D); assert.ok(SW.end > 1e15);
  const s1 = C.decideEventClaim(null, si, 0, 0, SW, 5 * D + 100); assert.strictEqual(s1.claimed.d, 5); assert.strictEqual(s1.items.gems, 500);
  assert.throws(() => C.decideEventClaim(s1.claimed, si, 1, 0, SW, 5 * D + 200), /tomorrow/);
  assert.throws(() => C.decideEventClaim(s1.claimed, si, 2, 0, SW, 9 * D), /in order/);
  const s2 = C.decideEventClaim(s1.claimed, si, 1, 0, SW, 400 * D); assert.deepStrictEqual(s2.claimed.c, [0, 1]); /* a year later still fine */
  assert.strictEqual(C.signinProgress(s2.claimed, SW, 400 * D + 5), 2); assert.strictEqual(C.signinProgress(s2.claimed, SW, 401 * D), 3);
  assert.ok(C.decideEventClaim(s2.claimed, si, 1, 0, SW, 401 * D).dup);
  assert.ok(C.ITEMS.hero_roran && C.ITEMS.hero_roran.path === "heroes.roran.unlock");
  // save import: old save + the current world's parts kept, mail claims merged, gems from the wallet
  const oldS = { buildings: { townhall: { level: 8 } }, heroes: { gareth: { owned: true } }, idle: { chapter: 6, levelNum: 5 }, serverId: "server0", homeTileId: "59,19", marches: [{ id: 1 }], mailApplied: { a: 1 }, gems: 5 };
  const curS = { serverId: "server0", homeTileId: "817,571", worldVersion: 7, marches: [], nextMarchId: 3, mailApplied: { b: 2 } };
  const im = C.prepareImportSave(oldS, curS, 11900);
  assert.strictEqual(im.homeTileId, "817,571"); assert.deepStrictEqual(im.marches, []); assert.strictEqual(im.worldVersion, 7); assert.deepStrictEqual(im.mailApplied, { a: 1, b: 2 }); assert.strictEqual(im.gems, 11900); assert.strictEqual(im.buildings.townhall.level, 8);
  assert.throws(() => C.prepareImportSave({ foo: 1 }, curS, 0), /doesn't look like/);
  const daily = C.normalizePack({ name: "Daily", items: { gems: 10 }, tier: 1, limit: 1, reset: "daily" }); assert.strictEqual(daily.reset, "daily");
  assert.strictEqual(C.normalizePack({ name: "x", items: { gems: 1 }, reset: "weekly" }).reset, "none", "no limit = no reset");
  assert.throws(() => C.normalizePack({ name: "x", items: { gems: 1 }, limit: 1, reset: "hourly" }), /reset/);
  const T = Date.UTC(2026, 9, 8, 15, 30); /* Thu 8 Oct 2026 15:30 UTC */
  assert.strictEqual(C.limitPeriodStart("daily", T), Date.UTC(2026, 9, 8)); assert.strictEqual(C.limitPeriodStart("weekly", T), Date.UTC(2026, 9, 5), "Monday");
  assert.strictEqual(C.limitPeriodStart("monthly", T), Date.UTC(2026, 9, 1)); assert.strictEqual(C.limitPeriodEnd("monthly", T), Date.UTC(2026, 10, 1));
  assert.strictEqual(C.packBuysLeft(daily, [{ at: T - 3600e3, status: "delivered" }], T), 0, "bought today");
  assert.strictEqual(C.packBuysLeft(daily, [{ at: T - 86400e3, status: "delivered" }], T), 1, "yesterday's doesn't count");
  assert.strictEqual(C.packBuysLeft(pk, [{ at: 1, status: "delivered" }], T), 0, "one-time pack stays bought");
  assert.strictEqual(C.packBuysLeft(pk, [{ at: 1, status: "refunded" }], T), 1, "refunded doesn't count");
  const dp = C.decidePurchase(null, pk, "starter_pack", { gems: 10 }, "u1", 5); assert.strictEqual(dp.gems, 310); assert.deepStrictEqual(dp.others, { wood: 5000 }); assert.deepStrictEqual(dp.record.items, { gems: 300, wood: 5000 });
  const dw = C.decidePurchase(null, { name: "Wood", items: { wood: 9 } }, "w", { gems: 10 }, "u1", 5); assert.strictEqual(dw.add, 0); assert.strictEqual(dw.gems, 10, "no-gem pack leaves gems alone");
  /* v939: message-only mail (no items) */
  const mo = C.makeMail("Server news", "Maintenance at 5pm", {}, "adm", 7); assert.deepStrictEqual(mo.items, {}); assert.strictEqual(mo.body, "Maintenance at 5pm");
  assert.deepStrictEqual(C.makeMail("Hi", "", null, "adm", 7).items, {}, "no items given = message only");
  const mc = C.decideMailClaim(mo, 9); assert.ok(!mc.dup); assert.strictEqual(mc.list.length, 0); assert.strictEqual(mc.patch.claimedAt, 9, "opening marks it read");
  assert.throws(() => C.normalizeItems({}), /no items|1-20/, "other callers (purchases) still need items");
  const le = C.ledgerEntry("food", 1000, null, "mail", "m1", null, 3); assert.ok(!("balance" in le));
});
t("anti-cheat: save plausibility", () => {
  const base = () => ({ resources: { food: 5000, wood: 5000, stone: 3000, gold: 1000 }, troops: { infantry: 200, archer: 100, cavalry: 0 }, energon: 50, researchPoints: 10,
    buildings: { townhall: { level: 3 }, farm: { level: 2 } }, tech: { a: 1 }, fortressTech: {}, weaponLevels: {}, heroes: { gareth: { owned: true, level: 5, fragments: 10 } },
    idle: { chapter: 1, levelNum: 5, valor: 100, conquestBooks: 2 } });
  const ok = (b, a, dt, al) => C.checkSave(b, a, dt, al).reasons;
  // normal play: a minute of income, one upgrade, one level
  let b = base(), a = base(); a.resources.gold += 900; a.buildings.farm.level = 3; a.idle.levelNum = 6; a.troops.infantry += 300; a.heroes.gareth.level = 7;
  assert.deepStrictEqual(ok(b, a, 60), []);
  // nothing changed / things went down
  assert.deepStrictEqual(ok(base(), base(), 1), []);
  a = base(); a.resources.food = 0; a.troops.infantry = 0; assert.deepStrictEqual(ok(base(), a, 5), []);
  // Conquest: 1-5 -> 3-1 (36 levels) in 60 s is impossible; 1 level in 10 s is fine
  a = base(); a.idle.chapter = 3; a.idle.levelNum = 1; assert.ok(ok(base(), a, 60).some((r) => /Conquest \+36 levels/.test(r)));
  a = base(); a.idle.levelNum = 6; assert.deepStrictEqual(ok(base(), a, 10), []);
  // a console edit of gold
  a = base(); a.resources.gold = 1e9; let r = C.checkSave(base(), a, 60); assert.ok(r.reasons.some((x) => /^gold \+/.test(x)) && r.mailCouldHelp);
  // ... unless a claimed mail gave it
  assert.deepStrictEqual(ok(base(), a, 60, C.mailAllowance([{ items: { gold: 1e9 } }])), []);
  // broken numbers
  a = base(); a.resources.wood = NaN; assert.ok(ok(base(), a, 60).some((x) => /not a valid amount/.test(x)));
  a = base(); a.resources.wood = -5; assert.ok(ok(base(), a, 60).some((x) => /not a valid amount/.test(x)));
  // buildings maxed in seconds
  a = base(); a.buildings.townhall.level = 30; a.buildings.farm.level = 30; assert.ok(ok(base(), a, 10).some((x) => /building levels/.test(x)));
  // hero level 5 -> 100 in 10 s
  a = base(); a.heroes.gareth.level = 100; assert.ok(ok(base(), a, 10).some((x) => /gareth level/.test(x)));
  // troops from nothing to a million
  a = base(); a.troops.cavalry = 1e6; assert.ok(ok(base(), a, 60).some((x) => /^troops/.test(x)));
  // a long time away is allowed more
  a = base(); a.buildings.farm.level = 12; assert.deepStrictEqual(ok(base(), a, 3600), []);
  // brand-new save: defaults pass, a level-100 or rich new save is flagged
  assert.deepStrictEqual(ok(null, base(), null), []);
  a = base(); a.idle.chapter = 6; assert.ok(ok(null, a, null).some((x) => /new save already at Conquest level/.test(x)));
  a = base(); a.resources.gold = 5e6; assert.ok(ok(null, a, null).some((x) => /new save with/.test(x)));
  // mail allowance only counts save items
  assert.deepStrictEqual(C.mailAllowance([{ items: { gems: 50, food: 10, infantry: 5 } }, { items: { food: 5 } }]), { "resources.food": 15, "troops.infantry": 5 });
});
t("card catalog merge fills only empty slots, keeps Drop Signal in the last free slot", () => {
  const m = C.mergeCardCatalog([{ name: "Kept", effect: "x" }], [{ name: "Old", effect: "no" }, { name: "Two", effect: "b" }, null, { name: "x".repeat(99) }]);
  assert.strictEqual(m.cards.length, C.CARD_SLOTS);
  assert.strictEqual(m.cards[0].name, "Kept"); assert.strictEqual(m.cards[1].name, "Two"); assert.strictEqual(m.cards[3].name.length, 40);
  assert.strictEqual(m.cards[C.CARD_SLOTS - 1].name, "Drop Signal"); assert.strictEqual(m.filled, 2); assert.ok(m.drop);
  const again = C.mergeCardCatalog(m.cards, [{ name: "Late" }]); assert.strictEqual(again.cards.filter((c) => c.name === "Drop Signal").length, 1); assert.strictEqual(again.filled, 0);
});
t("security panel (v995): tunable limits, config, ban state, summary", () => {
  const L = C.mergeLimits({ res: { perSec: 5, base: -1, mult: "x" }, slackSec: 10, bogus: { base: 1 } });
  assert.strictEqual(L.res.perSec, 5); assert.strictEqual(L.res.base, C.AC_DEFAULT.res.base, "bad values ignored"); assert.strictEqual(L.res.mult, C.AC_DEFAULT.res.mult); assert.strictEqual(L.slackSec, 10);
  assert.strictEqual(C.AC_DEFAULT.res.perSec, 200, "defaults untouched"); assert.strictEqual(C.AC, C.AC_DEFAULT);
  const cfg = C.normalizeSecConfig({ autoRevert: "yes", limits: { res: { perSec: 200, base: 7 }, heroLvl: { base: 30 } } });
  assert.strictEqual(cfg.autoRevert, false, "only true turns it on"); assert.deepStrictEqual(cfg.limits, { res: { base: 7 } }, "only changed fields kept");
  assert.strictEqual(C.normalizeSecConfig({ autoRevert: true }).autoRevert, true);
  /* tighter limits flag what the defaults allow */
  const b = { resources: { food: 0, wood: 0, stone: 0, gold: 0 }, idle: { chapter: 1, levelNum: 1 } }, a = JSON.parse(JSON.stringify(b)); a.resources.wood = 50000;
  assert.strictEqual(C.checkSave(b, a, 60).reasons.length, 0); assert.ok(C.checkSave(b, a, 60, {}, { res: { base: 1000 } }).reasons.some((x) => /^wood \+/.test(x)));
  assert.strictEqual(C.reasonKey("wood +5,000 in 3s (limit 1)"), "wood"); assert.strictEqual(C.reasonKey("gareth level +40 in 3s"), "hero level"); assert.strictEqual(C.reasonKey("idle.valor +9 in 3s"), "valor");
  assert.strictEqual(C.reasonKey("Conquest +50 levels (needs 300s, had 30s)"), "Conquest");
  const now = 1e12;
  assert.ok(C.banActive({ kind: "ban" }, now)); assert.ok(C.banActive({ kind: "suspend", untilMs: now + 1 }, now)); assert.ok(!C.banActive({ kind: "suspend", untilMs: now - 1 }, now)); assert.ok(!C.banActive(null, now));
  const rows = [{ uid: "a", count: 4, lastAt: now - 10, status: "open", recent: [{ at: now - 10, reasons: ["wood +1 in 1s"] }, { at: now - 3 * 86400000, reasons: ["gold +1 in 1s"] }] },
    { uid: "b", count: 1, lastAt: now - 9e8, status: "dismissed", restricted: true, reverted: 2, recent: [{ at: now - 9e8, reasons: ["wood +1"] }] }, { uid: "c", count: 5, status: "watch", trusted: true, recent: [] }];
  const S = C.secSummary(rows, [{ kind: "ban" }, { kind: "suspend", untilMs: now + 5 }, { kind: "suspend", untilMs: now - 5 }], now);
  assert.strictEqual(S.flags24h, 1); assert.strictEqual(S.flags7d, 2); assert.strictEqual(S.players24h, 1); assert.strictEqual(S.open, 1); assert.strictEqual(S.watching, 1);
  assert.strictEqual(S.trusted, 1); assert.strictEqual(S.restricted, 1); assert.strictEqual(S.reverted, 2); assert.strictEqual(S.banned, 1); assert.strictEqual(S.suspended, 1);
  assert.deepStrictEqual(S.repeat.map((x) => x.uid), ["c", "a"], "repeat offenders, dismissed left out"); assert.ok(S.topReasons.some((x) => x.what === "wood"));
  assert.ok(C.SEC_ACTIONS.indexOf("rollback") >= 0 && C.SUSPEND_MAX_HOURS > 24);
});
t("v1231 daily tasks gems: 20 per task once a day, 300 chest only after 100 server-paid points, new day resets", () => {
  const T = Date.UTC(2026, 9, 17, 5), ids = Object.keys(C.DAILY_TASK_PTS); let rec = null;
  ids.forEach((id, i) => { const r = C.decideDailyClaim(rec, "task", id, T); assert.strictEqual(r.gems, C.DAILY_TASK_GEMS); rec = r.daily; if (i === 0) assert.strictEqual(C.decideDailyClaim(rec, "task", id, T).dup, true); if (i === ids.length - 2) assert.throws(() => C.decideDailyClaim(rec, "chest", "", T), /not reached/); });
  const c = C.decideDailyClaim(rec, "chest", "", T); assert.strictEqual(c.gems, C.DAILY_CHEST_GEMS); assert.strictEqual(C.decideDailyClaim(c.daily, "chest", "", T).dup, true);
  assert.strictEqual(C.decideDailyClaim(c.daily, "task", "login", T + 86400000).gems, C.DAILY_TASK_GEMS, "next UTC day: free again");
  assert.throws(() => C.decideDailyClaim(null, "task", "nope", T), /no such task/); assert.throws(() => C.decideDailyClaim(null, "x", "", T), /bad kind/);
  assert.strictEqual(ids.reduce((a, k) => a + C.DAILY_TASK_PTS[k], 0), 100);
});
t("v1593 live events config: clamps, sorts, refuses gems / unknown items", () => {
  const lo = C.normalizeLiveops({ fhw: { hero: "caelum", pts: { kill: 5 }, ms: [{ at: 1600, items: { featured_shards: 10 } }, { at: 100, items: { event_tokens: 10 } }], check: [{ kind: "boss", need: 1, pts: 300, name: "Beat boss" }] },
    shop: { items: [{ item: "item_chest_weapon", qty: 1, price: 200, limit: 2 }] }, wk: { heroes: ["roran"] }, dailyTok: [2, 3] });
  assert.deepStrictEqual(lo.fhw.ms.map((m) => m.at), [100, 1600]); assert.strictEqual(lo.fhw.pts.arena, 0); assert.deepStrictEqual(lo.dailyTok, [2, 3, 0, 0, 0]);
  assert.strictEqual(lo.wk.days, 7); assert.strictEqual(lo.shop.items[0].limit, 2);
  assert.throws(() => C.normalizeLiveops({ shop: { items: [{ item: "gems" }] } }), /can't sell gems/);
  assert.throws(() => C.normalizeLiveops({ fhw: { check: [{ kind: "nope" }] } }), /bad kind/);
  assert.ok(C.ITEMS.event_tokens && C.ITEMS.item_tp_advanced && C.ITEMS.speedup_healing_24h && C.ITEMS.shards_caelum, "new catalogue items");
});
t("v1594 arena event: defaults, rank rewards, keys", () => {
  const lo = C.normalizeLiveops({}); assert.strictEqual(lo.arena.win, 20); assert.strictEqual(C.arenaRankReward(lo.arena.rankD, 1).arena_medals, 200);
  assert.strictEqual(C.arenaRankReward(lo.arena.rankD, 7).arena_medals, 100); assert.strictEqual(C.arenaRankReward(lo.arena.rankD, 5000).arena_medals, 20);
  const k = C.arenaKeys(Date.UTC(2026, 10, 16, 1)); assert.strictEqual(k.w, C.arenaKeys(Date.UTC(2026, 10, 22, 23)).w, "Mon-Sun same week"); assert.notStrictEqual(k.w, C.arenaKeys(Date.UTC(2026, 10, 15, 23)).w, "Sunday before = previous week");
  assert.throws(() => C.normalizeLiveops({ arena: { shop: { items: [{ item: "gems" }] } } }), /can't sell gems/);
  assert.ok(C.ITEMS.arena_medals);
});
t("v1596 popup deals in the shop config", () => {
  const sh = C.normalizeShop({ popups: [{ pack: "starter", hero: "caelum", value: "800%", end: 2e12 }] }, ["starter"]); assert.strictEqual(sh.popups[0].hero, "caelum"); assert.strictEqual(sh.popups[0].pop, true);
  assert.throws(() => C.normalizeShop({ popups: [{ pack: "nope" }] }, ["starter"]), /unknown pack/); assert.deepStrictEqual(C.normalizeShop({}, []).popups, []);
});
t("v1599 Boss Rush config", () => {
  const L = C.normalizeLiveops({}); assert.deepStrictEqual(L.br.days, [2, 3, 4]); assert.strictEqual(L.br.tries, 3);
  const b = C.normalizeLiveops({ br: { days: [4, 2, 9, 2], tries: 99, hpGrow: 12, ms: [{ at: 50, items: { featured_shards: 5 } }], rank: [{ to: 0, items: { event_tokens: 3 } }, { to: 1, items: { featured_shards: 2 } }] } }).br;
  assert.deepStrictEqual(b.days, [2, 4]); assert.strictEqual(b.tries, 3, "out of range -> default"); assert.strictEqual(b.hpGrow, 12); assert.strictEqual(L.br.maxLv, 100); assert.strictEqual(b.ms[0].items.featured_shards, 5); assert.strictEqual(b.rank[0].to, 1, "rank rows sorted");
  assert.strictEqual(L.br.rank.length, 6); assert.strictEqual(C.normalizeLiveops({ br: { days: [1] } }).br.ms.length, 5, "missing milestones -> default track");
  const day = (y, m, dd) => Date.UTC(y, m - 1, dd, 12), BR = L.br, wk = C.arenaKeys(day(2026, 11, 18)).w; /* 18 Nov 2026 = Wednesday */
  assert.strictEqual(C.bossRunOpen(BR, day(2026, 11, 18)), true); assert.strictEqual(C.bossRunOpen(BR, day(2026, 11, 20)), false);
  assert.strictEqual(C.bossRunOver(BR, wk, day(2026, 11, 19)), false, "Thursday: still running"); assert.strictEqual(C.bossRunOver(BR, wk, day(2026, 11, 20)), true, "Friday: over");
  assert.strictEqual(C.bossRunOver(BR, wk, day(2026, 11, 23)), true, "next week");
  assert.strictEqual(C.normalizeLiveops({ br: { ms: [{ at: 10, items: { gems: 5 } }] } }).br.ms[0].items.gems, 5, "v1625: gems allowed");
});
t("v1601 featured shards in mail", () => {
  const L = C.normalizeLiveops({}), h = L.fhw.hero, r = C.resolveFeatured({ featured_shards: 10, event_tokens: 5 }, L);
  assert.strictEqual(r["shards_" + h], 10); assert.strictEqual(r.event_tokens, 5); assert.ok(!r.featured_shards);
  assert.ok(C.ITEMS["shards_" + h], "the featured hero has a shard item");
});
t("v1617 New Player Path: defaults, np_shards allowed, bad kinds / gems / duplicate chest days refused", () => {
  const L = C.normalizeLiveops({}); assert.strictEqual(L.np.days, 14); assert.strictEqual(L.np.hero, "roran"); assert.strictEqual(L.np.tasks.length, 42);
  assert.strictEqual(L.np.chests.filter((c) => c.items.np_shards).length, 2);
  const n = C.normalizeLiveops({ np: { days: 7, hero: "kessa", tasks: [{ id: "a", day: 9, kind: "th", need: 3, name: "TH 3", items: { food: 100 } }], chests: [{ day: 3, items: { np_shards: 1 } }] } }).np;
  assert.strictEqual(n.tasks[0].day, 1, "day past the end falls back"); assert.strictEqual(n.hero, "kessa");
  assert.throws(() => C.normalizeLiveops({ np: { tasks: [{ kind: "fly", items: { food: 1 } }] } }), /bad kind/);
  assert.strictEqual(C.normalizeLiveops({ np: { tasks: [{ kind: "th", items: { gems: 1 } }] } }).np.tasks[0].items.gems, 1);
  assert.throws(() => C.normalizeLiveops({ np: { chests: [{ day: 2, items: { food: 1 } }, { day: 2, items: { food: 1 } }] } }), /own day/);
});
t("v1618 Conquest Sprint: defaults, heroup kind, bad kinds / gems refused, needs a final chest", () => {
  const L = C.normalizeLiveops({}); assert.strictEqual(L.cs.tasks.length, 8); assert.strictEqual(L.cs.fin.featured_shards, 3);
  const n = C.normalizeLiveops({ cs: { parity: 0, tasks: [{ kind: "heroup", need: 2, items: { food: 1 } }], fin: { event_tokens: 5 } } }).cs; assert.strictEqual(n.parity, 0); assert.strictEqual(n.tasks[0].kind, "heroup");
  assert.throws(() => C.normalizeLiveops({ cs: { tasks: [{ kind: "nope", items: { food: 1 } }], fin: { food: 1 } } }), /bad kind/);
  assert.strictEqual(C.normalizeLiveops({ cs: { tasks: [], fin: { gems: 5 } } }).cs.fin.gems, 5);
});
t("v1621 Season Pass: defaults (30 levels, 60 premium season-hero shards), sp_shards allowed, gems allowed (v1625)", () => {
  const L = C.normalizeLiveops({}); assert.strictEqual(L.sp.levels.length, 30); assert.strictEqual(L.sp.levels.reduce((a, x) => a + (x.prem.sp_shards || 0), 0), 60);
  const n = C.normalizeLiveops({ sp: { days: 3, xp: 0, hero: "kessa", levels: [{ free: { food: 1 }, prem: { sp_shards: 5 } }] } }).sp; assert.strictEqual(n.days, 28, "too short falls back"); assert.strictEqual(n.xp, 20); assert.strictEqual(n.hero, "kessa");
  assert.strictEqual(C.normalizeLiveops({ sp: { levels: [{ free: { gems: 5 }, prem: { food: 1 } }] } }).sp.levels[0].free.gems, 5);
  assert.throws(() => C.normalizeLiveops({ sp: { levels: [] } }), /at least one level/);
});
t("v1623 Alliance Siege: defaults, tiers, rally share and bonus", () => {
  const L = C.normalizeLiveops({}); assert.strictEqual(L.sg.perWeek, 3); assert.strictEqual(L.sg.mins, 30); assert.ok(L.sg.rank.length >= 3 && L.sg.ms.length >= 5 && L.sg.alliance.length >= 3);
  assert.strictEqual(C.sgTier(L.sg.alliance, 0), null); assert.strictEqual(C.sgTier(L.sg.alliance, 5).dmg, 1, "taking part pays");
  /* v1725: hunt ranking (equal damage = equal place; to: 0 = everyone else) + lifetime milestones */
  const dm = { a: 900, b: 500, c: 500, d: 10 }; assert.strictEqual(C.sgRankOf(dm, "a"), 1); assert.strictEqual(C.sgRankOf(dm, "c"), 2); assert.strictEqual(C.sgRankOf(dm, "d"), 4); assert.strictEqual(C.sgRankOf(dm, "zz"), 0);
  assert.strictEqual(C.sgRankRow(L.sg.rank, 1).to, 1); assert.strictEqual(C.sgRankRow(L.sg.rank, 2).to, 3); assert.strictEqual(C.sgRankRow(L.sg.rank, 25).to, 0); assert.strictEqual(C.sgRankRow(L.sg.rank, 0), null);
  assert.deepStrictEqual(C.normalizeLiveops({ sg: { ms: [{ at: 50, items: { food: 1 } }, { at: 5, items: { food: 2 } }] } }).sg.ms.map((m) => m.at), [5, 50]);
  assert.throws(() => C.normalizeLiveops({ sg: { ms: [{ at: 0, items: { food: 1 } }] } }), /needs a damage amount/);
  assert.ok(C.normalizeLiveops({ sg: { personal: [{ dmg: 5, items: { food: 1 } }] } }).sg.rank.length >= 3, "an old config without rank rows gets the default ranking");
  const SG = C.normalizeLiveops({ sg: { dpp: 1, bonusPer: 0.1, bonusCap: 0.3, alliance: [] } }).sg;
  assert.strictEqual(C.sgShare(SG, 1000, 1, 0.5), 1000); assert.strictEqual(C.sgShare(SG, 1000, 3, 0.5), 1200); assert.strictEqual(C.sgShare(SG, 1000, 10, 0.5), 1300, "bonus capped");
  assert.strictEqual(C.normalizeLiveops({ sg: { alliance: [{ dmg: 5, items: { gems: 1 } }] } }).sg.alliance[0].items.gems, 1);
});
t("v1625 event rewards on the server: gems allowed in rewards, never in shops; item switches; claim plan + period + once-only + gem cap", () => {
  assert.throws(() => C.normalizeLiveops({ shop: { items: [{ item: "gems", qty: 1, price: 5 }] } }), /can't sell gems/);
  assert.throws(() => C.normalizeLiveops({ arena: { shop: { items: [{ item: "gems", qty: 1, price: 5 }] } } }), /can't sell gems/);
  const M = C.normalizeItemModes({ phone: ["gems", "food", "nope", "food"], gemDay: 300 }); assert.deepStrictEqual(M.phone, ["food"]); assert.strictEqual(M.gemDay, 300);
  assert.strictEqual(C.itemServerPaid(M, "food"), false); assert.strictEqual(C.itemServerPaid(M, "wood"), true); assert.strictEqual(C.itemServerPaid({ off: true, phone: [] }, "wood"), false); assert.strictEqual(C.itemServerPaid({ off: true, phone: [] }, "gems"), true);
  const lo = C.normalizeLiveops({ cs: { parity: 1, tasks: [{ id: "a", kind: "kill", need: 5, items: { gems: 100, food: 50 } }], fin: { featured_shards: 2, gems: 400 } }, np: { days: 14, tasks: [{ id: "x", day: 3, kind: "th", items: { gems: 20 } }], chests: [{ day: 1, items: { np_shards: 2 } }] } });
  const day = 20800, wk = (dd) => Math.floor((dd + 3) / 7); let d0 = day; while (wk(d0) % 2 !== 1) d0++; const now = d0 * 86400000 + 3600000, w = wk(d0);
  const p = C.evClaimPlan(lo, "cs", w, "t:a", { now }); assert.deepStrictEqual(p.items, { gems: 100, food: 50 });
  assert.deepStrictEqual(C.evClaimPlan(lo, "cs", w, "fin", { now }).items, { ["shards_" + lo.fhw.hero]: 2, gems: 400 }, "featured shards turned into real shards");
  assert.throws(() => C.evClaimPlan(lo, "cs", w + 1, "t:a", { now }), /not running/); assert.throws(() => C.evClaimPlan(lo, "cs", w, "t:zzz", { now }), /no such reward/);
  assert.throws(() => C.evClaimPlan(lo, "cs", w - 1, "t:a", { now }), /not running/, "an off week is not claimable");
  const nextOff = (wk(d0) + 1) * 7 - 3; assert.ok(C.evClaimPlan(lo, "cs", w, "t:a", { now: (nextOff + 1) * 86400000 }), "a sprint claim still pays a day after it ended");
  const created = (day - 1) * 86400000 + 5000, ctx = (dd) => ({ now: dd * 86400000 + 1000, createdAt: created });
  assert.deepStrictEqual(C.evClaimPlan(lo, "np", 0, "d:1", ctx(day)).items, { shards_roran: 2 });
  assert.throws(() => C.evClaimPlan(lo, "np", 0, "t:x", ctx(day)), /no such reward/, "day 3 task locked on day 2");
  assert.deepStrictEqual(C.evClaimPlan(lo, "np", 0, "t:x", ctx(day + 1)).items, { gems: 20 });
  assert.throws(() => C.evClaimPlan(lo, "np", 0, "t:x", ctx(day + 20)), /not running/);
  const sp = C.normalizeLiveops({}), sd = sp.sp.start + 3, sk = 0;
  assert.ok(C.evClaimPlan(sp, "sp", sk, "1:free", { now: sd * 86400000 })); assert.throws(() => C.evClaimPlan(sp, "sp", sk, "1:prem", { now: sd * 86400000, prem: () => false }), /premium/);
  assert.deepStrictEqual(C.evClaimPlan(sp, "sp", sk, "1:prem", { now: sd * 86400000, prem: (k) => k === 0 }).items, { shards_halo7: 2, gems: 200 });
  const lw = C.normalizeLiveops({ wk: { heroes: ["kessa"], shards: 15 } }); assert.deepStrictEqual(C.evClaimPlan(lw, "wk", wk(sd), "kessa", { now: sd * 86400000 }).items, { shards_kessa: 15 });
  assert.throws(() => C.evClaimPlan(lw, "wk", wk(sd), "roran", { now: sd * 86400000 }), /no such reward/, "only a hero on the list");
  const r1 = C.decideEvClaim(null, p, "t:a", M, null, now); assert.strictEqual(r1.dup, false); assert.strictEqual(r1.gems, 100); assert.deepStrictEqual(r1.save, {}, "food is phone-paid");
  assert.strictEqual(C.decideEvClaim(r1.rec, p, "t:a", M, r1.gd, now).dup, true, "once only");
  const r2 = C.decideEvClaim(null, { items: { gems: 500, wood: 9 } }, "z", M, r1.gd, now); assert.strictEqual(r2.gems, 200); assert.strictEqual(r2.capped, 300); assert.deepStrictEqual(r2.save, { wood: 9 });
  assert.strictEqual(C.decideEvClaim(null, { items: { gems: 500 } }, "z", M, r2.gd, now + 86400000).gems, 300, "cap resets next UTC day");
});
t("v1628 activity gems: defaults, caps per day, switch, daily task gems raised", () => {
  const L = C.normalizeLiveops({}); assert.deepStrictEqual(L.ga.monster, { g: 20, n: 20 }); assert.strictEqual(L.ga.login.n, 1);
  assert.strictEqual(C.normalizeGA({ arena: { g: -5, n: 3 } }).arena.g, 30, "bad number falls back"); assert.strictEqual(C.normalizeGA({ arena: { g: 7, n: 3 } }).arena.n, 3);
  const now = 20800 * 86400000; let rec = null, tot = 0; for (let i = 0; i < 25; i++) { const r = C.decideGemAct(rec, "monster", L.ga, now); rec = r.ga; tot += r.gems; } assert.strictEqual(tot, 400, "20 x 20 then nothing");
  assert.strictEqual(C.decideGemAct(rec, "monster", L.ga, now + 86400000).gems, 20, "new day"); assert.strictEqual(C.decideGemAct(rec, "camp", L.ga, now).gems, 10, "own cap per activity");
  assert.strictEqual(C.decideGemAct(null, "arena", Object.assign({}, L.ga, { on: false }), now).gems, 0); assert.throws(() => C.decideGemAct(null, "nope", L.ga, now), /bad activity/);
  assert.strictEqual(C.DAILY_TASK_GEMS, 40); assert.strictEqual(C.DAILY_CHEST_GEMS, 500);
});
t("v1629 gems in the starting event rewards: same patch in the game and the admin page, every default event pays gems", () => {
  const html = fs.readFileSync(path.join(__dirname, "../../test/index.html"), "utf8"), adm = fs.readFileSync(path.join(__dirname, "../../admin/index.html"), "utf8");
  const pat = (src) => JSON.parse(src.match(/var LIVE_GEMS_PATCH = (\{.*\});/)[1]);
  assert.deepStrictEqual(pat(html), C.LIVE_GEMS_PATCH, "game patch = server patch"); assert.deepStrictEqual(pat(adm), C.LIVE_GEMS_PATCH, "admin patch = server patch");
  const L = C.normalizeLiveops({}); assert.strictEqual(L.cs.fin.gems, 600); assert.ok(L.cs.tasks.every((t) => t.items.gems === 50)); assert.strictEqual(L.np.chests.reduce((a, c) => a + (c.items.gems || 0), 0), 3200);
  assert.strictEqual(L.sp.levels.reduce((a, l) => a + (l.free.gems || 0), 0), 300); assert.strictEqual(L.sp.levels.reduce((a, l) => a + (l.prem.gems || 0), 0), 6000);
  assert.ok(L.sg.rank.every((t) => t.items.gems > 0) && L.sg.ms.every((t) => t.items.gems > 0) && L.sg.alliance.every((t) => t.items.gems > 0)); assert.strictEqual(L.arena.rankW[0].items.gems, 1000);
  ["arena", "ff", "br"].forEach((k) => assert.ok(L[k].ms.every((m) => m.items.gems > 0), k));
});
t("v1630 hero of your choice (pick_shards) in events: allowed alone or with items, resolved to a Weekly Chest hero only", () => {
  const ev = C.normalizeEvents([{ name: "7-Day Sign-in", goal: "signin", schedule: { type: "newplayer", days: 0 }, milestones: [{ items: { gems: 5 } }, { items: { pick_shards: 30, gems: 1000 } }, { items: { pick_shards: 3 } }] }])[0];
  assert.deepStrictEqual(ev.milestones[1].items, { gems: 1000, pick_shards: 30 }); assert.strictEqual(ev.milestones[2].labels.pick_shards, C.PICK_SHARDS_LABEL);
  assert.deepStrictEqual(C.resolvePickShards(ev.milestones[1].items, "kessa", C.WK_HEROES_DEFAULT), { gems: 1000, shards_kessa: 30 });
  assert.throws(() => C.resolvePickShards(ev.milestones[1].items, "", C.WK_HEROES_DEFAULT), /pick a hero/); assert.throws(() => C.resolvePickShards(ev.milestones[1].items, "gareth", C.WK_HEROES_DEFAULT), /can't be picked/);
  assert.deepStrictEqual(C.resolvePickShards({ gems: 1 }, null, []), { gems: 1 }, "no pick needed");
});
t("v1631 Welcome Back: detected after `away` days, day n opens on the n-th day back, cb_shards = the Welcome Back hero", () => {
  const L = C.normalizeLiveops({}), day = 20800, now = day * 86400000 + 5000;
  assert.deepStrictEqual(C.comebackCheck({ lastSeen: now - 8 * 86400000 }, L.cb, now), { start: day }); assert.strictEqual(C.comebackCheck({ lastSeen: now - 3 * 86400000 }, L.cb, now), null);
  assert.strictEqual(C.comebackCheck({}, L.cb, now), null, "new account"); assert.deepStrictEqual(C.comebackCheck({ lastSeen: now, cb: { start: day - 2 } }, L.cb, now), { start: day - 2 }, "still running");
  assert.strictEqual(C.comebackCheck({ lastSeen: now, cb: { start: day - 9 } }, L.cb, now), null, "over");
  assert.ok(C.evClaimPlan(L, "cb", day, "d:1", { now, createdAt: day })); assert.throws(() => C.evClaimPlan(L, "cb", day, "d:2", { now, createdAt: day }), /no such reward/);
  assert.deepStrictEqual(C.evClaimPlan(L, "cb", day, "d:7", { now: now + 6 * 86400000, createdAt: day }).items, { gems: 1000, shards_kessa: 30, item_chest_weapon: 1 });
  assert.throws(() => C.evClaimPlan(L, "cb", day, "d:1", { now: now + 10 * 86400000, createdAt: day }), /not running/); assert.throws(() => C.evClaimPlan(L, "cb", day, "d:1", { now, createdAt: null }), /not running/);
});
t("v1632 Hero Collection: steps checked against the saved heroes (stars = arms / 5), collection counts, not-yet = retry later (aborted)", () => {
  const L = C.normalizeLiveops({}), save = { heroes: { kessa: { owned: true, stars: 16 }, roran: { owned: true, stars: 2 }, lyra: { owned: true }, gareth: { owned: false, stars: 25 } } }, now = Date.now();
  assert.strictEqual(C.hcStars(save, "kessa"), 3); assert.strictEqual(C.hcStars(save, "gareth"), -1); assert.strictEqual(C.hcOwned(save).length, 3);
  assert.deepStrictEqual(C.evClaimPlan(L, "hc", 0, "h:kessa:1", { now, save }).items, { gems: 300, speedup_general_1h: 2 });
  assert.throws(() => C.evClaimPlan(L, "hc", 0, "h:kessa:2", { now, save }), (e) => e.code === "aborted"); assert.throws(() => C.evClaimPlan(L, "hc", 0, "h:gareth:0", { now, save }), (e) => e.code === "aborted");
  assert.ok(C.evClaimPlan(L, "hc", 0, "c:0", { now, save })); assert.throws(() => C.evClaimPlan(L, "hc", 0, "c:1", { now, save }), (e) => e.code === "aborted");
  assert.throws(() => C.evClaimPlan(L, "hc", 0, "h:nobody:0", { now, save }), /no such reward/); assert.throws(() => C.evClaimPlan(L, "hc", 1, "c:0", { now, save }), /not running/);
});
t("v1633 Seasonal Festivals: dated, no overlaps, claims only while one runs, period = its start day", () => {
  const L = C.normalizeLiveops({}); assert.strictEqual(L.fs.list.length, 2); assert.strictEqual(C.fsAt(L.fs, 20810).name, "Winter Festival"); assert.strictEqual(C.fsAt(L.fs, 20830), null);
  assert.deepStrictEqual(C.evClaimPlan(L, "fs", 20805, "ms:0", { now: 20810 * 86400000 }).items, { gems: 200, speedup_general_1h: 2 });
  assert.ok(C.evClaimPlan(L, "fs", 20805, "ms:0", { now: 20822 * 86400000 + 5 }), "a day after it ends still pays (grace)"); assert.throws(() => C.evClaimPlan(L, "fs", 20805, "ms:0", { now: 20830 * 86400000 }), /not running/);
  assert.throws(() => C.normalizeLiveops({ fs: { list: [{ name: "A", start: 100, end: 110, ms: [] }, { name: "B", start: 105, end: 120, ms: [] }] } }), /overlap/);
  assert.throws(() => C.normalizeLiveops({ fs: { list: [{ name: "A", start: 100, end: 90, ms: [] }] } }), /start and an end/);
});
t("v1635 cards: grants extend from the current end, daily once a day while active, one pick per milestone, pass_sp = this season", () => {
  const L = C.normalizeLiveops({}), day = 20800, now = day * 86400000 + 5, w = Math.floor((day + 3) / 7);
  const g1 = C.applyGrant({}, "card_weekly", L, now); assert.deepStrictEqual(g1.cards.weekly, { from: day, until: day + 7 });
  assert.deepStrictEqual(C.applyGrant(g1, "card_weekly", L, now + 2 * 86400000).cards.weekly, { from: day, until: day + 14 }, "buying again adds days");
  assert.deepStrictEqual(C.applyGrant(g1, "card_monthly", L, now).cards.monthly, { from: day, until: day + 30 });
  assert.ok(C.evClaimPlan(L, "cdd", day, "weekly", { now, cards: g1.cards })); assert.throws(() => C.evClaimPlan(L, "cdd", day, "monthly", { now, cards: g1.cards }), /card not active/);
  assert.throws(() => C.evClaimPlan(L, "cdd", day + 8, "weekly", { now: now + 8 * 86400000, cards: g1.cards }), /card not active/);
  const p = C.evClaimPlan(L, "cdp", w, "2:1", { now, cards: g1.cards }); assert.strictEqual(p.ref, "2"); assert.deepStrictEqual(p.items, { ["shards_" + L.fhw.hero]: 10 });
  const r = C.decideEvClaim(null, p, p.ref, L.items, null, now); assert.strictEqual(C.decideEvClaim(r.rec, C.evClaimPlan(L, "cdp", w, "2:0", { now, cards: g1.cards }), "2", L.items, r.gd, now).dup, true, "other choice of the same milestone = already claimed");
  assert.throws(() => C.evClaimPlan(L, "cdp", w, "0:0", { now, cards: {} }), /card not active/);
  assert.deepStrictEqual(C.applyGrant({}, "pass_sp", L, (L.sp.start + 3) * 86400000), { spPrem: 0 }); assert.strictEqual(C.normalizePack({ name: "x", items: { gems: 1 }, grant: "nope" }).grant, "");
});
t("v1636 Hero Shop: gems taken on the server, weekly stock per player, featured shards resolved, no gems for sale", () => {
  const L = C.normalizeLiveops({}), now = 20800 * 86400000; const r = C.decideHeroShop(null, L.hs, "kessa", 2, 500, L, now);
  assert.strictEqual(r.gems, 300); assert.deepStrictEqual(r.items, { shards_kessa: 2 }); assert.strictEqual(r.left, 18);
  assert.throws(() => C.decideHeroShop(r.hs, L.hs, "kessa", 19, 1e6, L, now), /sold out/); assert.strictEqual(C.decideHeroShop(r.hs, L.hs, "kessa", 19, 1e6, L, now + 7 * 86400000).left, 1, "refills next week");
  assert.throws(() => C.decideHeroShop(null, L.hs, "kessa", 1, 99, L, now), /not_enough_gems/); assert.throws(() => C.normalizeLiveops({ hs: { items: [{ item: "gems", price: 1 }] } }), /can't sell gems/);
  assert.deepStrictEqual(C.decideHeroShop(null, L.hs, "feat", 1, 100, L, now).items, { ["shards_" + L.fhw.hero]: 1 });
});
t("v1842 Overlord gear: costs match the game, upgrade / reset rules", () => {
  const html = fs.readFileSync(path.join(__dirname, "../../test/index.html"), "utf8");
  const gameCost = JSON.parse(html.match(/var GOV_GEAR_COST = (\[[^\]]*\]);/)[1]);
  assert.deepStrictEqual(C.GEAR_COST, gameCost, "server GEAR_COST = game GOV_GEAR_COST");
  assert.ok(/var GOV_GEAR_UNLOCK_TH = 22;/.test(html) && C.GEAR_UNLOCK_TH === 22);
  C.GEAR_PIECES.forEach((k) => assert.ok(new RegExp("\\n  " + k + ":\\s+\\{ label:").test(html), "piece " + k + " exists in the game"));
  assert.throws(() => C.decideGearUpgrade({ arcsteel: 1e9 }, "cannon", 21), /locked/);
  assert.throws(() => C.decideGearUpgrade({ arcsteel: 1e9 }, "nope", 30), /bad_piece/);
  assert.throws(() => C.decideGearUpgrade({ arcsteel: 10 }, "cannon", 22), /not_enough/);
  let w = { arcsteel: 30000 };
  const a = C.decideGearUpgrade(w, "cannon", 22); assert.strictEqual(a.step, 0); assert.strictEqual(a.arcsteel, 30000 - C.GEAR_COST[0]);
  w = { arcsteel: a.arcsteel, govGear: a.govGear }; const b = C.decideGearUpgrade(w, "cannon", 22); assert.strictEqual(b.step, 1); assert.strictEqual(b.govGear.cannon, 1);
  assert.throws(() => C.decideGearUpgrade({ arcsteel: 1e12, govGear: { boss: 39 } }, "boss", 30), /maxed/);
  assert.throws(() => C.decideGearReset({ arcsteel: 0, govGear: { cannon: 1 } }, "cannon"), /no_reset_item/);
  assert.throws(() => C.decideGearReset({ gearReset: 1 }, "cannon"), /nothing_to_reset/);
  const rs = C.decideGearReset({ arcsteel: b.arcsteel, govGear: b.govGear, gearReset: 2 }, "cannon");
  assert.strictEqual(rs.arcsteel, 30000, "full refund"); assert.strictEqual(rs.gearReset, 1); assert.strictEqual(rs.govGear.cannon, undefined);
  assert.strictEqual(C.ITEMS.arcsteel.kind, "wallet"); assert.strictEqual(C.ITEMS.gearReset.kind, "wallet");
});
console.log(n + " tests passed");
