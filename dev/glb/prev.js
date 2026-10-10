const { chromium } = require("/opt/npm-tools/node_modules/playwright"); const fs = require("fs");
(async () => { const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 1200, height: 820 } }); const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => errs.push(m.text()));
await p.setContent('<body style="margin:0;background:#2b5a86"><div id="w" style="display:flex;flex-wrap:wrap;gap:4px"></div></body>');
const M = JSON.parse(fs.readFileSync(process.argv[2], "utf8")), views = JSON.parse(process.argv[3] || "[[45,35],[0,0],[90,0]]");
await p.evaluate(({ M, views }) => {
  function draw(m, az, el, W, H, label) {
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const wrap = document.createElement("div"); wrap.style.cssText = "position:relative;background:#2b5a86"; wrap.appendChild(cv);
    const t = document.createElement("div"); t.textContent = label; t.style.cssText = "position:absolute;left:6px;top:4px;color:#fff;font:12px sans-serif"; wrap.appendChild(t); document.getElementById("w").appendChild(wrap);
    const gl = cv.getContext("webgl", { antialias: true }); gl.getExtension("OES_element_index_uint");
    const vs = `attribute vec3 p; attribute vec3 c; attribute vec3 n; uniform mat3 R; uniform float s; varying vec3 vc; varying vec3 vn; void main(){ vec3 q = R * p; vc = c; vn = R * n; gl_Position = vec4(q.x*s, q.y*s, -q.z*0.4, 1.0); }`;
    const fs = `precision mediump float; varying vec3 vc; varying vec3 vn; void main(){ vec3 N = normalize(vn); if(!gl_FrontFacing) N=-N; float d = max(dot(N, normalize(vec3(-0.4,0.7,0.6))),0.0); gl_FragColor = vec4(vc*(0.45+0.75*d), 1.0); }`;
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; }; const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr); gl.useProgram(pr);
    const P = new Float32Array(m.pos), C = new Float32Array(m.col), T = new Uint32Array(m.T), N = new Float32Array(P.length);
    for (let i = 0; i < T.length; i += 3) { const a = T[i] * 3, b = T[i + 1] * 3, c = T[i + 2] * 3; const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2]; const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; [a, b, c].forEach((k) => { N[k] += nx; N[k + 1] += ny; N[k + 2] += nz; }); }
    const buf = (data, loc, n) => { const bb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bb); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); const l = gl.getAttribLocation(pr, loc); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, n, gl.FLOAT, false, 0, 0); };
    buf(P, "p", 3); buf(C, "c", 3); buf(N, "n", 3); const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, T, gl.STATIC_DRAW);
    const a = az * Math.PI / 180, e = el * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a), ce = Math.cos(e), se = Math.sin(e);
    /* rotate about Y by az, then about X by el (camera looks down -Z) */
    const R = [ca, se * sa, -ce * sa, 0, ce, se, sa, -se * ca, ce * ca];
    gl.uniformMatrix3fv(gl.getUniformLocation(pr, "R"), false, R); gl.uniform1f(gl.getUniformLocation(pr, "s"), 0.95);
    gl.viewport(0, 0, W, H); gl.clearColor(0.17, 0.35, 0.53, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST); gl.drawElements(gl.TRIANGLES, T.length, gl.UNSIGNED_INT, 0);
  }
  M.forEach((m) => views.forEach(([az, el]) => draw(m, az, el, 390, 270, m.name + " · " + (m.T.length / 3) + " tris · az" + az + " el" + el)));
}, { M, views });
await p.waitForTimeout(500); await p.screenshot({ path: process.argv[4] || "/tmp/claude-0/glb/prev.png", fullPage: true }); console.log(errs.slice(0, 5)); await b.close(); })();
