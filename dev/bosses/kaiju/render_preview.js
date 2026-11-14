const { chromium } = require("playwright"), fs = require("fs"), path = require("path"), cp = require("child_process");
const OUT = path.join(__dirname, "../krig/frames"); fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT);
(async () => { const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ["--no-sandbox", "--allow-file-access-from-files"] }); const P = await b.newPage({ viewport: { width: 860, height: 840 } }); const errs = []; P.on("pageerror", (e) => errs.push(e.message));
  await P.goto("file://" + path.join(__dirname, "../krig/view.html")); await P.waitForFunction(() => window.__ready, null, { timeout: 30000 });
  const FPS = 60, seq = []; const idle = +process.env.IDLE || 5, bl = 2.8;
  for (let i = 0; i < idle * FPS; i++) seq.push([i / FPS, "idle", 0]);
  for (let i = 0; i < bl * FPS; i++) seq.push([idle + i / FPS, "blast", i / FPS]);
  for (let i = 0; i < 1.5 * FPS; i++) seq.push([idle + bl + i / FPS, "idle", 0]);
  const t0 = Date.now(); let ms = 0;
  for (let i = 0; i < seq.length; i++) { const r = await P.evaluate(([t, m, mt]) => { const a = performance.now(); frame(t, m, mt); const d = performance.now() - a; return [document.getElementById("c").toDataURL("image/jpeg", 0.9), d]; }, seq[i]);
    ms += r[1]; fs.writeFileSync(path.join(OUT, "f" + String(i).padStart(4, "0") + ".jpg"), Buffer.from(r[0].split(",")[1], "base64")); }
  console.log("frames", seq.length, "avg draw ms", (ms / seq.length).toFixed(1), "total s", ((Date.now() - t0) / 1000).toFixed(0), "errs", errs.slice(0, 3)); await b.close();
  cp.execSync(`ffmpeg -loglevel error -y -framerate 60 -i ${OUT}/f%04d.jpg -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p ${path.join(__dirname, "../ev/kaiju_coded_v1.mp4")}`);
})().catch((e) => { console.error(e); process.exit(1); });
