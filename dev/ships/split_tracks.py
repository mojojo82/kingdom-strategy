"""Crawler: split the hull from the treads. Aligns the ChatGPT tread unit (no covers) under the original ship (same length + bottom, even scale),
cuts the treads off the hull (HULL_CUT y, minus HOLES discs, plus KEEP polygons for armour hanging below the cut), writes:
  crawler<K>_hull.png (hull only, treads removed), crawler<K>_treads_aligned.png (tread unit on the ship's canvas), crawler<K>_split_check.png
python3 dev/ships/split_tracks.py K '{"cut":800,"holes":[[262,797,66]],"keep":[[[x,y],...]],"track_x":[119,1294],"bottom":902}'"""
import sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
K, C = sys.argv[1], json.loads(sys.argv[2]); D = "art/originals/ships/crawler/"
ship = Image.open(D + "crawler_%s_cut.png" % K).convert("RGBA"); W, H = ship.size
tr = Image.open(D + "crawler_%s_tracks_cut.png" % K).convert("RGBA")
x0, x1 = C["track_x"]; s = (x1 - x0 + 1) / tr.width; tr2 = tr.resize((round(tr.width * s), round(tr.height * s)), Image.LANCZOS)
al = Image.new("RGBA", (W, H), (0, 0, 0, 0)); al.alpha_composite(tr2, (x0, C["bottom"] + 1 - tr2.height))
m = Image.new("L", (W, H), 0); d = ImageDraw.Draw(m); d.rectangle([0, 0, W, C["cut"]], fill=255)
for poly in C.get("keep", []): d.polygon([tuple(p) for p in poly], fill=255)
for cx, cy, r in C.get("holes", []): d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=0)
m = m.filter(ImageFilter.GaussianBlur(1.2))
hull = np.asarray(ship).copy(); hull[..., 3] = (hull[..., 3].astype(float) * np.asarray(m) / 255).astype(np.uint8)
Image.fromarray(hull).save(D + "crawler%s_hull.png" % K); al.save(D + "crawler%s_treads_aligned.png" % K)
comp = Image.new("RGBA", (W, H), (60, 60, 80, 255)); comp.alpha_composite(al); comp.alpha_composite(Image.fromarray(hull))
comp.crop((0, int(H * 0.68), W, H)).convert("RGB").save(D + "crawler%s_split_check.png" % K)
print(K, "scale", round(s, 4), "treads top", C["bottom"] + 1 - tr2.height, "size", tr2.size)
