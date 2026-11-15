/* Iron Lily skill mockup: keyed flurry frames + LILY_SLASH code crescents on a level background -> PNG frames.
   node dev/heroes/lily/skill_mock.js <keyedFramesDir> <outDir> [scale]   (CHROME_PATH=...) */
const fs = require("fs"), path = require("path"), { chromium } = require("playwright");
const ROOT = path.join(__dirname, "../../.."), IN = process.argv[2], OUT = process.argv[3], SC = +(process.argv[4] || 1), SET = process.argv[5] || "A", STY = process.argv[6] || "ATTACHED";
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ["--no-sandbox"] });
  const P = await b.newPage({ viewport: { width: 1152, height: 768 } });
  const b64 = (f) => "data:image/" + (f.endsWith(".png") ? "png" : "webp") + ";base64," + fs.readFileSync(f).toString("base64");
  const bg = ["sky", "far", "near", "road"].map((n) => b64(path.join(ROOT, "art/levels/graveyard_" + n + ".webp")));
  await P.setContent("<canvas id=c width=1152 height=768></canvas>");
  await P.addScriptTag({ content: fs.readFileSync(path.join(__dirname, "lily_slash_fx.js"), "utf8") });
  await P.evaluate(async (bg) => { window.BG = await Promise.all(bg.map((s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = s; }))); }, bg);
  const SD = path.join(ROOT, "art/originals/heroes/ironlily/redo/fx/slashes"), SM = JSON.parse(fs.readFileSync(path.join(SD, "slashes.json"), "utf8"));
  await P.evaluate(async (list) => { LILY_SLASH.sprites = await Promise.all(list.map((x) => new Promise((r) => { const i = new Image(); i.onload = () => r({ img: i, meta: x.meta }); i.src = x.src; }))); },
    SM.map((meta) => ({ meta, src: b64(path.join(SD, meta.file)) })));
  const frames = fs.readdirSync(IN).filter((f) => f.endsWith(".png")).sort();
  /* MAP=json: [{src, layers: [[t, seed], ...]}, ...] - replays / speeds up the clip (output frame -> source frame + slash layers) */
  const MAP = process.env.MAP ? JSON.parse(fs.readFileSync(process.env.MAP, "utf8")) : frames.map((f, i) => ({ src: i, layers: [[i, 0]] }));
  for (let i = 0; i < MAP.length; i++) {
    const png = await P.evaluate(async ({ src, layers, SC, SET, STY, NOBG }) => {
      const c = document.getElementById("c"), g = c.getContext("2d"); g.globalCompositeOperation = "source-over";
      if (NOBG) g.clearRect(0, 0, 1152, 768); else { BG.forEach((im) => g.drawImage(im, 0, 0, 1152, 768)); g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(0, 0, 1152, 768); } /* NOBG=1: transparent, frame at its own coords (game sheet) */
      const im = await new Promise((r) => { const x = new Image(); x.onload = () => r(x); x.src = src; });
      const CH = LILY_SLASH["CHEST_" + SET], cx = 576, feetY = NOBG ? 600 : 700, ox = cx + (CH[0] - 576) * SC, oy = feetY - (677 - CH[1]) * SC;   /* her feet on the road */
      g.drawImage(im, cx - 576 * SC, feetY - 677 * SC, 1152 * SC, 768 * SC);
      layers.forEach((L) => LILY_SLASH.draw(g, L[0], ox, oy, SC, LILY_SLASH["SWINGS_" + SET], LILY_SLASH[STY], L[1]));
      return c.toDataURL("image/png");
    }, { src: b64(path.join(IN, frames[Math.min(frames.length - 1, MAP[i].src)])), layers: MAP[i].layers, SC, SET, STY, NOBG: !!process.env.NOBG });
    fs.writeFileSync(path.join(OUT, String(i).padStart(4, "0") + ".png"), Buffer.from(png.split(",")[1], "base64"));
  }
  await b.close(); console.log("frames", MAP.length);
})().catch((e) => { console.error(e); process.exit(1); });
