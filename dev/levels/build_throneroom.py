"""Throne room (chapter 17, 10 Nov 2026) - the second castle interior after the Great Hall. ChatGPT composite throneroom_v1 (golden throne on a
dais, stained glass, banners, chandelier, pillars), then two passes in fresh chats:
  ext   = the composite pushed down 280 rows on a white canvas and filled upward (vaults, round windows, chandelier chain) - lines up exactly
          (template match 0.86 at dy 280, dx -1), so it is used whole as the ONE scene layer (interiors are one plane - no far/near parallax).
          Cut at the floor's back edge (composite 738 = ext 1018) + a few rows under it (the floor covers them), seamless cut.
  road  = GPT floor try 1 (the dais steps taken out, marble - red carpet - marble - gold-trimmed foundation across the full width; back edge
          row 738 like the composite). FULL depth, no squashing (Harley's rule), 2x crisp. Walking line in the carpet centre (row 808).
Writes art/levels/throneroom_*.webp (+ PNGs in art/originals/backgrounds/throneroom_built/), prints numbers for TMP_ENV_BG.throneroom.
Run: python3 dev/levels/build_throneroom.py"""
import os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from build_graveyard import key, seamless
from build_snowpass import seamless_cut
ROOT = os.path.join(os.path.dirname(__file__), "..", ".."); SRC = os.path.join(ROOT, "art/originals/backgrounds")
OUT = os.path.join(ROOT, "art/levels"); FULL = os.path.join(SRC, "throneroom_built"); os.makedirs(FULL, exist_ok=True)
EXT = 280               # rows the composite was pushed down for the extend-up pass
FLOOR_TOP = 738         # composite row of the floor's back edge (wall base just above)
ROAD_CROP = 734         # road image starts here
WALK = 808              # walking line: the middle of the red carpet (778..838), like the Great Hall's carpet line
def save(im, name, q=90):
    im.save(os.path.join(FULL, name + ".png")); im.save(os.path.join(OUT, name + ".webp"), quality=q, method=6); print(name, im.size)

# ---- scene: the extended composite, cut just under the floor line ----
scene = Image.open(os.path.join(SRC, "throneroom_ext_gpt_try1_1535x1024.png")).convert("RGBA").crop((0, 0, 1535, EXT + FLOOR_TOP + 6))
sc = seamless_cut(scene, search=80); save(sc, "throneroom_scene")

# ---- road: full depth, seamless, 2x crisp ----
road = key(Image.open(os.path.join(SRC, "throneroom_layer_road_gpt_try1_1536x1024.png"))).crop((0, ROAD_CROP, 1536, 1024))
r2 = seamless(road); r2 = r2.resize((r2.width * 2, r2.height * 2), Image.NEAREST); save(r2, "throneroom_road")
al = np.asarray(r2.getchannel("A")); tops = sorted(int(np.argmax(al[:, x] > 200)) for x in range(0, r2.width, 40)); top = tops[len(tops) // 2]
road_v = (WALK - ROAD_CROP) * 2
# place the scene so its floor line (row EXT + FLOOR_TOP) sits on the floor's back edge: (baseY - line) * 0.34 + lift 2.5 = (road - top) * 0.21
line = EXT + FLOOR_TOP; baseY = round(line + ((road_v - top) * 0.21 - 2.5) / 0.34)
print("TMP_ENV_BG.throneroom: floor road", road_v, "top", top, "| scene ow/oh", sc.size, "baseY", baseY, "(scale 0.34)")
