/* Kaiju mesh-warp rig (prototype). The approved painting is drawn through a deforming triangle mesh every frame: breathing, head and jaw
   rotation, arm sway, a travelling tail wave, plus additive glows (spines, reactor core, mouth) and a code beam. Source px = keyed image (1415x949).
   kaijuPose(t, mode, mt) -> pose params; kaijuDraw(ctx, imgs, x, feetY, scale, pose). */
(function () {
  var W = 1415, H = 949, GX = 30, GY = 20;
  var P = { neck: [300, 310], hinge: [190, 246], core: [520, 322], mouth: [70, 262], shN: [450, 455], shF: [245, 450], tail0: 770, tipX: 1400 };
  function sm(e0, e1, x) { var t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); }
  function rot(x, y, cx, cy, a) { var c = Math.cos(a), s = Math.sin(a), dx = x - cx, dy = y - cy; return [cx + dx * c - dy * s, cy + dx * s + dy * c]; }
  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function key(t, ks) { /* ks = [[time, value], ...] eased between */ if (t <= ks[0][0]) return ks[0][1]; for (var i = 1; i < ks.length; i++) if (t <= ks[i][0]) { var a = ks[i - 1], b = ks[i], u = ease((t - a[0]) / (b[0] - a[0])); return a[1] + (b[1] - a[1]) * u; } return ks[ks.length - 1][1]; }
  var BLAST = 2.8; /* seconds */
  function pose(t, mode, mt) {
    var br = Math.sin(t * 2 * Math.PI / 3.2), p = { breath: br, head: 0.018 * Math.sin(t * 2 * Math.PI / 3.2 - 0.6), jaw: 0.03 + 0.03 * (0.5 + 0.5 * Math.sin(t * 2 * Math.PI / 3.2 - 1.0)),
      tailA: 1, tailT: t, arm: Math.sin(t * 2 * Math.PI / 3.2 - 0.3), spine: 0.08 + 0.14 * (0.5 + 0.5 * Math.sin(t * 2 * Math.PI / 2.4)), cascade: -1, core: 0.35 + 0.25 * (0.5 + 0.5 * Math.sin(t * 2 * Math.PI / 1.6)), mouth: 0, beam: 0, bodyX: 0, bodyY: 0 };
    if (mode === "blast") {
      var u = mt;
      p.head += key(u, [[0, 0], [0.35, -0.10], [0.85, -0.13], [1.05, 0.07], [1.15, 0.09], [1.9, 0.08], [2.4, 0], [BLAST, 0]]);
      p.jaw += key(u, [[0, 0], [0.8, 0.06], [1.0, 0.42], [1.9, 0.42], [2.3, 0.03], [BLAST, 0]]);
      p.bodyX = key(u, [[0, 0], [0.85, 10], [1.1, -8], [1.9, -4], [2.5, 0], [BLAST, 0]]);
      p.cascade = u < 1.2 ? u / 0.95 : -1; /* spines light tail -> head */
      p.spine += key(u, [[0, 0], [0.9, 0.55], [1.9, 0.6], [2.5, 0], [BLAST, 0]]);
      p.core += key(u, [[0, 0], [0.9, 0.6], [1.9, 0.7], [2.5, 0], [BLAST, 0]]);
      p.mouth = key(u, [[0, 0], [0.55, 0], [1.0, 1], [1.9, 1], [2.2, 0], [BLAST, 0]]);
      p.beam = u > 1.02 && u < 2.0 ? Math.min(1, (u - 1.02) / 0.08) * Math.min(1, (2.0 - u) / 0.15) : 0;
      p.tailA = 1 + key(u, [[0, 0], [0.9, 0.8], [1.9, 0.6], [2.5, 0], [BLAST, 0]]);
    }
    return p;
  }
  function warp(x, y, p) { /* source px -> deformed source px */
    var still = 1 - sm(690, 830, y), X = x, Y = y;
    /* tail: travelling wave, amplitude grows to the tip */
    if (x > P.tail0) { var u = (x - P.tail0) / (P.tipX - P.tail0), A = 16 * p.tailA * Math.pow(u, 1.5); Y += A * Math.sin(p.tailT * 2 * Math.PI / 2.6 - u * 3.2) * still * 0 + A * Math.sin(p.tailT * 2 * Math.PI / 2.6 - u * 3.2); X += -3 * u * Math.sin(p.tailT * 2 * Math.PI / 2.6 - u * 3.2 + 1); }
    /* far arm, near arm: small sway about the shoulder */
    var wa = sm(260, 330, y) * (1 - sm(600, 640, y));
    var wN = (1 - sm(470, 500, x)) * sm(300, 330, x) * sm(420, 450, y) * wa; if (wN > 0) { var q = rot(X, Y, P.shN[0], P.shN[1], 0.025 * p.arm * wN); X = q[0]; Y = q[1]; }
    var wF = (1 - sm(230, 270, x)) * sm(380, 420, y) * wa; if (wF > 0) { var q2 = rot(X, Y, P.shF[0], P.shF[1], 0.03 * p.arm * wF); X = q2[0]; Y = q2[1]; }
    /* jaw: lower jaw below the hinge line */
    var wj = sm(236, 258, y) * (1 - sm(195, 240, x)) * (1 - sm(350, 380, y)); if (wj > 0) { var qj = rot(X, Y, P.hinge[0], P.hinge[1], -p.jaw * wj); X = qj[0]; Y = qj[1]; }
    /* head + neck: rotate about the neck */
    var wh = (1 - sm(230, 380, x)) * (1 - sm(380, 470, y)); if (wh > 0) { var qh = rot(X, Y, P.neck[0], P.neck[1], -p.head * wh); X = qh[0]; Y = qh[1]; }
    /* breathing: upper body rises and swells a little; whole upper body shifts with bodyX */
    var up = still * (1 - y / 800); Y += -5 * (0.5 + 0.5 * p.breath) * Math.max(0, up); X += (x - 520) * 0.008 * (0.5 + 0.5 * p.breath) * Math.max(0, up) * 0.6;
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
  window.KAIJU = { BLAST: BLAST, W: W, H: H, pose: pose,
    draw: function (ctx, imgs, x, feetY, scale, p, beamToX) { /* x = left edge of the picture, feetY = the floor line */
      var T = { x: x, y: feetY - 940 * scale, s: scale };
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
      if (p.beam > 0) { var m2 = map(P.mouth[0] - 10, P.mouth[1] + 10), bx = beamToX == null ? 0 : beamToX, th = (58 + 8 * Math.sin(performance.now() / 40)) * scale * p.beam;
        var gr = ctx.createLinearGradient(0, m2[1] - th, 0, m2[1] + th); gr.addColorStop(0, "rgba(180,60,255,0)"); gr.addColorStop(0.3, "rgba(200,90,255,0.75)"); gr.addColorStop(0.5, "rgba(255,240,255,1)"); gr.addColorStop(0.7, "rgba(200,90,255,0.75)"); gr.addColorStop(1, "rgba(180,60,255,0)");
        ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(m2[0], m2[1] - th * 0.45); ctx.lineTo(bx, m2[1] - th); ctx.lineTo(bx, m2[1] + th); ctx.lineTo(m2[0], m2[1] + th * 0.45); ctx.closePath(); ctx.fill();
        glowAt(ctx, bx + 10, m2[1], 120 * scale * p.beam, "230,150,255", 0.9 * p.beam); glowAt(ctx, m2[0], m2[1], 70 * scale * p.beam, "255,230,255", p.beam); }
      ctx.restore();
    } };
})();
