"""Floating mecha v2 (Harley): limbs float apart with a magic gap - parts sheet mecha_parts_v2.png (head, torso, upper arms, forearm+hand
as one piece, no ball joints). python3 dev/mecha/assemble_mecha2.py OUT.png [json overrides]"""
import sys, json, math
import numpy as np
from PIL import Image
from scipy import ndimage
D = "art/originals/ships/mecha/"
def key(a):
    a = a.astype(np.float32); d = np.minimum(a[..., 0], a[..., 2]) - a[..., 1]
    al = np.clip(1 - (d - 25) / (255 * 0.85 - 25), 0, 1); M = np.array([255, 0, 255])
    c = np.clip((a - (1 - al[..., None]) * M) / np.maximum(al[..., None], 1e-3), 0, 255)
    sp = (c[..., 0] > c[..., 1] + 12) & (c[..., 2] > c[..., 1] + 12); c[sp] = c[sp] * 0.4 + np.stack([c[..., 1]] * 3, -1)[sp] * 0.6
    al[al < 0.04] = 0; return np.dstack([c, al * 255]).astype(np.uint8)
S = key(np.asarray(Image.open(D + "mecha_parts_v2.png").convert("RGB")))
# boxes and anchor points (sheet px)
P = {"torso": (401, 254, 1131, 938), "head": (706, 17, 963, 244), "nUp": (47, 262, 339, 617), "nFo": (34, 644, 423, 947), "fUp": (1224, 315, 1428, 616), "fFo": (1225, 655, 1452, 936)}
A = {"neck": (848, 492), "shN": (612, 636), "shF": (1062, 596), "headB": (838, 236),
     "nUp_sh": (232, 385), "nUp_el": (195, 600), "nFo_el": (98, 690), "fUp_sh": (1318, 400), "fUp_el": (1322, 602), "fFo_el": (1268, 698)}
C = {"gapHead": -34, "gapEl": [10, -36], "foScale": 1.15, "far": 0.85, "farDark": 0.8, "rotNUp": 0, "rotNFo": 0, "rotFUp": 0, "rotFFo": 0}
if len(sys.argv) > 2: C.update(json.loads(sys.argv[2]))
W, H = 1700, 1400; cv = Image.new("RGBA", (W, H)); O = (450, 300)   # torso offset on the canvas
def crop(n):
    x0, y0, x1, y1 = P[n]; im = S[y0:y1, x0:x1].copy(); al = im[..., 3] > 0; l, k = ndimage.label(al)
    if k > 1: big = l == (np.argmax(ndimage.sum(al, l, range(1, k + 1))) + 1); im[..., 3] = im[..., 3] * ndimage.binary_dilation(big, iterations=3)
    return Image.fromarray(im), (x0, y0)
def put(n, anchor_sheet, at, scale=1.0, rot=0.0, dark=1.0):
    im, (x0, y0) = crop(n); ax, ay = anchor_sheet[0] - x0, anchor_sheet[1] - y0
    if scale != 1.0: im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS); ax, ay = ax * scale, ay * scale
    if dark != 1.0: a = np.asarray(im).astype(np.float32); a[..., :3] *= dark; im = Image.fromarray(a.astype(np.uint8))
    pad = 300; big = Image.new("RGBA", (im.width + 2 * pad, im.height + 2 * pad)); big.paste(im, (pad, pad)); c = (ax + pad, ay + pad)
    if rot: big = big.rotate(rot, center=c, resample=Image.BICUBIC)
    cv.alpha_composite(big, (round(at[0] - c[0]), round(at[1] - c[1])))
def T(p): return (O[0] + p[0] - P["torso"][0], O[1] + p[1] - P["torso"][1])
def rel(n, a, b, scale=1.0, rot=0.0):   # where sheet point b lands when sheet point a of part n is placed (scaled, rotated)
    dx, dy = (b[0] - a[0]) * scale, (b[1] - a[1]) * scale; r = math.radians(rot)
    return dx * math.cos(r) + dy * math.sin(r), -dx * math.sin(r) + dy * math.cos(r)
f = C["far"]; g = C["gapEl"]
# far arm (behind the torso)
sh = T(A["shF"]); e = rel("fUp", A["fUp_sh"], A["fUp_el"], f, C["rotFUp"]); el = (sh[0] + e[0] + g[0] * f, sh[1] + e[1] + g[1] * f)
put("fUp", A["fUp_sh"], sh, f, C["rotFUp"], C["farDark"]); put("fFo", A["fFo_el"], el, f * C["foScale"], C["rotFFo"], C["farDark"])   # forearm in front, covering the upper arm end (Harley)
# torso + head
tim, _ = crop("torso"); cv.alpha_composite(tim, O)
nk = T(A["neck"]); put("head", A["headB"], (nk[0], nk[1] - C["gapHead"]))
# near arm
sh = T(A["shN"]); e = rel("nUp", A["nUp_sh"], A["nUp_el"], 1.0, C["rotNUp"]); el = (sh[0] + e[0] + g[0], sh[1] + e[1] + g[1])
put("nUp", A["nUp_sh"], sh, 1.0, C["rotNUp"]); put("nFo", A["nFo_el"], el, C["foScale"], C["rotNFo"])
bb = cv.getbbox(); cv.crop((bb[0] - 10, bb[1] - 10, bb[2] + 10, bb[3] + 10)).save(sys.argv[1]); print("saved", bb)
