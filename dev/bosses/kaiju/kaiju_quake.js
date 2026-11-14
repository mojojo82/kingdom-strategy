/* Kaiju stomp: creeping ground blast (separate effect, drawn in code so it is smooth at any frame rate).
   KAIJU_QUAKE.draw(ctx, q, x0, x1, gy, scale)
     q  = seconds since the foot hit the ground (0 .. LEN), nothing drawn outside that
     x0 = where the foot hit (screen px), x1 = target (ship hull) x, gy = ground line y, scale = kaiju scale.
   A crack of violet light runs along the floor from the foot to the ship; crystal spikes erupt just
   behind the front and sink again; sparks and dust kick up; it bursts under the target on arrival. */
(function () {
  var TRAVEL = 0.95, LEN = 2.1;
  function hash(i) { var s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  function sm(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function glow(ctx, x, y, rx, ry, col, a) {
    if (a <= 0 || rx <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx);
    var g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, "rgba(" + col + "," + a + ")"); g.addColorStop(1, "rgba(" + col + ",0)");
    ctx.fillStyle = g; ctx.fillRect(-rx, -rx, 2 * rx, 2 * rx); ctx.restore();
  }
  function spike(ctx, x, y, w, h, lean, a) { /* crystal shard: pale pink core, violet edges, dark rim */
    if (h < 1) return; ctx.save(); ctx.globalCompositeOperation = "lighter"; glow(ctx, x, y - h * 0.4, w * 2.6, h * 0.7, "210,70,255", 0.35 * a); ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = a;
    var tx = x + lean * h, g = ctx.createLinearGradient(x - w, y, x + w, y - h);
    g.addColorStop(0, "#3c0d63"); g.addColorStop(0.4, "#b52cf0"); g.addColorStop(0.58, "#ff9cff"); g.addColorStop(0.72, "#e04dff"); g.addColorStop(1, "#7a1fc0");
    ctx.fillStyle = g; ctx.strokeStyle = "rgba(40,10,70,0.85)"; ctx.lineWidth = Math.max(1, w * 0.12);
    ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x - w * 0.3, y - h * 0.62); ctx.lineTo(tx, y - h); ctx.lineTo(x + w * 0.45, y - h * 0.5); ctx.lineTo(x + w, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = "rgba(255,190,255,0.22)";
    ctx.beginPath(); ctx.moveTo(x - w * 0.15, y); ctx.lineTo(tx, y - h); ctx.lineTo(x + w * 0.25, y - h * 0.45); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function draw(ctx, q, x0, x1, gy, scale) {
    if (!(q >= 0 && q < LEN)) return;
    var S = scale / 0.34, dir = x1 < x0 ? -1 : 1, D = Math.abs(x1 - x0);
    var ease = function (u) { return 1 - Math.pow(1 - u, 1.6); };
    var front = D * ease(Math.min(1, q / TRAVEL)), fx = x0 + dir * front;
    var fade = 1 - sm(LEN - 0.6, LEN, q);
    var step = 26 * S, n = Math.ceil(D / step);

    ctx.save(); ctx.globalCompositeOperation = "lighter";
    /* glowing crack along the floor, brightest just behind the front, cooling behind it */
    for (var i = 0; i <= n; i++) {
      var d = i * step; if (d > front) break;
      var age = (q - TRAVEL * (1 - Math.pow(1 - d / D, 1 / 1.6))), heat = Math.max(0, 1 - age / 0.9) * fade;
      var jx = x0 + dir * d, jy = gy + (hash(i) - 0.5) * 5 * S;
      glow(ctx, jx, jy, 30 * S, 7 * S, "190,80,255", 0.55 * heat + 0.12 * fade);
    }
    ctx.strokeStyle = "rgba(255,200,255," + (0.85 * fade) + ")"; ctx.lineWidth = 2.2 * S; ctx.lineJoin = "round"; ctx.beginPath();
    for (var k = 0; k <= 2 * n + 2; k++) { var dk = Math.min(k * step * 0.5, front); var kx = x0 + dir * dk, ky = gy + (hash(k + 50) - 0.5) * 6 * S; if (k === 0) ctx.moveTo(kx, ky); else ctx.lineTo(kx, ky); if (dk >= front) break; }
    ctx.stroke();
    /* the travelling front: a hot surge of light */
    if (q < TRAVEL + 0.1) { var fa = (1 - sm(TRAVEL - 0.05, TRAVEL + 0.1, q)); glow(ctx, fx, gy - 6 * S, 70 * S, 34 * S, "200,90,255", 0.8 * fa); glow(ctx, fx, gy - 4 * S, 26 * S, 12 * S, "255,235,255", 0.9 * fa); }
    ctx.restore();

    /* crystal spikes erupt as the front passes, then sink back into the floor */
    for (var j = 1; j <= n; j++) {
      var dj = j * step - hash(j) * step * 0.5; if (dj > front || dj > D) continue;
      var tPass = TRAVEL * (1 - Math.pow(1 - dj / D, 1 / 1.6)), a2 = q - tPass;
      var up = sm(0, 0.12, a2) * (1 - sm(0.32, 0.7, a2));
      if (up <= 0) continue;
      var big = 0.6 + 0.4 * (1 - dj / D * 0.3) + hash(j + 9) * 0.35;
      spike(ctx, x0 + dir * dj, gy + 4 * S, (11 + 7 * hash(j + 3)) * S, (60 + 50 * hash(j + 5)) * S * big * up, dir * (0.15 + 0.25 * hash(j + 7)), Math.min(1, up * 3) * fade);
      if (hash(j + 11) > 0.5) spike(ctx, x0 + dir * (dj + step * 0.35), gy + 5 * S, 7 * S, (30 + 26 * hash(j + 13)) * S * up, -dir * 0.3, Math.min(1, up * 3) * fade);
    }

    /* sparks and dust thrown up behind the front */
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (var p = 0; p < 70; p++) {
      var dp = hash(p + 100) * D; if (dp > front) continue;
      var tp = TRAVEL * (1 - Math.pow(1 - dp / D, 1 / 1.6)), ap = q - tp, life = 0.55 + 0.4 * hash(p + 200);
      if (ap < 0 || ap > life) continue;
      var u = ap / life, vx = dir * (40 + 90 * hash(p + 300)) * S, vy = -(120 + 160 * hash(p + 400)) * S;
      var sx = x0 + dir * dp + vx * ap, sy = gy + vy * ap + 420 * S * ap * ap;
      var r = (2 + 2.5 * hash(p + 500)) * S * (1 - u);
      ctx.fillStyle = "rgba(255," + (180 + Math.round(60 * hash(p))) + ",255," + (0.9 * (1 - u) * fade) + ")"; ctx.beginPath(); ctx.arc(sx, sy, r, 0, 6.283); ctx.fill();
    }
    ctx.restore();
    ctx.save();
    for (var c = 0; c < 26; c++) {
      var dc = hash(c + 700) * D; if (dc > front) continue;
      var tc = TRAVEL * (1 - Math.pow(1 - dc / D, 1 / 1.6)), ac = q - tc; if (ac < 0 || ac > 1.1) continue;
      var uc = ac / 1.1, rr = (14 + 20 * hash(c + 800)) * S * (0.5 + uc);
      ctx.fillStyle = "rgba(70,50,110," + (0.35 * (1 - uc) * fade) + ")"; ctx.beginPath(); ctx.ellipse(x0 + dir * dc + dir * 18 * S * uc, gy - 8 * S - 30 * S * uc, rr, rr * 0.6, 0, 0, 6.283); ctx.fill();
    }
    ctx.restore();

    /* burst under the target when it arrives */
    var ba = q - TRAVEL; if (ba > 0 && ba < 0.8) {
      var bu = ba / 0.8; ctx.save(); ctx.globalCompositeOperation = "lighter";
      glow(ctx, x1, gy - 10 * S, (80 + 90 * bu) * S, (40 + 50 * bu) * S, "200,90,255", 0.85 * (1 - bu));
      glow(ctx, x1, gy - 6 * S, 34 * S, 16 * S, "255,240,255", 1 - sm(0, 0.35, ba)); ctx.restore();
      for (var b = 0; b < 5; b++) { var up2 = sm(0, 0.1, ba) * (1 - sm(0.3, 0.8, ba)); spike(ctx, x1 + (b - 2) * 16 * S + (hash(b + 60) - 0.5) * 8 * S, gy + 5 * S, (8 + 5 * hash(b + 61)) * S, (60 + 50 * hash(b + 62)) * S * up2 * (b === 2 ? 1.3 : 1), (b - 2) * 0.18, Math.min(1, up2 * 3)); }
    }
  }
  window.KAIJU_QUAKE = { draw: draw, TRAVEL: TRAVEL, LEN: LEN };
})();
