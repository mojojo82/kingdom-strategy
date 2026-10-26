"""Rocky stream level (chapter 11, the valley road before the castle) - Harley's ChatGPT composite stream_v2 (26 Oct 2026; v1 copied the castle
gate's bubbly rock texture and its road because the castle picture was attached - v2 attached the village picture again).
  sky   = GPT sky, seamless
  far   = GPT far try 1 drawn ~1.2x too big and low: scaled by 1/1.2 and lifted so the mountains sit where the composite has them; colour-matched 70%;
          its big waterfall gets a foam mask (stream_far_foam) for a falling-water animation
  near  = composite pixels through GPT's near split (lines up 0,0); masks of its water (stream_water: ripples drift sideways) and foam
          (stream_foam: the small falls - highlights run down)
  road  = GPT road try 1 (lines up row for row), sand band squashed to the desert depth, 2x crisp
Writes art/levels/stream_*.webp (+ PNGs in art/originals/backgrounds/stream_built/), prints the mask boxes for TMP_ENV_BG.stream.
Run: python3 dev/levels/build_stream.py"""
import os, sys
import numpy as np, cv2
from PIL import Image
from scipy import ndimage as nd
sys.path.insert(0, os.path.dirname(__file__))
from build_graveyard import key, seamless
from build_snowpass import seamless_cut
ROOT = os.path.join(os.path.dirname(__file__), "..", ".."); SRC = os.path.join(ROOT, "art/originals/backgrounds")
OUT = os.path.join(ROOT, "art/levels"); FULL = os.path.join(SRC, "stream_built"); os.makedirs(FULL, exist_ok=True)
ROAD_TOP = 790; NEAR_TOP = 100; FAR_TOP = 150; FAR_SCALE = 1 / 1.2; FAR_LIFT = 21
def save(im, name, q=90, lossless=False):
    im.save(os.path.join(FULL, name + ".png"))
    if lossless: im.save(os.path.join(OUT, name + ".webp"), lossless=True, method=6)
    else: im.save(os.path.join(OUT, name + ".webp"), quality=q, method=6)
    print(name, im.size)
def is_mag(a):
    a = a.astype(int); return ((np.minimum(a[..., 0], a[..., 2]) - a[..., 1]) > 60) | ((a[..., 0] > 150) & (a[..., 2] > 150) & (a[..., 1] < 110))
def keep_big(m, n):
    lab, k = nd.label(m)
    if not k: return m
    sz = nd.sum(m, lab, range(1, k + 1)); return np.isin(lab, [i + 1 for i, v in enumerate(sz) if v >= n])
def mask_img(m, name, blur=0.8):
    ys, xs = np.where(m); x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    a = (cv2.GaussianBlur(m.astype(np.float32), (0, 0), blur)[y0:y1, x0:x1] * 255).astype(np.uint8)
    save(Image.fromarray(np.dstack([np.full(a.shape + (3,), 255, np.uint8), a]), "RGBA"), name, lossless=True)
    return [int(x0), int(y0), int(x1 - x0), int(y1 - y0)]
comp = np.asarray(Image.open(os.path.join(SRC, "stream_v2_composite_1536x1024.png")).convert("RGB")).astype(np.float32)
nearg = np.asarray(Image.open(os.path.join(SRC, "stream_layer_near_gpt_try1_1536x1024.png")).convert("RGB"))
near_mask = ~is_mag(nearg)

save(seamless(Image.open(os.path.join(SRC, "stream_sky_gpt_1536x1024.png")).convert("RGBA")), "stream_sky", 88)

# ---- far: scale back, lift, key, colour-match ----
fsrc = np.asarray(Image.open(os.path.join(SRC, "stream_layer_far_gpt_try1_1536x1024.png")).convert("RGB"))
W1, H1 = int(round(1536 * FAR_SCALE)), int(round(1024 * FAR_SCALE))
fs = cv2.resize(fsrc, (W1, H1), interpolation=cv2.INTER_AREA)[FAR_LIFT:]
far = np.asarray(key(Image.fromarray(fs))).astype(np.float32)
vis = (~is_mag(comp)) & (~near_mask); vis[:FAR_TOP] = False; vis[ROAD_TOP - 10:] = False
fv = far[..., 3] > 200; fv[:FAR_TOP] = False
src_lab = cv2.cvtColor(far[..., :3].astype(np.uint8), cv2.COLOR_RGB2LAB).astype(np.float32)
ref_lab = cv2.cvtColor(comp.astype(np.uint8), cv2.COLOR_RGB2LAB).astype(np.float32)
sky = (comp[..., 2] > comp[..., 0] + 60) & (comp[..., 2] > 180); vis &= ~sky
s_m, s_s = src_lab[fv].mean(0), src_lab[fv].std(0) + 1e-3; r_m, r_s = ref_lab[vis].mean(0), ref_lab[vis].std(0)
k = 0.5; t_m, t_s = s_m + (r_m - s_m) * k, s_s + (r_s - s_s) * k
print("far LAB", np.round(s_m, 1), "->", np.round(t_m, 1))
far[..., :3] = cv2.cvtColor(np.clip((src_lab - s_m) / s_s * t_s + t_m, 0, 255).astype(np.uint8), cv2.COLOR_LAB2RGB)
farI = Image.fromarray(far.astype(np.uint8), "RGBA").crop((0, FAR_TOP, W1, ROAD_TOP + 1))
farC = seamless_cut(farI); save(farC, "stream_far")
fc = np.asarray(farC).astype(int)
R, G, Bc = fc[..., 0], fc[..., 1], fc[..., 2]
foam = (Bc > 160) & (Bc > R + 8) & (fc[..., :3].mean(2) > 150) & (fc[..., 3] > 200)      # the waterfall is pale blue-white after the colour match
box = np.zeros_like(foam); box[170:500, 955:1080] = True
ff = keep_big(nd.binary_opening(foam & box), 120); print("far foam box", mask_img(ff, "stream_far_foam"))

# ---- near: composite pixels through GPT's near stencil + water masks ----
m = cv2.erode(near_mask.astype(np.uint8) * 255, np.ones((3, 3), np.uint8)); m = cv2.GaussianBlur(m, (0, 0), 1.2); m[ROAD_TOP + 8:] = 0
near = Image.fromarray(np.dstack([comp.astype(np.uint8), m]), "RGBA").crop((0, NEAR_TOP, 1536, ROAD_TOP + 8))
nearC = seamless_cut(near); save(nearC, "stream_near")
nc = np.asarray(nearC).astype(int); r, g, b, a = nc[..., 0], nc[..., 1], nc[..., 2], nc[..., 3]
reg = np.zeros(r.shape, bool); reg[560 - NEAR_TOP:, 280:1430] = True
water = reg & (a > 200) & (b > r + 35) & (b > 120) & (g > 90)
fo = reg & (a > 200) & (np.minimum(np.minimum(r, g), b) > 185) & ((np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)) < 55)
water = keep_big(nd.binary_opening(water), 400)                  # drop the blue-grey highlights on the rocks
near_w = nd.binary_dilation(water, iterations=6)
fo = keep_big(nd.binary_opening(fo & near_w), 80)               # foam only where it touches the water (not rock highlights)
water = nd.binary_closing(water | fo, iterations=2)
print("near water box", mask_img(water, "stream_water", 1.0))
print("near foam box", mask_img(fo, "stream_foam"))

# ---- road: tufts + sand band 772..840 -> 43 rows, 2x crisp ----
road = key(Image.open(os.path.join(SRC, "stream_layer_road_gpt_try1_1536x1024.png")))
TOP, CUT, BAND = 766, 842, 46
band = road.crop((0, TOP, road.width, CUT)).resize((road.width, BAND), Image.LANCZOS)
face = road.crop((0, CUT, road.width, road.height))
r2 = Image.new("RGBA", (road.width, BAND + face.height)); r2.paste(band, (0, 0)); r2.paste(face, (0, BAND))
r2 = seamless(r2); r2 = r2.resize((r2.width * 2, r2.height * 2), Image.NEAREST)
save(r2, "stream_road")
al = np.asarray(r2.getchannel("A")); tops = sorted(int(np.argmax(al[:, x] > 200)) for x in range(0, r2.width, 40))
print("road solid top (median row)", tops[len(tops) // 2])
