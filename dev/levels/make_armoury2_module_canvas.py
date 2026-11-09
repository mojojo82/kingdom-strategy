"""Armoury 2 module canvas (Harley, 2 Nov / 9 Nov 2026). One full bay of the seamless base, pillar to pillar (the same 1381 px repeat,
so the pillar rhythm stays regular), with a little of the next bay on each side. The roof, both pillars and the floor strip are kept;
ONLY the plain wall between the pillars is white. GPT paints the module into the white (fresh chat, prompt in PROMPTS.md), so every
module snaps onto the base and onto every other module in any order. Back in the build, the kept parts are put back from the
originals and only GPT's white area is used.
Writes art/originals/backgrounds/armoury2_module_canvas_1536x1024.png. Run after build_armoury2.py."""
import os
import numpy as np
from PIL import Image
ROOT = os.path.join(os.path.dirname(__file__), "..", ".."); SRC = os.path.join(ROOT, "art/originals/backgrounds"); FULL = os.path.join(SRC, "armoury2_built")
CTX_L = 77                                   # columns of the previous bay shown on the left (1536 = 77 + 1381 + 78)
HALF = 50                                    # pillar half-width (see build_armoury2.py)
WALL_TOP = 612                               # first wall row below the roof beams and their brackets
wall = np.asarray(Image.open(os.path.join(FULL, "armoury2_wall.png")).convert("RGB")); P = wall.shape[1]   # 950 tall, 1381 wide
road = np.asarray(Image.open(os.path.join(FULL, "armoury2_road.png")).convert("RGBA"))
CTX_R = 1536 - CTX_L - P
strip = np.concatenate([wall[:, -CTX_L:], wall, wall[:, :CTX_R]], 1)                       # 1536 x 950
fl = np.concatenate([road, road], 1)[4:4 + 1024 - strip.shape[0], :1536]                                              # the floor's top strip under it
floor = np.where(fl[..., 3:] > 128, fl[..., :3], strip[-1:].repeat(fl.shape[0], 0))
canvas = np.concatenate([strip, floor], 0).copy()
X0, X1 = CTX_L + HALF, CTX_L + P - HALF                                                    # inner faces of the two pillars
canvas[WALL_TOP:strip.shape[0], X0:X1] = 255
Image.fromarray(canvas).save(os.path.join(SRC, "armoury2_module_canvas_1536x1024.png"))
print("canvas", canvas.shape, "white x", X0, X1, "y", WALL_TOP, strip.shape[0], "module = canvas cols", CTX_L, CTX_L + P)
