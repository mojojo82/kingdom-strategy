/* Kaiju mesh-warp rig (prototype). The approved painting is drawn through a deforming triangle mesh every frame: breathing, head and jaw
   rotation, arm sway, a travelling tail wave, plus additive glows (spines, reactor core, mouth) and a code beam. Source px = keyed image (1415x949).
   kaijuPose(t, mode, mt) -> pose params; kaijuDraw(ctx, imgs, x, feetY, scale, pose). */
(function () {
  var W = 1415, H = 949, GX = 30, GY = 20;
  var P = { hip: [640, 700], neck: [300, 310], hinge: [190, 246], core: [520, 322], mouth: [42, 250], mouthBack: [170, 248], shN: [450, 455], shF: [245, 450], tail0: 770, tipX: 1400 };
  function sm(e0, e1, x) { var t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); }
  function rot(x, y, cx, cy, a) { var c = Math.cos(a), s = Math.sin(a), dx = x - cx, dy = y - cy; return [cx + dx * c - dy * s, cy + dx * s + dy * c]; }
  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function key(t, ks) { /* ks = [[time, value], ...] eased between */ if (t <= ks[0][0]) return ks[0][1]; for (var i = 1; i < ks.length; i++) if (t <= ks[i][0]) { var a = ks[i - 1], b = ks[i], u = ease((t - a[0]) / (b[0] - a[0])); return a[1] + (b[1] - a[1]) * u; } return ks[ks.length - 1][1]; }
  var BLAST = 2.8, STOMP = 2.1; /* seconds */
  function pose(t, mode, mt) {
    var C = 2 * Math.PI / 3.0, br = Math.sin(t * C), p = { breath: br, lean: 0.022 * Math.sin(t * C) + 0.006 * Math.sin(t * C * 2.3 + 1),
      head: 0.055 * Math.sin(t * C - 0.9) + 0.015 * Math.sin(t * C * 2.7), jaw: 0.05 + 0.07 * (0.5 + 0.5 * Math.sin(t * C - 1.4)),
      tailA: 1.9, tailT: t, arm: Math.sin(t * C - 0.6), arm2: Math.sin(t * C - 1.2), knee: 0.5 + 0.5 * Math.sin(t * C), spine: 0.08 + 0.14 * (0.5 + 0.5 * Math.sin(t * 2 * Math.PI / 2.4)), cascade: -1, core: 0.35 + 0.25 * (0.5 + 0.5 * Math.sin(t * 2 * Math.PI / 1.6)), mouth: 0, beam: 0, bodyX: 0, bodyY: 0 };
    if (mode === "blast") {
      var u = mt;
      p.lean += key(u, [[0, 0], [0.45, -0.05], [0.9, -0.07], [1.06, 0.05], [1.2, 0.035], [1.9, 0.03], [2.45, 0], [BLAST, 0]]);
      p.knee += key(u, [[0, 0], [0.9, -0.6], [1.06, 1.2], [1.9, 0.8], [2.45, 0], [BLAST, 0]]);
      p.head += key(u, [[0, 0], [0.35, -0.15], [0.85, -0.2], [1.0, 0], [2.4, 0], [BLAST, 0]]) + (u > 1.05 && u < 1.95 ? 0.01 * Math.sin(u * 70) : 0);
      p.arm += key(u, [[0, 0], [0.9, -1.6], [1.06, 1.4], [1.9, 1.2], [2.45, 0], [BLAST, 0]]);
      p.jaw += key(u, [[0, 0], [0.8, 0.06], [1.0, 0.42], [1.9, 0.42], [2.3, 0.03], [BLAST, 0]]);
      p.bodyX = key(u, [[0, 0], [0.85, 10], [1.1, -8], [1.9, -4], [2.5, 0], [BLAST, 0]]);
      p.cascade = u < 1.2 ? u / 0.95 : -1; /* spines light tail -> head */
      p.spine += key(u, [[0, 0], [0.9, 0.55], [1.9, 0.6], [2.5, 0], [BLAST, 0]]);
      p.core += key(u, [[0, 0], [0.9, 0.6], [1.9, 0.7], [2.5, 0], [BLAST, 0]]);
      p.mouth = key(u, [[0, 0], [0.55, 0], [1.0, 1], [1.9, 1], [2.2, 0], [BLAST, 0]]);
      p.beam = u > 1.02 && u < 2.0 ? Math.min(1, (u - 1.02) / 0.08) * Math.min(1, (2.0 - u) / 0.15) : 0;
      p.tailA += key(u, [[0, 0], [0.9, 1.6], [1.3, 2.2], [1.9, 1.2], [2.5, 0], [BLAST, 0]]);
    }
    if (mode === "stomp") { /* the front (left) foot lifts, holds, slams down; weight shifts back then drops */
      var v = mt;
      p.lift = key(v, [[0, 0], [0.55, 110], [0.78, 118], [0.9, -3], [0.98, 0], [STOMP, 0]]);
      p.lean += key(v, [[0, 0], [0.55, -0.035], [0.78, -0.04], [0.9, 0.03], [1.3, 0.012], [STOMP, 0]]);
      p.knee += key(v, [[0, 0], [0.55, 0.6], [0.88, 0.6], [0.95, 2.2], [1.4, 0.6], [STOMP, 0]]);
      p.head += key(v, [[0, 0], [0.55, -0.06], [0.88, -0.07], [0.95, 0.07], [1.4, 0.01], [STOMP, 0]]);
      p.arm += key(v, [[0, 0], [0.55, -1.2], [0.9, 1.5], [1.4, 0.3], [STOMP, 0]]);
      p.tailA += key(v, [[0, 0], [0.9, 0.5], [1.1, 2.2], [1.6, 0.6], [STOMP, 0]]);
      p.impact = v > 0.88 && v < 1.6 ? 1 - (v - 0.88) / 0.72 : 0; /* flash + dust + shake */
      p.shake = v > 0.88 && v < 1.25 ? (1 - (v - 0.88) / 0.37) : 0;
    }
    return p;
  }
  function warp(x, y, p) { /* source px -> deformed source px */
    var still = 1 - sm(690, 830, y), X = x, Y = y;
    if (p.lift) { var wl2 = (1 - sm(400, 470, x)) * sm(520, 660, y); if (wl2 > 0) { var lf = p.lift * sm(560, 930, y) * wl2; Y -= lf; X += 0.18 * lf * (1 - sm(560, 930, y)) - 0.1 * lf; } } /* stomp leg */
    /* tail: travelling wave, amplitude grows to the tip */
    if (x > P.tail0) { var u = (x - P.tail0) / (P.tipX - P.tail0), A = 16 * p.tailA * Math.pow(u, 1.4), ph = p.tailT * 2 * Math.PI / 2.6 - u * 3.4; Y += A * Math.sin(ph) + A * 0.25 * Math.sin(ph * 2.1 + 0.7); X += -6 * u * Math.sin(ph + 1); }
    /* far arm, near arm: small sway about the shoulder */
    var wa = sm(260, 330, y) * (1 - sm(600, 640, y));
    var wN = (1 - sm(470, 500, x)) * sm(300, 330, x) * sm(420, 450, y) * wa; if (wN > 0) { var q = rot(X, Y, P.shN[0], P.shN[1], 0.07 * p.arm * wN); X = q[0]; Y = q[1]; }
    var wF = (1 - sm(230, 270, x)) * sm(380, 420, y) * wa; if (wF > 0) { var q2 = rot(X, Y, P.shF[0], P.shF[1], 0.08 * (p.arm2 == null ? p.arm : p.arm2) * wF); X = q2[0]; Y = q2[1]; }
    /* jaw: lower jaw below the hinge line */
    var wj = sm(236, 258, y) * (1 - sm(195, 240, x)) * (1 - sm(350, 380, y)); if (wj > 0) { var qj = rot(X, Y, P.hinge[0], P.hinge[1], -p.jaw * wj); X = qj[0]; Y = qj[1]; }
    /* head + neck: rotate about the neck */
    var wh = (1 - sm(230, 380, x)) * (1 - sm(380, 470, y)); if (wh > 0) { var qh = rot(X, Y, P.neck[0], P.neck[1], -(p.head + (p.aimHead || 0)) * wh); X = qh[0]; Y = qh[1]; }
    /* whole body leans from the hips; the legs bend (knees) so the feet stay put */
    var wl = 1 - sm(640, 800, y); if (wl > 0 && x < 1500) { var ql = rot(X, Y, P.hip[0], P.hip[1], -(p.lean || 0) * wl); X = ql[0]; Y = ql[1]; }
    var wk = sm(560, 700, y) * (1 - sm(760, 860, y)); Y += 7 * (p.knee || 0) * wk; Y += 7 * (p.knee || 0) * (1 - sm(560, 700, y)) * still;
    /* breathing: upper body rises and swells a little; whole upper body shifts with bodyX */
    var up = still * (1 - y / 800); Y += -9 * (0.5 + 0.5 * p.breath) * Math.max(0, up); X += (x - 520) * 0.008 * (0.5 + 0.5 * p.breath) * Math.max(0, up) * 0.6;
    X += p.bodyX * still * (1 - sm(700, 900, x)); Y += Math.abs(p.bodyX) * 0.25 * still * (1 - sm(700, 900, x));
    return [X, Y];
  }
  var mesh = null;
  function buildMesh() { var pts = []; for (var j = 0; j <= GY; j++) for (var i = 0; i <= GX; i++) pts.push([i * W / GX, j * H / GY]); return pts; }
  function tri(ctx, img, s0, s1, s2, d0, d1, d2) {
    /* affine map src triangle -> dst triangle, clipped to dst (grown 0.7 px so neighbours overlap - no hairline seams) */
    var cx = (d0[0] + d1[0] + d2[0]) / 3, cy = (d0[1] + d1[1] + d2[1]) / 3, g = function (p) { var dx = p[0] - cx, dy = p[1] - cy, l = Math.hypot(dx, dy) || 1; return [p[0] + dx / l * 0.7, p[1] + dy / l * 0.7]; };
    var e0 = g(d0), e1 = g(d1), e2 = g(d2);
    ctx.save(); ctx.beginPath(); ctx.moveTo(e0[0], e0[1]); ctx.lineTo(e1[0], e1[1]); ctx.lineTo(e2[0], e2[1]); ctx.closePath(); ctx.clip();
    var x0 = s0[0], y0 = s0[1], x1 = s1[0], y1 = s1[1], x2 = s2[0], y2 = s2[1], den = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    var a = ((d1[0] - d0[0]) * (y2 - y0) - (d2[0] - d0[0]) * (y1 - y0)) / den, c = ((d2[0] - d0[0]) * (x1 - x0) - (d1[0] - d0[0]) * (x2 - x0)) / den;
    var b = ((d1[1] - d0[1]) * (y2 - y0) - (d2[1] - d0[1]) * (y1 - y0)) / den, d = ((d2[1] - d0[1]) * (x1 - x0) - (d1[1] - d0[1]) * (x2 - x0)) / den;
    var e = d0[0] - a * x0 - c * y0, f = d0[1] - b * x0 - d * y0;
    ctx.transform(a, b, c, d, e, f); ctx.drawImage(img, 0, 0); ctx.restore();
  }
  function drawMesh(ctx, img, p, T) {
    if (!mesh) mesh = buildMesh(); var dp = mesh.map(function (q) { var w = warp(q[0], q[1], p); return [T.x + w[0] * T.s, T.y + w[1] * T.s]; });
    var sp = mesh.map(function (q) { return q; });
    for (var j = 0; j < GY; j++) for (var i = 0; i < GX; i++) { var k = j * (GX + 1) + i, k2 = k + 1, k3 = k + GX + 1, k4 = k3 + 1;
      tri(ctx, img, sp[k], sp[k2], sp[k3], dp[k], dp[k2], dp[k3]); tri(ctx, img, sp[k2], sp[k4], sp[k3], dp[k2], dp[k4], dp[k3]); }
    return function (x, y) { var w = warp(x, y, p); return [T.x + w[0] * T.s, T.y + w[1] * T.s]; };
  }
  function glowAt(ctx, x, y, r, col, a) { var g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, "rgba(" + col + "," + a + ")"); g.addColorStop(1, "rgba(" + col + ",0)"); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); }
  window.KAIJU = { BLAST: BLAST, STOMP: STOMP, W: W, H: H, pose: pose, P: P,
    mapPoint: function (sx, sy, p, x, feetY, scale) { var w = warp(sx, sy, p); return [x + w[0] * scale, feetY - 940 * scale + w[1] * scale]; },
    aim: function (p, x, feetY, scale, tgt, amount) { /* head angle so the mouth axis points at tgt (2 passes); amount 0..1 eases it in and out */
      p.aimHead = 0; for (var it = 0; it < 3; it++) { var m = this.mapPoint(P.mouth[0], P.mouth[1], p, x, feetY, scale), b = this.mapPoint(P.mouthBack[0], P.mouthBack[1], p, x, feetY, scale);
        var a0 = Math.atan2(m[1] - b[1], m[0] - b[0]), a1 = Math.atan2(tgt.y - m[1], tgt.x - m[0]), r = a1 - a0; while (r > Math.PI) r -= 2 * Math.PI; while (r < -Math.PI) r += 2 * Math.PI; p.aimHead += -r; }
      p.aimHead *= amount; },
    draw: function (ctx, imgs, x, feetY, scale, p, beamToX) { /* x = left edge of the picture, feetY = the floor line */
      var sh = p.shake ? p.shake * 7 * Math.sin(performance.now() / 18) : 0;
      var T = { x: x + sh * 0.4, y: feetY - 940 * scale + sh, s: scale };
      /* the glow is added into one flat texture first (no seams), then the texture is warped once */
      var tx = this._tx || (this._tx = document.createElement("canvas")); if (tx.width !== W) { tx.width = W; tx.height = H; } var tc = tx.getContext("2d");
      tc.globalCompositeOperation = "source-over"; tc.globalAlpha = 1; tc.clearRect(0, 0, W, H); tc.drawImage(imgs.body, 0, 0);
      tc.globalCompositeOperation = "lighter"; var sa = Math.min(1, p.spine);
      if (p.cascade >= 0) { tc.globalAlpha = sa * 0.45; tc.drawImage(imgs.glow, 0, 0); var wx = W - p.cascade * W; tc.save(); tc.beginPath(); tc.rect(wx - 160, 0, W, H); tc.clip(); tc.globalAlpha = 0.85; tc.drawImage(imgs.glow, 0, 0); tc.restore(); }
      else { tc.globalAlpha = sa; tc.drawImage(imgs.glow, 0, 0); }
      tc.globalCompositeOperation = "source-over"; tc.globalAlpha = 1;
      var map = drawMesh(ctx, tx, p, T);
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 1; var c = map(P.core[0], P.core[1]); glowAt(ctx, c[0], c[1], 90 * scale, "200,80,255", Math.min(1, p.core) * 0.9);
      if (p.mouth > 0) { var m = map(P.mouth[0], P.mouth[1] + 8); glowAt(ctx, m[0], m[1], (40 + 50 * p.mouth) * scale, "230,140,255", p.mouth); glowAt(ctx, m[0], m[1], 22 * scale * p.mouth, "255,255,255", p.mouth); }
      if (p.beam > 0) { var m2 = map(P.mouth[0], P.mouth[1]), tg = beamToX && beamToX.x != null ? beamToX : { x: beamToX || 0, y: m2[1] }, th = (58 + 8 * Math.sin(performance.now() / 40)) * scale * p.beam;
        var dx = tg.x - m2[0], dy = tg.y - m2[1], L = Math.hypot(dx, dy), an = Math.atan2(dy, dx);
        ctx.save(); ctx.translate(m2[0], m2[1]); ctx.rotate(an);
        var gr = ctx.createLinearGradient(0, -th, 0, th); gr.addColorStop(0, "rgba(180,60,255,0)"); gr.addColorStop(0.3, "rgba(200,90,255,0.75)"); gr.addColorStop(0.5, "rgba(255,240,255,1)"); gr.addColorStop(0.7, "rgba(200,90,255,0.75)"); gr.addColorStop(1, "rgba(180,60,255,0)");
        ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(0, -th * 0.45); ctx.lineTo(L, -th); ctx.lineTo(L, th); ctx.lineTo(0, th * 0.45); ctx.closePath(); ctx.fill(); ctx.restore();
        glowAt(ctx, tg.x, tg.y, 120 * scale * p.beam, "230,150,255", 0.9 * p.beam); glowAt(ctx, m2[0], m2[1], 70 * scale * p.beam, "255,230,255", p.beam); }
      if (p.impact > 0) { var fq = map(250, 925); glowAt(ctx, fq[0], fq[1], 170 * scale * (1.4 - p.impact * 0.4), "200,90,255", 0.85 * p.impact); glowAt(ctx, fq[0], fq[1], 60 * scale, "255,235,255", p.impact); }
      ctx.restore();
    } };
})();
