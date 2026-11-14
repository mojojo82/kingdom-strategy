const { chromium } = require("playwright"), fs = require("fs"), path = require("path"), cp = require("child_process");
const OUT = path.join(__dirname, "frames"); fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT);
(async () => { const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ["--no-sandbox", "--allow-file-access-from-files"] }); const P = await b.newPage({ viewport: { width: 860, height: 840 } }); const errs = []; P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("file://" + path.join(__dirname, "view.html")); await P.waitForFunction(() => window.__ready, null, { timeout: 30000 });
  const FPS = 60, seq = []; const idle = +process.env.IDLE || 3, bl = 2.8;
  for (let i = 0; i < idle * FPS; i++) seq.push([i / FPS, "idle", 0]);
  for (let i = 0; i < bl * FPS; i++) seq.push([idle + i / FPS, "blast", i / FPS]);
  for (let i = 0; i < 1.2 * FPS; i++) seq.push([idle + bl + i / FPS, "idle", 0]);
  const st = 2.1, t2 = idle + bl + 1.2; for (let i = 0; i < st * FPS; i++) seq.push([t2 + i / FPS, "stomp", i / FPS, i / FPS - 0.88]);
  for (let i = 0; i < 1.4 * FPS; i++) seq.push([t2 + st + i / FPS, "idle", 0, st - 0.88 + i / FPS]);
  const t0 = Date.now(); let ms = 0;
  for (let i = 0; i < seq.length; i++) { const r = await P.evaluate(([t, m, mt, q]) => { const a = performance.now(); frame(t, m, mt, q); const d = performance.now() - a; return [document.getElementById("c").toDataURL("image/jpeg", 0.9), d]; }, seq[i]);
    ms += r[1]; fs.writeFileSync(path.join(OUT, "f" + String(i).padStart(4, "0") + ".jpg"), Buffer.from(r[0].split(",")[1], "base64")); }
  console.log("frames", seq.length, "avg draw ms", (ms / seq.length).toFixed(1), "total s", ((Date.now() - t0) / 1000).toFixed(0), "errs", errs.slice(0, 3)); await b.close();
  cp.execSync(`ffmpeg -loglevel error -y -framerate 60 -i ${OUT}/f%04d.jpg -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p ${path.join(__dirname, "preview.mp4")}`);
})().catch((e) => { console.error(e); process.exit(1); });
