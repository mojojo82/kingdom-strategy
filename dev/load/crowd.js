/* v1074: fake crowd for load tests (world map plan, phase 1).
   Builds labelled bot bases and marches for one kingdom. Every doc has loadBot:true and an owner starting "bot_load_",
   so the whole crowd can be found and removed in one go (removeCrowd below; the game's Dev Tools "destroy bots" also removes bot_ bases).
   Pure data - no Firebase calls here; the caller decides where the docs go (the fake store in tests; the TEST Firebase later). */
const SKINS = ["castle", "tower", "pirate", "voidspire"];
function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
/* tiles: [{id:"x,y"}] free, spaced tiles in the kingdom (picked in-game so they're real land). prefix: "servers/server1/" etc. */
function routePatches(fromId, toId) { /* same as the game's marchPatchList (v1082) */
  const [ax, ay] = fromId.split(",").map(Number), [bx, by] = toId.split(",").map(Number), dx = bx - ax, dy = by - ay, n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) * 4)), out = {}, P = (x, y) => Math.floor(x / 50) + "_" + Math.floor(y / 50);
  for (let i = 0; i <= n; i++) { const x = ax + dx * i / n, y = ay + dy * i / n; out[P(Math.floor(x + 0.5), Math.floor(y + 0.5))] = 1; out[P(Math.floor(x), Math.floor(y))] = 1; }
  return Object.keys(out).sort();
}
function makeCrowd(tiles, opts) {
  const o = Object.assign({ prefix: "servers/server1/", marches: 300, seed: 1074, now: Date.now() }, opts || {});
  const r = rng(o.seed), docs = {}, owners = [];
  tiles.forEach((t, i) => {
    const owner = "bot_load_" + i; owners.push({ owner, tileId: t.id });
    docs[o.prefix + "cities/" + t.id.replace(",", "_")] = { owner, claimedAt: o.now - Math.floor(r() * 86400000), sk: SKINS[i % SKINS.length], bn: "Load Bot " + i, loadBot: true };
  });
  for (let i = 0; i < o.marches && owners.length; i++) {
    const w = owners[Math.floor(r() * owners.length)], [hx, hy] = w.tileId.split(",").map(Number);
    /* v1082: like real players - 90% of marches go to something within 60 tiles of home, 10% anywhere */
    const near = tiles.filter((t) => { const [x, y] = t.id.split(",").map(Number); return t.id !== w.tileId && Math.abs(x - hx) <= 60 && Math.abs(y - hy) <= 60; });
    const tgt = r() < 0.9 && near.length ? near[Math.floor(r() * near.length)] : tiles[Math.floor(r() * tiles.length)];
    const travelSec = 60 + Math.floor(r() * 540), arriveAt = o.now + Math.floor((r() * 2 - 0.5) * travelSec * 1000), actionEnd = arriveAt + 5000;
    docs[o.prefix + "marches/" + w.owner + "_lm" + i] = { skin: SKINS[i % SKINS.length], ownerId: w.owner, ownerName: "Load Bot", mid: "lm" + i, tileId: tgt.id, homeTileId: w.tileId, action: "attack", travelSec, arriveAt, actionEnd, returnAt: actionEnd + travelSec * 1000,
      army: { infantry: 100 }, heroKeys: [], resolved: true, result: { loot: {} }, report: null, updatedAt: o.now, loadBot: true,
      patches: routePatches(w.tileId, tgt.id), targetOwner: "bot_load_" + tiles.indexOf(tgt), aid: null };
  }
  return docs;
}
function isCrowdDoc(d) { return !!(d && (d.loadBot === true || (typeof d.owner === "string" && d.owner.indexOf("bot_load_") === 0) || (typeof d.ownerId === "string" && d.ownerId.indexOf("bot_load_") === 0))); }
function removeCrowd(store) { let n = 0; Object.keys(store).forEach((k) => { if (isCrowdDoc(store[k])) { delete store[k]; n++; } }); return n; }
module.exports = { makeCrowd, routePatches, isCrowdDoc, removeCrowd };
