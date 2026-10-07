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
  assert.ok(html.includes("function idleHordeSize() { return Math.min(10, 5 + Math.floor((idleGlobalLevelNum() - 1) / 25)); }"), "horde size formula changed");
  assert.ok(html.includes("function idleHordeCount() { return Math.min(8, 4 + Math.floor((idleGlobalLevelNum() - 1) / 30)); }"), "horde count formula changed");
});

t("level floor matches measurements", () => {
  assert.ok(Math.abs(C.levelFloorSec(1) - 4.25) < 0.1);
  assert.ok(Math.abs(C.levelFloorSec(41) - 6.0) < 0.1);
  assert.ok(Math.abs(C.levelFloorSec(181) - 13.8) < 0.1);
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
  /* v943: packs made in the admin panel */
  const pk = C.normalizePack({ name: " Starter Pack ", items: { gems: 300, wood: 5000 }, price: "4.99", currency: "nzd", shop: true, mail: true });
  assert.deepStrictEqual([pk.name, pk.price, pk.currency, pk.shop, pk.mail, pk.active], ["Starter Pack", 4.99, "NZD", true, true, true]);
  assert.strictEqual(C.packIdFrom("Starter Pack!"), "starter_pack");
  assert.throws(() => C.normalizePack({ name: "", items: { gems: 1 } }), /name/); assert.throws(() => C.normalizePack({ name: "x", items: {} }), /1-20|no items/);
  assert.throws(() => C.normalizePack({ name: "x", items: { gems: 1 }, price: -1 }), /price/);
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
console.log(n + " tests passed");
