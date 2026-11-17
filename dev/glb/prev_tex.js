// Preview a textured march model (npz -> json from prev_tex.py) at a few angles, headless WebGL. node dev/glb/prev_tex.js MODEL.json TEX.png OUT.png [size]
const { chromium } = require(process.env.PW_PATH || "/opt/npm-tools/node_modules/playwright"); const fs = require("fs");
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome", args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"] });
  const W = +(process.argv[5] || 420), p = await b.newPage({ viewport: { width: W * 3, height: W }, deviceScaleFactor: 1 }); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.setContent('<body style="margin:0;background:#2f6a92"><div id="w" style="display:flex"></div></body>');
  const M = JSON.parse(fs.readFileSync(process.argv[2], "utf8")), tex = "data:image/png;base64," + fs.readFileSync(process.argv[3]).toString("base64");
  await p.evaluate(async ({ M, tex, W, process_nearest }) => {
    const img = new Image(); img.src = tex; await img.decode();
    for (const [az, label] of [[45, "map angle"], [135, "map angle (other side)"], [90, "side"]]) {
      const cv = document.createElement("canvas"); cv.width = W; cv.height = W; document.getElementById("w").appendChild(cv);
      const gl = cv.getContext("webgl", { antialias: true });
      const vs = "attribute vec3 p; attribute vec2 t; attribute vec3 n; uniform float ca, sa; varying vec2 vt; varying vec3 vn; void main(){ vec3 w = vec3(p.x*ca + p.z*sa, p.y, -p.x*sa + p.z*ca); vn = vec3(n.x*ca + n.z*sa, n.y, -n.x*sa + n.z*ca); vt = t;" +
        "float sx = (w.x - w.z) * 0.70711; float sy = (w.x + w.z) * 0.70711 * 0.57358 - w.y * 0.81915; float d = (w.x + w.z) * 0.70711 * 0.81915 + w.y * 0.57358; gl_Position = vec4(sx * 0.9, -sy * 0.9, -d * 0.4, 1.0); }";
      const fs2 = "precision mediump float; varying vec2 vt; varying vec3 vn; uniform sampler2D tx; void main(){ vec3 n = normalize(vn); if (!gl_FrontFacing) n = -n; float d = max(dot(n, normalize(vec3(-0.35, 0.85, 0.45))), 0.0); vec3 c = texture2D(tx, vt).rgb; gl_FragColor = vec4(min(c * (0.55 + 0.7 * d), vec3(1.0)), 1.0); }";
      const sh = (ty, s) => { const o = gl.createShader(ty); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
      const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs2)); gl.linkProgram(pr); gl.useProgram(pr);
      const P = new Float32Array(M.pos), T = new Float32Array(M.uv), N = new Float32Array(P.length);
      for (let f = 0; f < P.length / 9; f++) { const o = f * 9, ax = P[o + 3] - P[o], ay = P[o + 4] - P[o + 1], az2 = P[o + 5] - P[o + 2], bx = P[o + 6] - P[o], by = P[o + 7] - P[o + 1], bz = P[o + 8] - P[o + 2]; let nx = ay * bz - az2 * by, ny = az2 * bx - ax * bz, nz = ax * by - ay * bx; const l = Math.hypot(nx, ny, nz) || 1; for (let j = 0; j < 3; j++) { N[o + j * 3] = nx / l; N[o + j * 3 + 1] = ny / l; N[o + j * 3 + 2] = nz / l; } }
      const buf = (d, name, n) => { const o = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, o); gl.bufferData(gl.ARRAY_BUFFER, d, gl.STATIC_DRAW); const l = gl.getAttribLocation(pr, name); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, n, gl.FLOAT, false, 0, 0); };
      buf(P, "p", 3); buf(T, "t", 2); buf(N, "n", 3);
      const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      if (!process_nearest) gl.generateMipmap(gl.TEXTURE_2D); const nearest = process_nearest; gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, nearest ? gl.NEAREST : gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, nearest ? gl.NEAREST : gl.LINEAR);
      const a = az * Math.PI / 180; gl.uniform1f(gl.getUniformLocation(pr, "ca"), Math.cos(a)); gl.uniform1f(gl.getUniformLocation(pr, "sa"), Math.sin(a));
      gl.clearColor(0.18, 0.42, 0.57, 1); gl.enable(gl.DEPTH_TEST); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, P.length / 3);
    }
  }, { M, tex, W, process_nearest: !!process.env.NEAREST });
  await p.screenshot({ path: process.argv[4] }); if (errs.length) console.log(errs); await b.close();
})();
