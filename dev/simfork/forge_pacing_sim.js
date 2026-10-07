/* v921: Forge pacing simulator. A player puts every Energon into the Forge; prints Energon spent (and rough play time) at the first piece of each
   rarity or better: 10th percentile / median / 90th. Time model: day 1 = 4 h active play (3,000/h falling to 1,500/h, measured) + 8 h idle at 40/h;
   later days 9,000/day (the game's own 'very active player' note). Run: node dev/simfork/forge_pacing_sim.js */
// Forge pacing sim: players put every Energon into the Forge. Reports cumulative Energon (and time) at the first piece of each rarity or better.
function make(cfg) {
  const P = cfg.cost, U = cfg.unlock, O = cfg.odds, MAX = 30;
  function cost(L) { L = Math.max(1, L); if (L >= P[P.length - 1][0]) return P[P.length - 1][1]; for (let i = 0; i < P.length - 1; i++) if (L <= P[i + 1][0]) { const t = (L - P[i][0]) / (P[i + 1][0] - P[i][0]); return Math.round(Math.exp(Math.log(P[i][1]) * (1 - t) + Math.log(P[i + 1][1]) * t)); } }
  function odds(L) { L = Math.max(1, Math.min(MAX, L)); let i; for (i = 0; i < O.length - 1; i++) if (L <= O[i + 1][0]) break; if (i >= O.length - 1) i = O.length - 2; const a = O[i], b = O[i + 1], f = (L - a[0]) / (b[0] - a[0]); const w = [0, 0, 0, 0, 0, 0].map((_, r) => U[r] > L ? 0 : a[1][r] + (b[1][r] - a[1][r]) * f); const s = w.reduce((x, y) => x + y, 0) || 1; return w.map((x) => x / s * 100); }
  return { cost, odds, need: (L) => 8 + 2 * L, MAX };
}
// time model: energon earned by hour h. Day 1: active 4 h at a falling rate (3000/h -> 1500/h), then idle bucket. Later days: 9000/day.
function energonAtHour(h) { if (h <= 4) return 3000 * h - 187.5 * h * h; const d1 = 3000 * 4 - 187.5 * 16; if (h <= 24) return d1 + Math.min(h - 4, 8) * 40; const day1 = d1 + 8 * 40; return day1 + (h - 24) * (9000 / 24); }
function hourForEnergon(e) { let lo = 0, hi = 24 * 3650; for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (energonAtHour(m) < e) lo = m; else hi = m; } return hi; }
function run(cfg, N) {
  const F = make(cfg), firsts = [[], [], [], [], [], []];
  for (let n = 0; n < N; n++) {
    let L = 1, prog = 0, spent = 0; const got = [null, null, null, null, null, null]; let guard = 0;
    while (got[5] == null && guard++ < 200000) {
      spent += F.cost(L); const od = F.odds(L); let x = Math.random() * 100, r = 0, acc = 0; for (let i = 0; i < 6; i++) { acc += od[i]; if (x < acc) { r = i; break; } r = i; }
      for (let k = 0; k <= r; k++) if (got[k] == null) got[k] = spent;
      prog++; if (prog >= F.need(L) && L < F.MAX) { L++; prog = 0; }
    }
    got.forEach((v, i) => firsts[i].push(v == null ? Infinity : v));
  }
  const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(p * (s.length - 1))]; };
  const fmtT = (h) => h < 1 ? Math.round(h * 60) + " min" : h < 48 ? h.toFixed(1) + " h" : (h / 24).toFixed(1) + " d";
  const names = ["Common", "Rare", "Elite", "Super Rare", "Epic", "Legendary"];
  return names.map((nm, i) => ({ nm, p10: q(firsts[i], 0.1), med: q(firsts[i], 0.5), p90: q(firsts[i], 0.9) })).map((o) => o.nm.padEnd(11) + " first at  10%: " + String(Math.round(o.p10)).padStart(9) + " (" + fmtT(hourForEnergon(o.p10)) + ")  median: " + String(Math.round(o.med)).padStart(9) + " (" + fmtT(hourForEnergon(o.med)) + ")  90%: " + String(Math.round(o.p90)).padStart(9) + " (" + fmtT(hourForEnergon(o.p90)) + ")");
}
module.exports = { run, make, energonAtHour };
if (require.main === module) {
  /* read the live table straight out of the test game, so this always measures what ships */
  const html = require("fs").readFileSync(require("path").join(__dirname, "../../test/index.html"), "utf8");
  const grab = (re) => JSON.parse(html.match(re)[1]);
  const CUR = { cost: grab(/var FORGE_COST_POINTS = (\[[^;]+\]);/), unlock: grab(/var EQ_UNLOCK = (\[[^\]]+\]);/), odds: grab(/var FORGE_ODDS_POINTS = (\[[^;]+\]);/) };
  console.log("v921 table (test/index.html):"); console.log(run(CUR, 2000).join("\n"));
}
