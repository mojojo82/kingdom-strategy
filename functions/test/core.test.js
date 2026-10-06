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
  const c1 = C.decideMailClaim(m, 9); assert.ok(!c1.dup); assert.strictEqual(c1.list.length, 2); assert.strictEqual(c1.list[1].path, "resources.food");
  assert.ok(C.decideMailClaim(Object.assign({}, m, { claimedAt: 9 }), 10).dup, "claim twice = no-op");
  const le = C.ledgerEntry("food", 1000, null, "mail", "m1", null, 3); assert.ok(!("balance" in le));
});
console.log(n + " tests passed");
