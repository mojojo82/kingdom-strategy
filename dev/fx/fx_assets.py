"""Key + slice the ChatGPT VFX sheets (green screen) into transparent pieces for the Fear mockups.
Outputs art/originals/heroes/siphon/fx/cut/: puff_00..15.png, energy_strip.png (tileable), link_face_0/1.png, link_edge_0/1.png"""
import os
import numpy as np
from PIL import Image
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "art/originals/heroes/siphon/fx"); O = os.path.join(D, "cut"); os.makedirs(O, exist_ok=True)
def key(path):
    a = np.asarray(Image.open(path).convert("RGB")).astype(np.float32); M = np.median(a[:20].reshape(-1, 3), 0)
    d = a[..., 1] - np.maximum(a[..., 0], a[..., 2]); dm = M[1] - max(M[0], M[2]); al = np.clip(1 - (d - 20) / (dm * 0.8 - 20), 0, 1)
    c = np.clip((a - (1 - al[..., None]) * M) / np.maximum(al[..., None], 1e-3), 0, 255); c[..., 1] = np.minimum(c[..., 1], c[..., 2] + 6)   # these sheets are black / red only: no green above blue
    al[al < 0.04] = 0; return Image.fromarray(np.dstack([c, al * 255]).astype(np.uint8), "RGBA")
def trim(im, pad=4):
    bb = im.getchannel("A").point(lambda v: 255 if v > 6 else 0).getbbox(); return im.crop((max(0, bb[0] - pad), max(0, bb[1] - pad), min(im.width, bb[2] + pad), min(im.height, bb[3] + pad)))
p = key(os.path.join(D, "fx_smoke_puffs_v1.png")); cw = p.width / 4
for i in range(16): trim(p.crop((round((i % 4) * cw), round((i // 4) * cw), round((i % 4 + 1) * cw), round((i // 4 + 1) * cw)))).save(os.path.join(O, "puff_%02d.png" % i))
s = key(os.path.join(D, "fx_energy_strip_v1.png")); bb = s.getchannel("A").point(lambda v: 255 if v > 6 else 0).getbbox(); s.crop((0, bb[1], s.width, bb[3])).save(os.path.join(O, "energy_strip.png"))
l = key(os.path.join(D, "fx_chain_links_v1.png")); A = np.asarray(l)[..., 3] > 20; cols = A.any(0); xs = np.nonzero(cols)[0]
runs = []; st = xs[0]
for a_, b_ in zip(xs, xs[1:]):
    if b_ - a_ > 8: runs.append((st, a_)); st = b_
runs.append((st, xs[-1])); names = ["link_face_0", "link_edge_0", "link_face_1", "link_edge_1"]
for (x0, x1), n in zip(runs, names): trim(l.crop((x0, 0, x1 + 1, l.height))).save(os.path.join(O, n + ".png"))
print("runs", len(runs), [Image.open(os.path.join(O, n + ".png")).size for n in names], Image.open(os.path.join(O, "energy_strip.png")).size)
