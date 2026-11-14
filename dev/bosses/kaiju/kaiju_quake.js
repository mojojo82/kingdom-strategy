/* Kaiju stomp: creeping WATER blast (the boss level is dark, murky, shallow ocean). Drawn in code - smooth at any frame rate.
   KAIJU_QUAKE.draw(ctx, q, x0, x1, gy, scale)
     q  = seconds since the foot hit the water (0 .. LEN); nothing drawn outside that
     x0 = where the foot hit (screen px), x1 = target (ship hull) x, gy = water surface y, scale = kaiju scale.
   A surge of energy-charged water races along the surface from the foot to the ship: a foaming crest with a
   violet glow under it, splash columns that leap up behind it and fall back as spray, ripple rings, and a big
   geyser under the target when it arrives. */
(function () {
  var TRAVEL = 1.0, LEN = 2.3;
  function hash(i) { var s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  function sm(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function glow(ctx, x, y, rx, ry, col, a) {
    if (a <= 0 || rx <= 0 || ry <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx);
    var g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, "rgba(" + col + "," + a + ")"); g.addColorStop(1, "rgba(" + col + ",0)");
    ctx.fillStyle = g; ctx.fillRect(-rx, -rx, 2 * rx, 2 * rx); ctx.restore();
  }
  function passT(d, D) { return TRAVEL * (1 - Math.pow(1 - Math.min(1, d / D), 1 / 1.6)); } /* when the front reaches distance d */

  /* one splash column: a tapered sheet of water that shoots up, then collapses into falling drops */
  function column(ctx, x, y, w, h, age, life, seed, a) {
    if (age < 0 || age > life) return;
    var u = age / life, rise = sm(0, 0.28, u), fall = sm(0.35, 1, u);
    var hh = h * rise * (1 - 0.85 * fall); if (hh > 1) {
      var g = ctx.createLinearGradient(0, y, 0, y - hh);
      g.addColorStop(0, "rgba(25,65,75," + (0.6 * a) + ")"); g.addColorStop(0.45, "rgba(80,140,150," + (0.42 * a) + ")"); g.addColorStop(0.85, "rgba(200,235,240," + (0.35 * a) + ")"); g.addColorStop(1, "rgba(235,250,255," + (0.0) + ")");
      ctx.fillStyle = g; var lw = w * (1 + 0.6 * fall), top = w * 0.35 * (1 + fall);
      ctx.beginPath(); ctx.moveTo(x - lw, y); ctx.quadraticCurveTo(x - lw * 0.55, y - hh * 0.5, x - top, y - hh); ctx.quadraticCurveTo(x, y - hh * 1.08, x + top, y - hh); ctx.quadraticCurveTo(x + lw * 0.55, y - hh * 0.5, x + lw, y); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(225,245,250," + (0.55 * a * (1 - fall)) + ")"; ctx.lineWidth = Math.max(1, w * 0.12); ctx.beginPath(); ctx.moveTo(x - top * 0.6, y - hh * 0.92); ctx.quadraticCurveTo(x - lw * 0.3, y - hh * 0.45, x - lw * 0.7, y - 2); ctx.stroke();
    }
    /* mist: soft white puffs up the column and at its foot, so it reads as spray, not glass */
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (var m = 0; m < 5; m++) { var mr = hash(seed * 7 + m), my = y - hh * (0.15 + 0.8 * m / 4), mx = x + (mr - 0.5) * w * 1.2;
      glow(ctx, mx, my, w * (1.1 + 0.8 * mr) * (1 + fall), w * (1.0 + 0.6 * mr) * (1 + fall), "170,215,225", 0.22 * a * (1 - 0.7 * fall) * rise); }
    glow(ctx, x, y - 2, w * 3 * (0.6 + u), w * 0.8, "190,230,235", 0.35 * a * (1 - u)); ctx.restore();
    /* crown + falling drops (ballistic, so they arc out and rain back down) */
    var g2 = h * 4.2, nd = 26;
    for (var i = 0; i < nd; i++) {
      var r1 = hash(seed * 31 + i), r2 = hash(seed * 17 + i + 5), t0 = 0.12 * life + r1 * 0.1 * life, ta = age - t0; if (ta < 0) continue;
      var vy = -(Math.sqrt(2 * g2 * h) * (0.6 + 0.55 * r2)), vx = (r1 - 0.5) * w * 11;
      var dy = vy * ta + 0.5 * g2 * ta * ta; if (dy > 0) continue;
      var dx = x + vx * ta, py = y - h * 0.85 * rise + dy + h * 0.85 * rise;
      var rr = w * (0.06 + 0.12 * r2 * r2) * (1 - 0.4 * u);
      ctx.fillStyle = "rgba(" + (200 + 40 * r1 | 0) + ",240,250," + ((0.45 + 0.45 * r1) * a * (1 - 0.6 * u)) + ")";
      ctx.beginPath(); ctx.ellipse(dx, py, rr, rr * (1.1 + Math.min(1.6, Math.abs(vy + g2 * ta) / (g2 * 0.6))), 0, 0, 6.283); ctx.fill();
    }
  }

  function draw(ctx, q, x0, x1, gy, scale) {
    if (!(q >= 0 && q < LEN)) return;
    var S = scale / 0.34, dir = x1 < x0 ? -1 : 1, D = Math.abs(x1 - x0);
    var front = D * (1 - Math.pow(1 - Math.min(1, q / TRAVEL), 1.6)), fx = x0 + dir * front;
    var fade = 1 - sm(LEN - 0.6, LEN, q);

    /* ripple rings on the surface: one big set at the foot, smaller ones along the path */
    ctx.save(); ctx.lineCap = "round";
    for (var r = 0; r < 4; r++) {
      var ra = q - r * 0.13; if (ra < 0) continue;
      var rad = (30 + 260 * (1 - Math.exp(-ra * 1.6))) * S, al = Math.max(0, 1 - ra / 1.6) * 0.55 * fade;
      ctx.strokeStyle = "rgba(170,215,225," + al + ")"; ctx.lineWidth = 2.2 * S * (1 - ra / 2.2 + 0.2);
      ctx.beginPath(); ctx.ellipse(x0, gy + 3 * S, rad, rad * 0.11, 0, 0, 6.283); ctx.stroke();
    }
    var step = 34 * S, n = Math.ceil(D / step);
    for (var i = 1; i <= n; i++) {
      var d = i * step - hash(i) * step * 0.4; if (d > front) break;
      var ag = q - passT(d, D); if (ag < 0 || ag > 1.3) continue;
      var rr2 = (14 + 90 * (1 - Math.exp(-ag * 2))) * S;
      ctx.strokeStyle = "rgba(160,205,215," + (0.4 * (1 - ag / 1.3) * fade) + ")"; ctx.lineWidth = 1.6 * S;
      ctx.beginPath(); ctx.ellipse(x0 + dir * d, gy + 4 * S, rr2, rr2 * 0.1, 0, 0, 6.283); ctx.stroke();
    }
    ctx.restore();

    /* violet energy under the water, trailing the surge */
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (var e = 0; e <= n; e++) {
      var de = e * step; if (de > front) break;
      var heat = Math.max(0, 1 - (q - passT(de, D)) / 0.8) * fade;
      glow(ctx, x0 + dir * de, gy + 6 * S, 46 * S, 10 * S, "150,60,230", 0.45 * heat);
    }
    ctx.restore();

    /* splash columns behind the front */
    for (var j = 1; j <= n; j++) {
      var dj = j * step - hash(j + 20) * step * 0.6; if (dj > D * 0.97) continue;
      var tp = passT(dj, D), ac = q - tp; if (ac < 0) continue;
      var hgt = (55 + 55 * hash(j + 30)) * S * (0.85 + 0.25 * (1 - dj / D));
      column(ctx, x0 + dir * dj, gy + 4 * S, (10 + 6 * hash(j + 40)) * S, hgt, ac, 0.95 + 0.3 * hash(j + 50), j, fade);
    }

    /* the travelling crest: a foaming hump of water with light under it */
    if (q < TRAVEL + 0.15) {
      var fa = 1 - sm(TRAVEL - 0.05, TRAVEL + 0.15, q), ch = 26 * S * fa, cw = 70 * S;
      ctx.save(); ctx.globalCompositeOperation = "lighter"; glow(ctx, fx, gy, 80 * S, 26 * S, "160,80,255", 0.7 * fa); ctx.restore();
      var g = ctx.createLinearGradient(0, gy + 6 * S, 0, gy - ch);
      g.addColorStop(0, "rgba(15,45,55,0.9)"); g.addColorStop(0.6, "rgba(60,120,130,0.9)"); g.addColorStop(1, "rgba(220,245,250,0.95)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(fx - dir * cw * 1.6, gy + 6 * S);
      ctx.bezierCurveTo(fx - dir * cw * 0.8, gy + 2 * S, fx - dir * cw * 0.35, gy - ch, fx, gy - ch * 0.85);
      ctx.bezierCurveTo(fx + dir * cw * 0.15, gy - ch * 0.7, fx + dir * cw * 0.3, gy + 2 * S, fx + dir * cw * 0.45, gy + 6 * S); ctx.closePath(); ctx.fill();
      for (var f = 0; f < 18; f++) { /* foam spray thrown forward off the crest */
        var fr = hash(f + 900), ft = ((q * 2.2 + fr) % 1), px = fx - dir * cw * 0.2 + dir * (ft * 60 * S) + (hash(f + 901) - 0.5) * 20 * S, py = gy - ch * 0.8 - 40 * S * ft + 70 * S * ft * ft;
        ctx.fillStyle = "rgba(225,245,250," + (0.8 * (1 - ft) * fa) + ")"; ctx.beginPath(); ctx.arc(px, py, (1.5 + 2 * hash(f + 902)) * S, 0, 6.283); ctx.fill();
      }
    }

    /* geyser under the target */
    var ba = q - TRAVEL; if (ba > 0) {
      ctx.save(); ctx.globalCompositeOperation = "lighter"; glow(ctx, x1, gy, (90 + 80 * Math.min(1, ba)) * S, 30 * S, "160,80,255", 0.8 * Math.max(0, 1 - ba / 0.9) * fade); ctx.restore();
      column(ctx, x1, gy + 6 * S, 30 * S, 190 * S, ba, 1.25, 77, fade);
      column(ctx, x1 - 30 * S, gy + 6 * S, 16 * S, 110 * S, ba - 0.05, 1.05, 78, fade);
      column(ctx, x1 + 32 * S, gy + 6 * S, 16 * S, 120 * S, ba - 0.08, 1.05, 79, fade);
    }
  }
  window.KAIJU_QUAKE = { draw: draw, TRAVEL: TRAVEL, LEN: LEN };
})();
