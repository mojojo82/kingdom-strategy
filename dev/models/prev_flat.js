// Preview a flat-colour model (npz -> json via prev_flat.py) at the map angle + side views, with or without a dark outline. node dev/models/prev_flat.js M.json OUT.png [W] [outline px]
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright"); const fs = require("fs");
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome", args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"] });
  const W = +(process.argv[4] || 360), OL = +(process.argv[5] || 0), views = JSON.parse(process.env.VIEWS || "[[45,1],[135,1],[225,1],[90,0]]");
  const p = await b.newPage({ viewport: { width: W * views.length, height: W } }); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.setContent('<body style="margin:0;background:#2f6a92"><div id="w" style="display:flex"></div></body>');
  const M = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
  await p.evaluate(({ M, W, OL, views }) => {
    const P = new Float32Array(M.pos), Cl = new Float32Array(P.length), N = new Float32Array(P.length), SN = new Float32Array(P.length), key = {};
    for (let f = 0; f < P.length / 9; f++) { const o = f * 9; const ax = P[o + 3] - P[o], ay = P[o + 4] - P[o + 1], az = P[o + 5] - P[o + 2], bx = P[o + 6] - P[o], by = P[o + 7] - P[o + 1], bz = P[o + 8] - P[o + 2]; let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx; const l = Math.hypot(nx, ny, nz) || 1;
      for (let j = 0; j < 3; j++) { N[o + j * 3] = nx / l; N[o + j * 3 + 1] = ny / l; N[o + j * 3 + 2] = nz / l; for (let k = 0; k < 3; k++) Cl[o + j * 3 + k] = M.col[f][k] / 255; const kk = [P[o + j * 3], P[o + j * 3 + 1], P[o + j * 3 + 2]].map((v) => v.toFixed(4)).join(","); (key[kk] = key[kk] || [0, 0, 0]); key[kk][0] += nx / l; key[kk][1] += ny / l; key[kk][2] += nz / l; } }
    for (let i = 0; i < P.length / 3; i++) { const kk = [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]].map((v) => v.toFixed(4)).join(","), s = key[kk], l = Math.hypot(s[0], s[1], s[2]) || 1; SN[i * 3] = s[0] / l; SN[i * 3 + 1] = s[1] / l; SN[i * 3 + 2] = s[2] / l; }
    for (const [az, mapAngle] of views) {
      const cv = document.createElement("canvas"); cv.width = W; cv.height = W; document.getElementById("w").appendChild(cv);
      const gl = cv.getContext("webgl", { antialias: true });
      const vs = "attribute vec3 p; attribute vec3 c; attribute vec3 n; attribute vec3 sn; uniform float ca, sa, el, ol; varying vec3 vc; varying vec3 vn; void main(){ vec3 w = vec3(p.x*ca + p.z*sa, p.y, -p.x*sa + p.z*ca); vn = vec3(n.x*ca + n.z*sa, n.y, -n.x*sa + n.z*ca); vc = c; vec3 s2 = vec3(sn.x*ca + sn.z*sa, sn.y, -sn.x*sa + sn.z*ca);" +
        "float sx, sy, d; if (el > 0.5) { sx = (w.x - w.z) * 0.70711; sy = (w.x + w.z) * 0.70711 * 0.57358 - w.y * 0.81915; d = (w.x + w.z) * 0.70711 * 0.81915 + w.y * 0.57358; } else { sx = w.x; sy = -w.y; d = w.z; }" +
        "vec2 sc = vec2(sx, -sy) * 0.85; if (ol > 0.0) { vec2 dir = el > 0.5 ? vec2((s2.x - s2.z) * 0.70711, -((s2.x + s2.z) * 0.70711 * 0.57358 - s2.y * 0.81915)) : vec2(s2.x, s2.y); float L = length(dir); if (L > 0.001) sc += dir / L * ol; d -= 0.002; }" +
        "gl_Position = vec4(sc, -d * 0.4, 1.0); }";
      const fs = "precision highp float; varying vec3 vc; varying vec3 vn; uniform float ol; void main(){ if (ol > 0.0) { gl_FragColor = vec4(0.07, 0.08, 0.13, 1.0); return; } vec3 n = normalize(vn); if (!gl_FrontFacing) n = -n; float d = max(dot(n, normalize(vec3(-0.35, 0.85, 0.45))), 0.0); vec3 col = vc * (0.62 + 0.55 * d); if (vc.b > 0.9 && vc.g > 0.85) col = vc; gl_FragColor = vec4(min(col, vec3(1.0)), 1.0); }";
      const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
      const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr); gl.useProgram(pr);
      const buf = (d, name) => { const o = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, o); gl.bufferData(gl.ARRAY_BUFFER, d, gl.STATIC_DRAW); const l = gl.getAttribLocation(pr, name); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 3, gl.FLOAT, false, 0, 0); };
      buf(P, "p"); buf(Cl, "c"); buf(N, "n"); buf(SN, "sn");
      const a = az * Math.PI / 180, U = (n) => gl.getUniformLocation(pr, n); gl.uniform1f(U("ca"), Math.cos(a)); gl.uniform1f(U("sa"), Math.sin(a)); gl.uniform1f(U("el"), mapAngle);
      gl.clearColor(0.18, 0.42, 0.57, 1); gl.enable(gl.DEPTH_TEST); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      if (OL > 0) { gl.enable(gl.CULL_FACE); gl.cullFace(gl.FRONT); gl.uniform1f(U("ol"), OL * 2 / W); gl.drawArrays(gl.TRIANGLES, 0, P.length / 3); gl.disable(gl.CULL_FACE); }
      gl.uniform1f(U("ol"), 0); gl.drawArrays(gl.TRIANGLES, 0, P.length / 3); window.__e = (window.__e || []).concat([gl.getError(), P.length, isNaN(SN[0]), N[0]]);
    }
    return window.__e;
  }, { M, W, OL, views }).then((e) => console.log(JSON.stringify(e)));
  await p.screenshot({ path: process.argv[3] }); if (errs.length) console.log(errs); await b.close();
})();
