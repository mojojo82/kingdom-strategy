"""Volcano / lava cavern (Harley 19 Oct, journey stop after the crystal mine). ChatGPT composite art/originals/backgrounds/volcano_v1_composite_1536x1024.png.
Harley's design: dark rocky ground; the NEAR layer is a lava lake (animated in Leonardo); behind it the rocky far interior; no sunlight.
  far  = GPT far split, magenta gaps under the ragged shore filled with dark shore rock (the lake covers that band), cut at the road line (717)
  lake = Leonardo/Hailuo 2k clip art/originals/volcano_lava_lake_hailuo_2k.mp4 (it turned the magenta to near-black after frame 6 - harmless:
         we cut the band by rows). Band aligned onto the still GPT lake, 3s loop made seamless by cross-fading its end into its start,
         24 frames (8 fps; the game blends between them). Bottom edge extended down behind the road.
  road = GPT road (sunlit road used as the shape reference), flattened to the village eye-level, 2x crisp; + "Darker below" version.
Lava falls in the far layer are animated in code (positions in VOLCANO_FALLS in the game, measured here).
Run: python3 dev/levels/build_volcano.py"""
import os, sys, subprocess, tempfile, glob, numpy as np, cv2
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from build_graveyard import key, seamless
ROOT = os.path.join(os.path.dirname(__file__), "..", ".."); SRC = os.path.join(ROOT, "art/originals/backgrounds")
OUT = os.path.join(ROOT, "art/levels"); FULL = os.path.join(SRC, "volcano_built"); os.makedirs(FULL, exist_ok=True)
ROAD_TOP = 717
def save(im, name, q=90):
    im.save(os.path.join(FULL, name + ".png")); im.save(os.path.join(OUT, name + ".webp"), quality=q, method=6); print(name, im.size)

# ---- far
far = key(Image.open(os.path.join(SRC, "volcano_layer_far_gpt_1536x1024.png"))).crop((0, 0, 1536, ROAD_TOP + 1))
a = np.asarray(far).copy(); rock = np.array([38, 16, 12, 255], np.uint8)
for x in range(1536):
    col = a[:, x, 3]; ys = np.where(col > 200)[0]
    if not len(ys): continue
    last = ys.max()
    if last < ROAD_TOP:                                   # below the shore: dark rock, a little lava glow near the lake line
        n = ROAD_TOP + 1 - (last + 1); g = np.linspace(0, 1, n)[:, None]
        fill = rock[None, :].astype(np.float32) * (1 - g * 0.0) + np.array([90, 30, 10, 0], np.float32) * g * 0.6
        a[last + 1:, x] = np.clip(fill, 0, 255).astype(np.uint8); a[last + 1:, x, 3] = 255
    gaps = np.where(col[: last] < 200)[0]                   # holes above the shore line -> same rock
    a[gaps[gaps > 150], x] = rock
# taller phones show more above the composite's top: grow the rock ceiling 300 rows (mirrored, fading into the dark ceiling colour)
EXT = 300; flat = np.array([22, 10, 9], np.float32); t = (np.arange(EXT, dtype=np.float32)[::-1] / EXT)[:, None, None]
top = a[:EXT][::-1, :, :3].astype(np.float32); dark = 0.5 * (1 - t) ** 1.5; top = top * dark + flat * (1 - dark)
a = np.vstack([np.dstack([top.clip(0, 255).astype(np.uint8), np.full((EXT, 1536), 255, np.uint8)]), a])
farI = seamless(Image.fromarray(a, "RGBA")); save(farI, "volcano_far")   # falls in VOLCANO_FALLS are in rows of THIS image (+300)

# ---- lake (animated)
lake_still = np.asarray(Image.open(os.path.join(SRC, "volcano_layer_lake_gpt_1536x1024.png")).convert("RGB")).astype(int)
mag = (np.minimum(lake_still[..., 0], lake_still[..., 2]) - lake_still[..., 1] > 70)
LTOP = int(np.median([np.argmin(mag[:, x]) for x in range(0, 1536, 16)]))   # lake top row (straight)
tmp = tempfile.mkdtemp()
subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(ROOT, "art/originals/volcano_lava_lake_hailuo_2k.mp4"), "-vf", "scale=1536:-1", os.path.join(tmp, "%03d.png")], check=True)
fs = sorted(glob.glob(os.path.join(tmp, "*.png")))
ref = np.asarray(Image.open(fs[40]).convert("RGB")).astype(np.float32)
# vertical alignment: video band top -> still lake top
lum = ref.mean(2); vtop = int(np.where(lum.mean(1) > 60)[0].min())
dy = LTOP - vtop
BH = 230                                                  # band height kept (lake top .. well below the road line)
def band(i):
    im = np.asarray(Image.open(fs[i]).convert("RGB")).astype(np.float32)
    b = im[vtop: vtop + BH]
    if b.shape[0] < BH: b = np.vstack([b, np.repeat(b[-1:], BH - b.shape[0], 0)])
    # rows that went dark (below the wavy lava bottom) -> extend the last bright row per column
    l = b.mean(2)
    for x in range(b.shape[1]):
        ys = np.where(l[:, x] > 70)[0]
        if len(ys): b[ys.max() + 1:, x] = b[ys.max(), x]
    return b
S0, L, X = 30, 72, 24                                     # loop = frames S0..S0+L, last X cross-faded into the first
frames = []
for k in range(0, L, 3):                                  # every 3rd -> 24 frames at 8 fps = 3 s
    b = band(S0 + k)
    if k >= L - X:                                        # end of loop fades into the frames just before the start, so frame L == frame 0
        t = (k - (L - X)) / X; b = b * (1 - t) + band(S0 - (L - k)) * t
    frames.append(b)
# alpha: straight soft top edge (row 0..3), opaque below
alpha = np.full((BH, 1536), 255, np.float32); alpha[0:4] = np.array([60, 130, 200, 240])[:, None]
def wrap(fr):                                              # same 90px cross-fade as the other layers, on every frame -> the lake repeats seamlessly
    n = 90; W = fr.shape[1]; o = fr[:, :W - n].copy(); t = np.linspace(0, 1, n)[None, :, None]
    o[:, :n] = fr[:, W - n:] * (1 - t) + fr[:, :n] * t; return o
frames = [wrap(np.dstack([f, alpha])) for f in frames]
sheet = np.vstack(frames).clip(0, 255).astype(np.uint8)
sh = Image.fromarray(sheet, "RGBA"); sh.save(os.path.join(FULL, "volcano_lake_sheet.png"))
sh.save(os.path.join(OUT, "volcano_lake_sheet.webp"), quality=80, method=6)
print("lake sheet", sh.size, "frames", len(frames), "band", BH, "lake top row in composite", LTOP, "video top", vtop, "file", os.path.getsize(os.path.join(OUT, "volcano_lake_sheet.webp")))

# ---- road
road = key(Image.open(os.path.join(SRC, "volcano_layer_road_gpt_try1_1536x1024.png")))
al = np.asarray(road)[..., 3]; rows = [int(np.argmax(al[:, x] > 128)) for x in range(0, 1536, 32)]
STRIP = int(np.median(rows)); CUT, BAND = STRIP + 50, 33
pre = road.crop((0, max(0, STRIP - 24), road.width, STRIP)); bandI = road.crop((0, STRIP, road.width, CUT)).resize((road.width, BAND), Image.LANCZOS)
face = road.crop((0, CUT, road.width, road.height))
r2 = Image.new("RGBA", (road.width, pre.height + BAND + face.height)); r2.paste(pre, (0, 0)); r2.paste(bandI, (0, pre.height)); r2.paste(face, (0, pre.height + BAND))
r2 = seamless(r2); r2 = r2.resize((r2.width * 2, r2.height * 2), Image.NEAREST); save(r2, "volcano_road")
A = np.asarray(r2).astype(np.float32); H = A.shape[0]; y0 = pre.height * 2 + BAND * 2
t = np.clip((np.arange(H, dtype=np.float32)[:, None] - y0) / 140.0, 0, 1); k = 1 - 0.62 * t ** 0.8
keep = np.clip((A[..., :3].mean(2) - 150) / 80, 0, 1) * 0.5; A[..., :3] *= (k + (1 - k) * keep)[..., None]
save(Image.fromarray(A.clip(0, 255).astype(np.uint8), "RGBA"), "volcano_road_dark")
print("road strip top", pre.height * 2, "walking line", pre.height * 2 + round(BAND * 2 * 0.25), "(strip row", STRIP, ")")
