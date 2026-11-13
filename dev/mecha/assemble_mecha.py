"""Floating mecha (style B pick): key the ChatGPT parts sheet, reassemble the puppet at its joints (pivots measured on mecha_parts_v1.png).
python3 dev/mecha/assemble_mecha.py OUT.png [pose json]"""
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
S = key(np.asarray(Image.open(D + "mecha_parts_v1.png").convert("RGB")))
# part boxes (x0,y0,x1,y1) and pivots (sheet px): p0 = joint to parent, p1 = joint to child
P = {
 "torso": ((346, 292, 1133, 988), {"neck": (860, 575), "shL": (627, 625), "shR": (1060, 640)}),
 "head":  ((610, 33, 900, 280), {"p0": (771, 257)}),
 "nUp":   ((47, 151, 299, 491), {"p0": (185, 280), "p1": (177, 467)}),
 "nFo":   ((67, 504, 238, 767), {"p0": (172, 530), "p1": (179, 742)}),
 "nHa":   ((121, 792, 304, 1004), {"p0": (175, 819)}),
 "fUp":   ((1233, 152, 1450, 494), {"p0": (1296, 271), "p1": (1341, 469)}),
 "fFo":   ((1271, 514, 1430, 767), {"p0": (1332, 535), "p1": (1356, 743)}),
 "fHa":   ((1299, 792, 1435, 999), {"p0": (1355, 816)}),
}
pose = {"head": 0, "nUp": 8, "nFo": -18, "nHa": -8, "fUp": 6, "fFo": -16, "fHa": -6, "dark": 0.78}
if len(sys.argv) > 2: pose.update(json.loads(sys.argv[2]))
def part(n):
    (x0, y0, x1, y1), pv = P[n]; im = Image.fromarray(S[y0:y1, x0:x1].copy())
    lab = np.asarray(im)[..., 3] > 0; l, k = ndimage.label(lab)
    if k > 1: big = l == (np.argmax(ndimage.sum(lab, l, range(1, k + 1))) + 1); a = np.asarray(im).copy(); a[..., 3] = a[..., 3] * ndimage.binary_dilation(big, iterations=3); im = Image.fromarray(a)
    return im, {k2: (v[0] - x0, v[1] - y0) for k2, v in pv.items()}
W, H = 1500, 1300; canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
def put(n, at, ang, dark=1.0):
    im, pv = part(n); p0 = pv.get("p0", (0, 0)); pad = 400
    big = Image.new("RGBA", (im.width + 2 * pad, im.height + 2 * pad)); big.paste(im, (pad, pad))
    if dark != 1.0: a = np.asarray(big).astype(np.float32); a[..., :3] *= dark; big = Image.fromarray(a.astype(np.uint8))
    c = (p0[0] + pad, p0[1] + pad); big = big.rotate(ang, center=c, resample=Image.BICUBIC)
    canvas.alpha_composite(big, (int(round(at[0] - c[0])), int(round(at[1] - c[1]))))
    if "p1" in pv:   # child joint after rotation (PIL rotates counter-clockwise for +ang; y is down)
        dx, dy = pv["p1"][0] - p0[0], pv["p1"][1] - p0[1]; r = math.radians(ang)
        return (at[0] + dx * math.cos(r) + dy * math.sin(r), at[1] - dx * math.sin(r) + dy * math.cos(r))
TO = (300, 250); tim, tpv = part("torso")
J = {k: (TO[0] + v[0], TO[1] + v[1]) for k, v in tpv.items()}
def arm(pre, sh, a, dark=1.0):
    e = put(pre + "Up", sh, pose[pre + "Up"], dark); w = None
    return e
# far arm (behind the torso)
e = put("fUp", J["shR"], pose["fUp"], pose["dark"]); w = put("fFo", e, pose["fUp"] + pose["fFo"], pose["dark"]); put("fHa", w, pose["fUp"] + pose["fFo"] + pose["fHa"], pose["dark"])
# re-draw order for the far arm: hand, forearm, upper arm (upper arm on top)
canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
e = (0, 0)
def chain(pre, sh, dark):
    global canvas
    # compute joints first
    im, pv = part(pre + "Up"); a1 = pose[pre + "Up"]
    def rot(v, ang): r = math.radians(ang); return (v[0] * math.cos(r) + v[1] * math.sin(r), -v[0] * math.sin(r) + v[1] * math.cos(r))
    v = (pv["p1"][0] - pv["p0"][0], pv["p1"][1] - pv["p0"][1]); d = rot(v, a1); el = (sh[0] + d[0], sh[1] + d[1])
    im2, pv2 = part(pre + "Fo"); a2 = a1 + pose[pre + "Fo"]
    v2 = (pv2["p1"][0] - pv2["p0"][0], pv2["p1"][1] - pv2["p0"][1]); d2 = rot(v2, a2); wr = (el[0] + d2[0], el[1] + d2[1])
    put(pre + "Ha", wr, a2 + pose[pre + "Ha"], dark); put(pre + "Fo", el, a2, dark); put(pre + "Up", sh, a1, dark)
chain("f", J["shR"], pose["dark"])
canvas.alpha_composite(tim, TO)
put("head", J["neck"], pose["head"])
chain("n", J["shL"], 1.0)
bb = canvas.getbbox(); out = canvas.crop((bb[0] - 10, bb[1] - 10, bb[2] + 10, bb[3] + 10))
out.save(sys.argv[1]); print("saved", out.size)
