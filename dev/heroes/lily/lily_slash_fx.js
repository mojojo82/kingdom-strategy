/* Iron Lily skill - "ball of death" slash crescents, drawn in code (prototype, Nov 2026).
   Each crescent follows one REAL swing of her blade in the Atlas flurry clip (lily_flurryA_v1): the swing list below was measured
   from the clip (leading edge of the blade / trail, angle around her chest, per frame). Look aimed at the realistic slashes of
   Harley's reference (Shadow Hunter): white-hot leading edge, crimson glowing body, see-through streaky tail that breaks into wisps,
   additive light, sparks off the blade tip. Oversized on purpose (Harley).

   LILY_SLASH.draw(ctx, t, ox, oy, k)
     t  = clip time in frames (24 fps, same numbering as the clip / skill sheet)
     ox, oy = screen position of her chest centre (clip px 570, 510)
     k  = screen px per clip px (her on-screen size / clip size); mirror by passing a negative k
*/
(function () {
  var D2R = Math.PI / 180;
  /* [startFrame, endFrame, startAngle, endAngle, radius] - clip px, degrees (0 = right, 90 = down, clockwise = increasing) */
  var SWINGS_A = [
    [16, 21, -213, 5, 330], [22, 26, -201, -34, 320], [27, 30, -133, 7, 300], [31, 33, -107, -45, 310], [34, 37, -100, -36, 300],
    [38, 40, -116, -60, 320], [41, 44, -80, 2, 320], [45, 48, -107, -39, 310], [49, 52, -89, -35, 330], [53, 55, -76, -40, 330]
  ];
  /* lily_flurryC_v1 (no baked trails): 6 swings, alternating directions; chest at clip px 610, 505 */
  var SWINGS_C = [
    [5, 8, 149, -4, 330], [9, 12, -52, -216, 330], [14, 17, 167, 371, 340], [21, 25, 19, -191, 345], [31, 36, 177, 394, 345], [37, 38, 116, 165, 300]
  ];
  /* lily_flurryC2_v1 (faster, more chaotic, no baked trails): 8 swings; chest at clip px 610, 505 */
  var SWINGS_C2 = [
    [8, 11, 145, -34, 340], [12, 16, -55, -209, 340], [18, 21, -21, -135, 300], [22, 24, -60, 12, 380],
    [25, 29, -24, -194, 340], [31, 36, -30, -180, 320], [37, 39, 45, 5, 380], [42, 45, -24, -180, 360]
  ];
  /* A-style reruns without the trail wording (lily_flurryA2_1 / _2), measured by dev/heroes/lily/measure_swings.py; chest 610, 506 */
  var SWINGS_A21 = [[3, 8, 161, -28, 320], [8, 11, -28, -195, 330], [12, 15, 1, -147, 270], [17, 23, 24, -190, 350], [26, 28, -70, -204, 260], [28, 31, -204, -385, 320], [31, 35, -385, -557, 340]];
  var SWINGS_A22 = [[3, 6, 156, -42, 340], [6, 10, -42, -216, 370], [12, 15, 150, 344, 340], [15, 16, 344, 382, 390], [18, 23, 7, -207, 350], [23, 26, -207, -410, 360],
    [26, 30, -410, -575, 380], [32, 35, -77, -205, 370], [38, 41, -35, 126, 270], [41, 45, 126, 322, 220]];
  /* 3-second flurries (lily_flurryL_1 / _2), measured by measure_swings.py; chest 610, 506 */
  var SWINGS_L1 = [[10, 12, 150, 298, 320], [13, 16, -97, -208, 440], [19, 20, -112, -190, 170], [21, 25, -140, 33, 400], [29, 34, -19, -219, 400], [36, 42, 0, -217, 330],
    [44, 48, 159, 359, 370], [52, 58, 12, -191, 320], [61, 63, -96, -147, 180], [64, 67, -73, 21, 430], [69, 74, 21, -198, 390], [76, 81, 170, 376, 370]];
  var SWINGS_L2 = [[19, 23, -171, 35, 290], [28, 32, 22, -192, 330], [38, 42, 165, 383, 350], [46, 51, 11, -203, 320], [57, 60, 158, 345, 370], [60, 63, 345, 529, 280],
    [63, 67, 529, 727, 330], [67, 69, 727, 780, 250], [72, 75, 5, -182, 340], [75, 76, -182, -218, 290], [80, 81, -104, -185, 160], [82, 85, -152, 11, 350]];
  var SWINGS = SWINGS_A;
  var OVER = 1.18;    /* oversize the measured radius */
  var WIDTH = 0.30;   /* max crescent thickness as a share of its radius */
  var FADE = 8;       /* frames a crescent lingers and dissolves after the swing ends */
  var MINTRAIL = 120; /* degrees: shortest trail behind the blade tip */

  function rnd(seed) { var s = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  function sm(a, b, x) { var u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); }
  function easeOut(x) { return 1 - Math.pow(1 - x, 2.2); }

  /* thickness profile along the crescent, s = 0 tail .. 1 blade tip */
  function prof(s) { return Math.pow(Math.max(0, s), 0.9) * Math.pow(Math.max(0, 1 - s), 0.22) * 1.55; }

  /* style: over = size vs her real swing, width = thickness, detach = how far the crescent sits out from her (x its radius),
     travel = how far it keeps flying outward while it dissolves. ATTACHED = round her (v1), DETACHED = separate flying crescents (A1). */
  var ATTACHED = { over: 1.18, width: 0.30, detach: 0, travel: 0 };
  var DETACHED = { over: 1.7, width: 0.34, detach: 0.42, travel: 0.35 };
  var FLAT = { flat: true, over: 1.18, width: 0.30, detach: 0, travel: 0 };
  var FLAT_DETACHED = { flat: true, over: 1.7, width: 0.30, detach: 0.42, travel: 0.35 };
  var PAINTED = { painted: true, over: 1.25, detach: 0, travel: 0 };
  var PAINTED_DETACHED = { painted: true, over: 1.7, detach: 0.42, travel: 0.35 };
  function slash(ctx, sw, idx, t, ox, oy, k, st) {
    st = st || ATTACHED;
    var f0 = sw[0], f1 = sw[1] + 1, end = f1 + FADE;
    if (t < f0 || t > end) return;
    var p = Math.min(1, (t - f0) / (f1 - f0)), fade = t > f1 ? (t - f1) / FADE : 0;
    var a0 = sw[2] * D2R, a1 = sw[3] * D2R, span = a1 - a0, dir = span < 0 ? -1 : 1;
    var head = a0 + span * easeOut(p) + (fade > 0 ? dir * 6 * D2R * easeOut(fade) : 0);
    var trail = Math.max(MINTRAIL * D2R, Math.abs(span) * 1.1) * (1 - 0.55 * sm(0, 1, fade)); /* tail catches up as it dissolves */
    var tail = head - dir * trail;
    var R = sw[4] * st.over * (1 + 0.07 * easeOut(fade)), W = R * st.width * (1 - 0.35 * fade);
    var mid = a0 + span * 0.5, off = R * (st.detach + st.travel * (0.35 * p + easeOut(fade)));
    var dx = -Math.cos(mid) * R + Math.cos(mid) * (R * 0.55 + off), dy = -Math.sin(mid) * R + Math.sin(mid) * (R * 0.55 + off);
    if (!st.detach) { dx = 0; dy = 0; }   /* detached: the arc's centre moves out along the swing, so the crescent floats free of her */
    var alpha = (t - f0 < 1 ? 0.6 : 1) * (1 - sm(0, 1, fade));
    var sy = 0.86, tilt = (rnd(idx + 3) - 0.5) * 0.25; /* slight ellipse + tilt so they don't look stamped */
    var N = 44, i, s, a, w, cos, sin;
    var outer = [], inner = [];
    for (i = 0; i <= N; i++) {
      s = i / N; a = tail + dir * trail * s; w = W * prof(s);
      outer.push([Math.cos(a) * R, Math.sin(a) * R]); inner.push([Math.cos(a) * (R - w), Math.sin(a) * (R - w)]);
    }
    ctx.save(); ctx.translate(ox, oy); ctx.scale(k, k * sy); ctx.translate(dx, dy); ctx.rotate(tilt);
    ctx.globalCompositeOperation = "lighter";

    function band(scaleOut, scaleIn, col, al, from) { /* filled crescent, inflated outwards / inwards */
      ctx.beginPath(); var j, st = Math.floor((from || 0) * N);
      for (j = st; j <= N; j++) { var o = outer[j], n = inner[j], mx = (o[0] + n[0]) / 2, my = (o[1] + n[1]) / 2;
        var px = mx + (o[0] - mx) * scaleOut, py = my + (o[1] - my) * scaleOut; if (j === st) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
      for (j = N; j >= st; j--) { var o2 = outer[j], n2 = inner[j], mx2 = (o2[0] + n2[0]) / 2, my2 = (o2[1] + n2[1]) / 2;
        ctx.lineTo(mx2 + (n2[0] - mx2) * scaleIn, my2 + (n2[1] - my2) * scaleIn); }
      ctx.closePath(); ctx.fillStyle = "rgba(" + col + "," + (al * alpha) + ")"; ctx.fill();
    }
    /* 1. bloom: wide, faint crimson light around the blade path */
    band(2.6, 2.2, "150,0,20", 0.10, 0.25); band(1.8, 1.6, "190,10,30", 0.14, 0.3);
    /* 2. body: per segment, deep red at the tail -> hot red near the tip (see-through) */
    for (i = 0; i < N; i++) {
      s = (i + 0.5) / N; var o = outer[i], n = inner[i], o1 = outer[i + 1], n1 = inner[i + 1];
      var al = sm(0.05, 0.75, s) * (0.55 + 0.35 * s), r = Math.round(150 + 105 * s), g = Math.round(8 + 70 * sm(0.6, 1, s)), b = Math.round(22 + 40 * sm(0.75, 1, s));
      ctx.beginPath(); ctx.moveTo(o[0], o[1]); ctx.lineTo(o1[0], o1[1]); ctx.lineTo(n1[0], n1[1]); ctx.lineTo(n[0], n[1]); ctx.closePath();
      ctx.fillStyle = "rgba(" + r + "," + g + "," + b + "," + (al * alpha * 0.85) + ")"; ctx.fill();
    }
    /* 3. motion streaks: thin arcs at different depths inside the crescent (the blur grain) */
    ctx.lineCap = "round";
    for (i = 0; i < 9; i++) {
      var d = rnd(idx * 31 + i), s0 = 0.15 + 0.5 * rnd(idx * 17 + i), s1 = Math.min(1, s0 + 0.25 + 0.4 * rnd(idx * 7 + i));
      ctx.beginPath();
      for (var q = 0; q <= 16; q++) { s = s0 + (s1 - s0) * q / 16; a = tail + dir * trail * s; w = W * prof(s); var rr = R - w * (0.08 + 0.84 * d);
        if (q === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.strokeStyle = "rgba(255," + Math.round(120 + 100 * d) + "," + Math.round(110 + 90 * d) + "," + ((0.18 + 0.3 * rnd(idx + i * 5)) * alpha) + ")";
      ctx.lineWidth = (1.2 + 2.6 * rnd(idx * 3 + i)) * (R / 330); ctx.stroke();
    }
    /* 4. white-hot leading edge along the outer rim, brightest at the tip */
    for (var e = 0; e < 2; e++) {
      ctx.beginPath(); var from = e ? 0.55 : 0.3;
      for (i = Math.floor(from * N); i <= N; i++) { var oo = outer[i]; if (i === Math.floor(from * N)) ctx.moveTo(oo[0], oo[1]); else ctx.lineTo(oo[0], oo[1]); }
      ctx.strokeStyle = e ? "rgba(255,245,240," + (0.85 * alpha) + ")" : "rgba(255,120,110," + (0.5 * alpha) + ")";
      ctx.lineWidth = (e ? 3.2 : 9) * (R / 330); ctx.stroke();
    }
    /* 5. tip flare while the blade is moving */
    if (fade < 0.4) {
      var hx = Math.cos(head) * (R - W * 0.15), hy = Math.sin(head) * (R - W * 0.15), fr = W * 1.1 * (1 - fade * 2);
      var gr = ctx.createRadialGradient(hx, hy, 0, hx, hy, fr);
      gr.addColorStop(0, "rgba(255,240,235," + (0.75 * alpha) + ")"); gr.addColorStop(0.25, "rgba(255,80,70," + (0.45 * alpha) + ")"); gr.addColorStop(1, "rgba(160,0,20,0)");
      ctx.fillStyle = gr; ctx.fillRect(hx - fr, hy - fr, fr * 2, fr * 2);
    }
    /* 6. sparks flung off the tip along the swing direction */
    for (i = 0; i < 7; i++) {
      var born = f0 + (f1 - f0) * rnd(idx * 13 + i), age = t - born; if (age < 0 || age > 7) continue;
      var ab = a0 + span * easeOut(Math.min(1, (born - f0) / (f1 - f0))), sp = (9 + 14 * rnd(idx * 5 + i)) * (R / 330);
      var bx = Math.cos(ab) * R, by = Math.sin(ab) * R, tx = -Math.sin(ab) * dir, ty = Math.cos(ab) * dir, ox2 = Math.cos(ab), oy2 = Math.sin(ab);
      var vx = (tx * 0.8 + ox2 * (0.3 + 0.5 * rnd(i + idx))) * sp, vy = (ty * 0.8 + oy2 * (0.3 + 0.5 * rnd(i + idx))) * sp;
      var x = bx + vx * age, y = by + vy * age + 1.2 * age * age * (R / 330), l = 2.2;
      ctx.beginPath(); ctx.moveTo(x - vx * l * 0.3, y - vy * l * 0.3); ctx.lineTo(x, y);
      ctx.strokeStyle = "rgba(255,225,200," + ((1 - age / 7) * 0.9) + ")"; ctx.lineWidth = 2.2 * (R / 330); ctx.stroke();
    }
    ctx.restore();
    /* 7. wisps: dark-red smoke left behind by the tail as it dissolves (normal blending, drawn after) */
    if (fade > 0) {
      ctx.save(); ctx.translate(ox, oy); ctx.scale(k, k * sy); ctx.translate(dx, dy); ctx.rotate(tilt);
      for (i = 0; i < 6; i++) {
        s = 0.1 + 0.6 * rnd(idx * 41 + i); a = tail + dir * trail * s; var rr2 = R - W * prof(s) * 0.5 + 18 * fade * (R / 330);
        var wx = Math.cos(a) * rr2, wy = Math.sin(a) * rr2, wr = (16 + 22 * rnd(idx + i * 9)) * (R / 330) * (0.6 + fade);
        var g2 = ctx.createRadialGradient(wx, wy, 0, wx, wy, wr);
        g2.addColorStop(0, "rgba(90,10,20," + (0.22 * (1 - fade)) + ")"); g2.addColorStop(1, "rgba(60,0,10,0)");
        ctx.fillStyle = g2; ctx.fillRect(wx - wr, wy - wr, wr * 2, wr * 2);
      }
      ctx.restore();
    }
  }


  /* FLAT look (Harley 15 Nov: "more 2D, flat colour, hand drawn, no glowing" - like the painted crescents in his reference):
     normal blending only, crisp edges, 2-3 flat reds, a thin sharp cutting edge, a dry-brush body that breaks into separate
     strips toward the tail, a dark smear behind it, and flat splatter drops flung off the tip. */
  /* anime crescent: sharp at BOTH tips, fullest about two thirds of the way to the blade tip */
  function profA(s) { s = Math.max(0, Math.min(1, s)); return Math.pow(s, 1.1) * Math.pow(1 - s, 0.42) * 2.25; }
  function slashFlat(ctx, sw, idx, t, ox, oy, k, st) {
    var f0 = sw[0], f1 = sw[1] + 1, end = f1 + FADE;
    if (t < f0 || t > end) return;
    var p = Math.min(1, (t - f0) / (f1 - f0)), fade = t > f1 ? (t - f1) / FADE : 0;
    var a0 = sw[2] * D2R, a1 = sw[3] * D2R, span = a1 - a0, dir = span < 0 ? -1 : 1;
    /* every slash its own character: thickness, length, curvature, roughness */
    var wf = 0.6 + 0.8 * rnd(idx * 19 + 1), lf = 0.85 + 0.45 * rnd(idx * 23 + 2), curv = (rnd(idx * 29 + 3) - 0.5) * 0.5, rough = 0.6 + 0.8 * rnd(idx * 31 + 4);
    var head = a0 + span * easeOut(p) + (fade > 0 ? dir * 5 * D2R * easeOut(fade) : 0);
    var trail = Math.max(MINTRAIL * D2R, Math.abs(span) * 1.1) * lf * (1 - 0.6 * sm(0, 1, fade));
    var tail = head - dir * trail;
    var R = sw[4] * st.over * (1 + 0.05 * easeOut(fade)), W = R * st.width * wf;
    var mid = a0 + span * 0.5, off = R * (st.detach + st.travel * (0.35 * p + easeOut(fade)));
    var dx = st.detach ? Math.cos(mid) * (off - R * 0.45) : 0, dy = st.detach ? Math.sin(mid) * (off - R * 0.45) : 0;
    var A = 1 - sm(0.35, 1, fade), sy = 0.86, tilt = (rnd(idx + 3) - 0.5) * 0.3, N = 56, i;
    var ph = [rnd(idx * 3 + 7) * 6.28, rnd(idx * 5 + 9) * 6.28, rnd(idx * 7 + 11) * 6.28];
    function ang(u) { return tail + dir * trail * u; }
    function rad(u) { return R * (1 + curv * (u - 0.6)); }                       /* not a perfect circle */
    function noise(u, depth) {                                                     /* bumpy, hand-cut edge; rougher on the inside */
      var n = Math.sin(u * 17 + ph[0] + depth * 3) * 0.5 + Math.sin(u * 39 + ph[1] - depth * 5) * 0.3 + Math.sin(u * 83 + ph[2]) * 0.2;
      return n * W * 0.09 * rough * (0.35 + depth);
    }
    function strip(sa, sb, r0, r1, col, al) {        /* rough crescent strip between depths r0..r1 (0 = outer rim, 1 = inner edge) */
      if (sb <= sa) return;
      ctx.beginPath();
      for (var j = 0; j <= N; j++) { var u = sa + (sb - sa) * j / N, w = W * profA(u), rr = rad(u) - w * r0 + noise(u, r0), aa = ang(u); if (j === 0) ctx.moveTo(Math.cos(aa) * rr, Math.sin(aa) * rr); else ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); }
      for (var j2 = N; j2 >= 0; j2--) { var u2 = sa + (sb - sa) * j2 / N, w2 = W * profA(u2), rr2 = rad(u2) - w2 * r1 + noise(u2, r1), aa2 = ang(u2); ctx.lineTo(Math.cos(aa2) * rr2, Math.sin(aa2) * rr2); }
      ctx.closePath(); ctx.fillStyle = "rgba(" + col + "," + (al * A) + ")"; ctx.fill();
    }
    ctx.save(); ctx.translate(ox, oy); ctx.scale(k, k * sy); ctx.translate(dx, dy); ctx.rotate(tilt);
    ctx.globalCompositeOperation = "source-over";
    /* smear: dark, see-through brushed shadow inside the crescent */
    strip(0.04, 0.9, 0.5, 1.4, "60,8,16", 0.26);
    /* body in pieces: one or two nicks / gaps break it up */
    var gap1 = 0.38 + 0.25 * rnd(idx * 37), gw = 0.015 + 0.03 * rnd(idx * 41);
    strip(0.2, gap1, 0.06, 1.0, "128,12,24", 0.92); strip(gap1 + gw, 1, 0.06, 1.0, "128,12,24", 0.92);
    strip(0.32, gap1 - 0.01, 0.05, 0.52 + 0.15 * rnd(idx), "196,24,36", 0.95); strip(gap1 + gw, 1, 0.05, 0.58, "196,24,36", 0.95);
    /* frayed tail: the back end splits into bristles of different lengths with gaps between them */
    var nb = 4 + Math.floor(3 * rnd(idx * 43));
    for (i = 0; i < nb; i++) {
      var d0 = 0.1 + 0.85 * i / nb, sa2 = 0.03 + 0.18 * rnd(idx * 11 + i), sb2 = 0.22 + 0.3 * rnd(idx * 7 + i);
      strip(sa2, sb2, d0, d0 + 0.5 / nb, i % 2 ? "150,16,28" : "100,10,20", 0.85 + 0.15 * rnd(i));
    }
    /* uneven white core along the cutting edge */
    var c0 = 0.3 + 0.2 * rnd(idx * 47), c1 = 0.93 + 0.07 * rnd(idx * 53);
    strip(c0, c1, 0, 0.22 + 0.15 * rnd(idx * 59), "255,236,230", 0.97);
    strip(c0 + 0.15, Math.min(1, c1 + 0.04), 0, 0.09 + 0.06 * rnd(idx * 61), "255,255,255", 1);
    /* splatter: flat drops of different sizes thrown off the tip */
    for (i = 0; i < 11; i++) {
      var born = f0 + (f1 - f0) * rnd(idx * 13 + i), age = t - born; if (age < 0 || age > 9) continue;
      var ab = a0 + span * easeOut(Math.min(1, (born - f0) / (f1 - f0))), sp = (8 + 15 * rnd(idx * 5 + i)) * (R / 330);
      var tx = -Math.sin(ab) * dir, ty = Math.cos(ab) * dir, ux = Math.cos(ab), uy = Math.sin(ab), mix = 0.3 + 0.6 * rnd(i + idx);
      var vx = (tx * 0.75 + ux * mix) * sp, vy = (ty * 0.75 + uy * mix) * sp;
      var x = Math.cos(ab) * R + vx * age, y = Math.sin(ab) * R + vy * age + 1.3 * age * age * (R / 330);
      var sz = (2 + 8 * Math.pow(rnd(idx * 3 + i), 2)) * (R / 330) * (1 - age / 12), ro = Math.atan2(vy + 2.6 * age * (R / 330), vx);
      ctx.save(); ctx.translate(x, y); ctx.rotate(ro); ctx.beginPath(); ctx.ellipse(0, 0, sz * (1.4 + rnd(i) * 1.4), sz * 0.7, 0, 0, 6.283);
      ctx.fillStyle = (i % 3 ? "rgba(150,14,26," : "rgba(70,6,14,") + (1 - age / 9) + ")"; ctx.fill(); ctx.restore();
    }
    ctx.restore();
  }

  /* PAINTED look (Harley 15 Nov: "get GPT to draw the slashes"): hand-drawn anime slash sprites (ChatGPT sheet, cut + measured by
     dev/heroes/lily/cut_slashes.py -> slashes.json: arc centre cx,cy, radius r, start angle a0, span, tipAtEnd). Each real swing gets
     the painted slash whose length is closest; its tip is lined up with where her blade ends, it is drawn in from tail to tip as the
     blade moves (angular wipe), then fades. Sprites with a bad arc fit (hooks) are left out via USE. */
  var USE = [0, 1, 2, 3, 5, 6];
  function pickSprite(sw, idx, sprites) {
    var span = Math.abs(sw[3] - sw[2]), best = -1, bd = 1e9;
    for (var j = 0; j < USE.length; j++) { var m = sprites[USE[j]] && sprites[USE[j]].meta; if (!m) continue;
      var d = Math.abs(m.span - span) + 40 * rnd(idx * 17 + j); if (d < bd) { bd = d; best = USE[j]; } }   /* a little variety */
    return sprites[best];
  }
  function slashSprite(ctx, sw, idx, t, ox, oy, k, st, sprites) {
    var f0 = sw[0], f1 = sw[1] + 1, end = f1 + FADE;
    if (t < f0 || t > end) return;
    var spr = pickSprite(sw, idx, sprites); if (!spr || !spr.img.complete) return;
    var m = spr.meta, p = Math.min(1, (t - f0) / (f1 - f0)), fade = t > f1 ? (t - f1) / FADE : 0;
    var a0 = sw[2] * D2R, a1 = sw[3] * D2R, span = a1 - a0, dir = span < 0 ? -1 : 1;
    var sdir = m.tipAtEnd ? 1 : -1, tipA = (m.tipAtEnd ? m.a0 + m.span : m.a0) * D2R, sspan = m.span * D2R;
    var flip = sdir !== dir; if (flip) tipA = -tipA;                         /* mirror the art so it sweeps the same way as her blade */
    var endA = a1 + dir * 8 * D2R;                                            /* tip lands a touch past where the blade stops */
    var rot = endA - tipA;
    var Rt = sw[4] * st.over * (1 + 0.08 * easeOut(fade)), sc = Rt / m.r;
    var mid = a0 + span * 0.5, off = Rt * (st.detach + st.travel * (0.35 * p + easeOut(fade)));
    var dx = st.detach ? Math.cos(mid) * (off - Rt * 0.45) : 0, dy = st.detach ? Math.sin(mid) * (off - Rt * 0.45) : 0;
    var A = 1 - sm(0.3, 1, fade), rev = easeOut(p);
    var tailA = endA - dir * sspan, headA = tailA + dir * sspan * rev;       /* revealed part: tail .. current head */
    ctx.save(); ctx.translate(ox, oy); ctx.scale(k, k * 0.9); ctx.translate(dx, dy);
    ctx.globalAlpha = A;
    if (rev < 0.999) {                                                         /* angular wipe (wedge from the tail to the head) */
      var big = Rt * 3, n = 24; ctx.beginPath(); ctx.moveTo(0, 0);
      for (var j = 0; j <= n; j++) { var aa = tailA - dir * 0.15 + (headA - tailA + dir * 0.15) * j / n; ctx.lineTo(Math.cos(aa) * big, Math.sin(aa) * big); }
      ctx.closePath(); ctx.clip();
    }
    ctx.rotate(rot); ctx.scale(sc, flip ? -sc : sc);
    ctx.drawImage(spr.img, -m.cx, -m.cy);
    ctx.restore();
  }
  /* seed: shifts which painted slash / tilt each swing gets (used when the flurry is replayed, so the 2nd pass looks different) */
  function draw(ctx, t, ox, oy, k, swings, st, seed) { swings = swings || SWINGS; seed = seed || 0; for (var i = 0; i < swings.length; i++) { if (st && st.painted) slashSprite(ctx, swings[i], i + seed, t, ox, oy, k, st, st.sprites || api.sprites); else (st && st.flat ? slashFlat : slash)(ctx, swings[i], i + seed, t, ox, oy, k, st); } }
  var api = { draw: draw, SWINGS: SWINGS, SWINGS_A: SWINGS_A, SWINGS_C: SWINGS_C, CHEST_A: [570, 510], CHEST_C: [610, 505], SWINGS_C2: SWINGS_C2, CHEST_C2: [610, 505], SWINGS_A21: SWINGS_A21, CHEST_A21: [610, 506], SWINGS_A22: SWINGS_A22, CHEST_A22: [610, 506], SWINGS_L1: SWINGS_L1, CHEST_L1: [610, 506], SWINGS_L2: SWINGS_L2, CHEST_L2: [610, 506], ATTACHED: ATTACHED, DETACHED: DETACHED, FLAT: FLAT, FLAT_DETACHED: FLAT_DETACHED, PAINTED: PAINTED, PAINTED_DETACHED: PAINTED_DETACHED, sprites: [] };
  if (typeof window !== "undefined") window.LILY_SLASH = api;
  if (typeof module !== "undefined") module.exports = api;
})();
