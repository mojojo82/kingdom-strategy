"""Mecha fortress skin (v1547): back layer = the floating mecha (mecha_float_v13.png), front layer = the 5 flat hero platforms
(heroes are drawn between the two layers, so they stand inside the platform rails). Writes mecha_back.png / mecha_front.png /
mecha_gov.png (both merged) at 1000 px wide + mecha_layout.json (hero feet h0-h4, cannon, weapon mounts, meleeFront as picture fractions).
python3 dev/mecha/build_mecha_skin.py"""
import json
import numpy as np
from PIL import Image
D = "art/originals/ships/mecha/"
mech = Image.open(D + "mecha_float_v13.png").convert("RGBA"); MW, MH = mech.size
plat = Image.open(D + "mecha_platform_flat_cut.png").convert("RGBA")
MS = 1.45   # v1548: mecha 20% bigger, platforms keep their on-screen size
PW = round(MW * 0.28 / MS); plat = plat.resize((PW, round(plat.height * PW / plat.width)), Image.LANCZOS); PH = plat.height
FLOOR = 0.38   # hero feet = 38 % down the platform picture (inside the rail)
# platform centres-top as fractions of the mecha box: h0/h1 front (enemy side, right), h2 above the halo, h3/h4 back
SP = {"h0": (1.02, 0.46), "h1": (1.02, 0.70), "h2": (1.02, 0.22), "h3": (1.21, 0.34), "h4": (1.21, 0.58)}   # v1547b: none behind the mecha (the back of a fortress is off-screen in Conquest)
pts = {k: (fx * MW - PW / 2, fy * MH) for k, (fx, fy) in SP.items()}
x0 = min(0, min(p[0] for p in pts.values())) - 8 - MW * 0.2;   # transparent space behind the mecha: moves it right so its back is not cut off at the screen edge
y0 = min(0, min(p[1] for p in pts.values())) - 8
x1 = max(MW, max(p[0] + PW for p in pts.values())) + 8; y1 = max(MH, max(p[1] + PH for p in pts.values())) + 8
W, H = int(x1 - x0), int(y1 - y0); ox, oy = -x0, -y0
back = Image.new("RGBA", (W, H)); back.alpha_composite(mech, (int(ox), int(oy)))
front = Image.new("RGBA", (W, H))
for k, (px, py) in pts.items(): front.alpha_composite(plat, (int(ox + px), int(oy + py)))
# v1552 (Harley): platforms are separate pictures that hover on their own (drawWalker... no - drawMechaPlats); the profile picture is the mecha only,
# with its own platform spots (closer in, may overlap the body) shown as separate floating elements.
GS = {"l1": (0.16, 0.30), "l2": (0.10, 0.62), "r1": (0.84, 0.10), "r2": (0.92, 0.40), "r3": (0.84, 0.70)}
GW, GH = MW + 16, MH + 16; gox = goy = 8
gov = Image.new("RGBA", (GW, GH)); gov.alpha_composite(mech, (gox, goy))
KG = 1000 / GW
K = 1000 / W; size = (1000, round(H * K))
GOVXF = {"s": round(KG / K, 4), "x": round((gox - int(ox)) * KG, 1), "y": round((goy - int(oy)) * KG, 1)}   # cq px -> gov px (weapon barrels)
for im, n in ((back, "mecha_back.png"), (front, "mecha_front.png")): im.resize(size, Image.LANCZOS).save(D + n)
plat.resize((round(PW * K * 1.5), round(PH * K * 1.5)), Image.LANCZOS).save(D + "mecha_plat.png")   # one platform, 1.5x its on-screen size
gov.resize((1000, round(GH * KG)), Image.LANCZOS).save(D + "mecha_gov.png")
def f(x, y): return [round((ox + x) / W, 3), round((oy + y) / H, 3)]
L = {k: f(px + PW / 2, py + PH * FLOOR) for k, (px, py) in pts.items()}
L.update({"c": f(MW * 0.585, MH * 0.38), "w0": f(MW * 0.66, MH * 0.47), "w1": f(MW * 0.47, MH * 0.58), "w2": f(MW * 0.25, MH * 0.46), "ko": f(MW * 0.12, MH * 0.5)})
meleeFront = round((ox + MW * 0.86) / W, 3)   # melee heroes stop at the staff / hand
CQS = round(125 * MS / 0.85 / (MW * K), 4)
PL = {k: [round((ox + px) / W, 4), round((oy + py) / H, 4)] for k, (px, py) in pts.items()}
GPL = [[round((gox + fx * MW - PW / 2) / GW, 4), round((goy + fy * MH) / GH, 4)] for k, (fx, fy) in GS.items()]
json.dump({"plats": {"w": round(PW / W, 4), "h": round(PH / H, 4), "at": PL, "gov": GPL, "gw": round(PW / GW, 4), "gh": round(PH / GH, 4)},
                "govXf": GOVXF, "govWidth": round(MW * K * CQS * 0.85 * 3.097 / 565, 3),   # v1551/v1552: same size vs other skins as in battle (profile/battle ratio 3.097)
                "size": size, "layout": L, "meleeFront": meleeFront, "cqScale": CQS}, open(D + "mecha_layout.json", "w"))
print(size, json.dumps(L), meleeFront)
