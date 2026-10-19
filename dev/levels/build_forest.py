"""Forest (chapter 4, rain level) - Harley's ChatGPT composite art/originals/backgrounds/forest_v1_composite_1536x1024.png. "Inside the forest":
no sky, both tree layers reach the top. Layers:
  far  = GPT far split (full frame, misty trunks + canopy), cut at the road line; top fades into the dark canopy colour (FLAT) so tall phones
         never see an edge
  near = cut straight out of the composite, GPT's near split (aligned at 0,0) used only as a stencil (it came out brighter/saturated);
         top fades out over the far layer
  road = GPT road try 2 (natural forest floor), ferns at the back kept, walking strip flattened to the village eye-level, 2x crisp
Writes art/levels/forest_{far,near,road}.webp (+ PNGs in art/originals/backgrounds/forest_built/). Run: python3 dev/levels/build_forest.py"""
import os, sys, numpy as np, cv2
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from build_graveyard import key, seamless
from build_snowpass import seamless_cut
ROOT = os.path.join(os.path.dirname(__file__), "..", ".."); SRC = os.path.join(ROOT, "art/originals/backgrounds")
OUT = os.path.join(ROOT, "art/levels"); FULL = os.path.join(SRC, "forest_built"); os.makedirs(FULL, exist_ok=True)
ROAD_TOP = 795; FLAT = (13, 33, 54)
def save(im, name, q=90):
    im.save(os.path.join(FULL, name + ".png")); im.save(os.path.join(OUT, name + ".webp"), quality=q, method=6); print(name, im.size)
def fade_top(im, n, to=None):
    a = np.asarray(im.convert("RGBA")).astype(np.float32)
    for y in range(n):
        t = y / n
        if to is None: a[y, :, 3] *= t
        else: a[y, :, :3] = a[y, :, :3] * t + np.array(to, np.float32) * (1 - t)
    return Image.fromarray(a.clip(0, 255).astype(np.uint8), "RGBA")
far = Image.open(os.path.join(SRC, "forest_layer_far_gpt_1536x1024.png")).convert("RGBA").crop((0, 0, 1536, ROAD_TOP + 1))
save(seamless(fade_top(far, 110, FLAT)), "forest_far")
c = np.asarray(Image.open(os.path.join(SRC, "forest_v1_composite_1536x1024.png")).convert("RGB"))
n = np.asarray(Image.open(os.path.join(SRC, "forest_layer_near_gpt_1536x1024.png")).convert("RGB")).astype(int)
mag = (np.minimum(n[..., 0], n[..., 2]) - n[..., 1] > 60) | ((n[..., 0] > 150) & (n[..., 2] > 150) & (n[..., 1] < 110))
m = cv2.GaussianBlur(cv2.erode((~mag).astype(np.uint8) * 255, np.ones((3, 3), np.uint8)), (0, 0), 1.5); m[ROAD_TOP + 2:] = 0
near = Image.fromarray(np.dstack([c, m]), "RGBA").crop((0, 0, 1536, ROAD_TOP + 2))
save(seamless_cut(fade_top(near, 90)), "forest_near")
road = key(Image.open(os.path.join(SRC, "forest_layer_road_gpt_try2_1536x1024.png")))
TOP0, STRIP, CUT, BAND = 640, 712, 776, 33
ferns = road.crop((0, TOP0, road.width, STRIP)); band = road.crop((0, STRIP, road.width, CUT)).resize((road.width, BAND), Image.LANCZOS)
face = road.crop((0, CUT, road.width, road.height))
r2 = Image.new("RGBA", (road.width, ferns.height + BAND + face.height)); r2.paste(ferns, (0, 0)); r2.paste(band, (0, ferns.height)); r2.paste(face, (0, ferns.height + BAND))
r2 = seamless(r2)
r2 = r2.resize((r2.width * 2, r2.height * 2), Image.NEAREST)
save(r2, "forest_road")
print("road: strip top row", ferns.height * 2, " walking line ~", ferns.height * 2 + round(BAND * 2 * 0.25))
