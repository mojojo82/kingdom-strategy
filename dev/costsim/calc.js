// v1625: Firebase cost / volume calculator.
//   node dev/costsim/calc.js                    -> table for 100 .. 100,000 daily players, today's setup vs "event rewards on the server"
//   node dev/costsim/calc.js --json             -> raw numbers
// Inputs: dev/costsim/session_profile.json (measured by a headless player session with counters in dev/tests/fakefb.js + fnrunner.js)
// and the ASSUMPTIONS below (edit them). Prices: Firestore Standard, us-central1, on-demand; Cloud Run functions request-based (Nov 2026).
"use strict";
const fs = require("fs"), path = require("path");
const prof = JSON.parse(fs.readFileSync(path.join(__dirname, "session_profile.json"), "utf8"));
const seg = (n) => prof.segments.find((s) => s.name.indexOf(n) === 0) || { reads: 0, writes: 0, calls: 0, sReads: 0, sWrites: 0, secs: 1 };

const PRICE = {
  read: 0.03 / 1e5, write: 0.09 / 1e5, // per document (us-central1; a multi-region database is about 2x)
  freeReads: 50000, freeWrites: 20000, // per day
  call: 0.40 / 1e6, freeCalls: 2e6, // per month
  cpuSec: 0.000024, gibSec: 0.0000025, freeCpu: 180000, freeGib: 360000, // per month; a call ~0.15 s of 1 vCPU / 256 MiB
  callSec: 0.15, callGib: 0.25
};
const A = { // per daily active player, per day - EDIT THESE
  sessions: 3, // logins a day
  conquestMin: 25, cityMin: 15, worldMin: 10, // minutes a day on each screen
  eventClaims: 8, arenaFights: 10, chatSent: 6, // actions a day
  onlineShare: 0.15, // share of a kingdom's daily players online at the same moment
  kingdom: 1000, // daily players per kingdom (server)
  allianceSize: 40, // members per alliance (active)
  worldChatPerPlayer: 3, // world chat messages a player sends a day
  mapChangesPerPlayer: 30, // city / march / camp changes a player causes a day that other map viewers receive
  siegeHuntsPerWeek: 3, siegeHitsPerMember: 15 // Alliance Siege: rallies a member is in per hunt
};
const rate = (n) => { const s = seg(n); return { r: s.reads / Math.max(1, s.secs), w: s.writes / Math.max(1, s.secs), c: s.calls / Math.max(1, s.secs), sr: s.sReads / Math.max(1, s.secs), sw: s.sWrites / Math.max(1, s.secs) }; };
function perPlayer(serverRewards) {
  const load = seg("signup"), cq = rate("conquest"), city = rate("city idle"), world = rate("world"), ev = seg("events"), ar = seg("2 arena"), al = seg("alliance");
  let r = 0, w = 0, c = 0, sr = 0, sw = 0;
  const add = (o, k) => { r += o.r * k; w += o.w * k; c += o.c * k; sr += o.sr * k; sw += o.sw * k; };
  r += A.sessions * load.reads; w += A.sessions * load.writes; c += A.sessions * load.calls; sr += A.sessions * load.sReads; sw += A.sessions * load.sWrites;
  add(cq, A.conquestMin * 60); add(city, A.cityMin * 60); add(world, A.worldMin * 60);
  r += A.eventClaims * ev.reads; w += A.eventClaims * ev.writes;
  r += A.arenaFights / 2 * ar.reads; w += A.arenaFights / 2 * ar.writes; c += A.arenaFights / 2 * ar.calls; sr += A.arenaFights / 2 * ar.sReads; sw += A.arenaFights / 2 * ar.sWrites;
  r += A.chatSent / 3 * al.reads * 0.3; w += A.chatSent; // chat sends (alliance creation part of the segment left out)
  // fan-out: what OTHER players' activity costs this player while online (listeners on shared data)
  const onlineMinutes = A.conquestMin + A.cityMin + A.worldMin, onlineFrac = onlineMinutes / 1440;
  r += A.kingdom * A.worldChatPerPlayer * onlineFrac; // world chat messages delivered
  r += A.allianceSize * A.chatSent * onlineFrac; // alliance chat delivered
  r += A.kingdom * A.mapChangesPerPlayer * (A.worldMin / 1440) * 0.1; // map changes in view (~10% of the kingdom's map is on screen)
  // Alliance Siege (per day average): each rally hit = 1 call, ~3 + members server reads, 2 writes; every online member's listeners get the hunt doc + the rally
  const sgDay = A.siegeHuntsPerWeek / 7, hitsDay = sgDay * A.siegeHitsPerMember;
  c += hitsDay * 1.6; sr += hitsDay * (4 + 6); sw += hitsDay * 3; r += hitsDay * A.allianceSize * A.onlineShare * 2 * 0.5;
  if (serverRewards) { c += A.eventClaims; sr += A.eventClaims * 4; sw += A.eventClaims * 3; w -= A.eventClaims * 0.5; } // claims go through the server (validate + pay + log)
  return { reads: r + sr, writes: w + sw, calls: c };
}
function month(players, serverRewards) {
  const p = perPlayer(serverRewards), day = { reads: p.reads * players, writes: p.writes * players, calls: p.calls * players };
  const fsCost = Math.max(0, day.reads - PRICE.freeReads) * PRICE.read * 30 + Math.max(0, day.writes - PRICE.freeWrites) * PRICE.write * 30;
  const callsM = day.calls * 30, fnCost = Math.max(0, callsM - PRICE.freeCalls) * PRICE.call + Math.max(0, callsM * PRICE.callSec - PRICE.freeCpu) * PRICE.cpuSec + Math.max(0, callsM * PRICE.callSec * PRICE.callGib - PRICE.freeGib) * PRICE.gibSec;
  return { players, readsDay: Math.round(day.reads), writesDay: Math.round(day.writes), callsDay: Math.round(day.calls), firestore: fsCost, functions: fnCost, total: fsCost + fnCost };
}
const N = [100, 1000, 10000, 100000], out = N.map((n) => ({ today: month(n, false), server: month(n, true) }));
if (process.argv.includes("--json")) { console.log(JSON.stringify({ assumptions: A, perPlayer: { today: perPlayer(false), server: perPlayer(true) }, out }, null, 1)); return; }
const $ = (v) => "$" + (v < 10 ? v.toFixed(2) : Math.round(v).toLocaleString("en-US")), K = (v) => v >= 1e6 ? (v / 1e6).toFixed(1) + "M" : v >= 1e3 ? Math.round(v / 1e3) + "K" : String(v);
console.log("Per daily player per day - today: " + JSON.stringify(perPlayer(false), (k, v) => typeof v === "number" ? Math.round(v) : v) + "  server rewards: " + JSON.stringify(perPlayer(true), (k, v) => typeof v === "number" ? Math.round(v) : v));
console.log("daily players | reads/day | writes/day | server calls/day | $/month today | $/month with server-paid rewards");
out.forEach((o) => console.log([o.today.players.toLocaleString("en-US"), K(o.today.readsDay), K(o.today.writesDay), K(o.today.callsDay), $(o.today.total), $(o.server.total)].join(" | ")));
