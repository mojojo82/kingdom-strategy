"""Sunlit cavern (Harley 19 Oct, cave stop of the journey) - ChatGPT composite art/originals/backgrounds/cave_sunlit_composite_1536x1024.png.
Harley: "priority should be to get all layers to match the composite" - no readability toning; only the technical steps.
  far  = GPT far split (full frame, light shafts, spires), cut at the road line (row 809)
  near = cut straight out of the composite, GPT's near split aligned (sx .995, sy .925, dy -36) used as a stencil; near its edges, composite pixels
         that are bright and blue/white (= the far cavern showing past GPT's slightly different outline) are dropped so no bright halo rides on the walls
  road = GPT road try 3 (rich small detail), colours untouched, walking strip flattened to the village eye-level, 2x crisp
Writes art/levels/cave_{far,near,road}.webp. Run: python3 dev/levels/build_cave_sunlit.py"""
import os, sys, numpy as np, cv2
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from build_graveyard import key, seamless
from build_snowpass import seamless_cut
ROOT = os.path.join(os.path.dirname(__file__), "..", ".."); SRC = os.path.join(ROOT, "art/originals/backgrounds")
OUT = os.path.join(ROOT, "art/levels"); FULL = os.path.join(SRC, "cave_built"); os.makedirs(FULL, exist_ok=True)
ROAD_TOP = 809
def save(im, name, q=90):
    im.save(os.path.join(FULL, name + ".png")); im.save(os.path.join(OUT, name + ".webp"), quality=q, method=6); print(name, im.size)
far = Image.open(os.path.join(SRC, "cave_sunlit_layer_far_gpt_1536x1024.png")).convert("RGBA").crop((0, 0, 1536, ROAD_TOP + 1))
save(seamless(far), "cave_far")
c = np.asarray(Image.open(os.path.join(SRC, "cave_sunlit_composite_1536x1024.png")).convert("RGB"))
n = np.asarray(Image.open(os.path.join(SRC, "cave_sunlit_layer_near_gpt_1536x1024.png")).convert("RGB"))
ni = n.astype(int); mag = (np.minimum(ni[..., 0], ni[..., 2]) - ni[..., 1] > 60) | ((ni[..., 0] > 150) & (ni[..., 2] > 150) & (ni[..., 1] < 110))
M = np.float32([[0.995, 0, (1 - 0.995) * 768], [0, 0.925, -36 + (1 - 0.925) * 512]])
wm = cv2.warpAffine((~mag).astype(np.uint8) * 255, M, (1536, 1024), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)  # replicate: no empty column/row at the image edges
wn = cv2.warpAffine(n, M, (1536, 1024), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
cl = cv2.cvtColor(c, cv2.COLOR_RGB2GRAY).astype(int); nl = cv2.GaussianBlur(cv2.cvtColor(wn, cv2.COLOR_RGB2GRAY), (0, 0), 2).astype(int)
ci = c.astype(int); greenish = (ci[..., 1] > ci[..., 0] + 12) & (ci[..., 1] > ci[..., 2])
edge = cv2.distanceTransform((wm > 128).astype(np.uint8), cv2.DIST_L2, 5) < 28
drop = (cl > nl + 40) & (cl > 105) & ~greenish & edge
m = np.where(drop, 0, wm).astype(np.uint8)
m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8), borderType=cv2.BORDER_REPLICATE); m = cv2.GaussianBlur(m, (0, 0), 1.2, borderType=cv2.BORDER_REPLICATE); m[ROAD_TOP + 2:] = 0
# taller phones show more above the composite's top edge: grow the rock ceiling upward - the composite's top rows mirrored, darkening into the
# flat ceiling colour. Fully solid, so the far layer never peeks out above the picture.
EXT = 300
t = (np.arange(EXT, dtype=np.float32)[::-1] / EXT)[:, None, None]   # 1 at the very top .. 0 at the seam
flat = np.array([20, 24, 30], np.float32)
src = c[:EXT][::-1].astype(np.float32); sa = (m[:EXT][::-1].astype(np.float32) / 255)[..., None]   # only the near layer's own rock (opening -> flat)
src = src * sa + flat * (1 - sa)
dark = 0.5 * (1 - t) ** 1.5                                           # ~50% of the rock at the seam, fading to the flat colour at the top
top = src * dark + flat * (1 - dark)
c = np.vstack([top.clip(0, 255).astype(np.uint8), c]); m = np.vstack([np.full((EXT, 1536), 255, np.uint8), m])
near = Image.fromarray(np.dstack([c, m]), "RGBA").crop((0, 0, 1536, EXT + ROAD_TOP + 2))
save(seamless_cut(near), "cave_near")
road = key(Image.open(os.path.join(SRC, "cave_sunlit_layer_road_gpt_try3_1536x1024.png")))
a = np.asarray(road)[..., 3]; rows = [int(np.argmax(a[:, x] > 128)) for x in range(0, 1536, 32)]
STRIP = int(np.median(rows)); CUT, BAND = STRIP + 50, 33       # surface ~50 rows deep -> village eye-level
pre = road.crop((0, max(0, STRIP - 24), road.width, STRIP)); band = road.crop((0, STRIP, road.width, CUT)).resize((road.width, BAND), Image.LANCZOS)
face = road.crop((0, CUT, road.width, road.height))
r2 = Image.new("RGBA", (road.width, pre.height + BAND + face.height)); r2.paste(pre, (0, 0)); r2.paste(band, (0, pre.height)); r2.paste(face, (0, pre.height + BAND))
r2 = seamless(r2); r2 = r2.resize((r2.width * 2, r2.height * 2), Image.NEAREST)
save(r2, "cave_road"); print("road strip top", pre.height * 2, "walking line", pre.height * 2 + round(BAND * 2 * 0.25), "(strip row in GPT image", STRIP, ")")
