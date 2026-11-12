"""Adds the tall rusty tracked crawler test skins (open window row, heroes' heads + shoulders through it; layered: back = full ship, front = openings cut out).
python3 dev/ships/patch_crawler.py IN.html OUT.html [A B C]"""
import sys, base64, io, os
from PIL import Image
src, out = sys.argv[1], sys.argv[2]; which = sys.argv[3:] or ["A", "C"]
s = open(src).read(); D = "art/originals/ships/crawler/"; W = 1000
CFG = {  # hero spot x = window bay centres (front = h0), y = feet so heads fill the bays; c = cannon on the front platform; meleeFront = lower hull front
    "A": ("Crawler A", [0.715, 0.622, 0.529, 0.437, 0.344], 0.59, [0.93, 0.62], 0.95),
    "B": ("Crawler B", None, 0.59, [0.93, 0.62], 0.95),
    "C": ("Crawler C", [0.708, 0.626, 0.545, 0.462, 0.376], 0.60, [0.93, 0.66], 0.95)}
if os.environ.get("B_SPOTS"): CFG["B"] = ("Crawler B", [float(x) for x in os.environ["B_SPOTS"].split(",")], float(os.environ.get("B_FEET", 0.59)), [0.93, float(os.environ.get("B_CY", 0.62))], 0.95)
def b64(fn):
    im = Image.open(D + fn).convert("RGBA"); im = im.resize((W, round(im.height * W / im.width)), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, "WEBP", quality=88, method=6); return base64.b64encode(b.getvalue()).decode()
imgs, entries = "", ""
for k in which:
    nm, xs, fy, c, mf = CFG[k]; v = "crawler" + k
    imgs += ('var ' + v + 'CqImg = new Image(); ' + v + 'CqImg.src = "data:image/webp;base64,' + b64("crawler" + k + "_back.png") + '";\n'
             'var ' + v + 'Anim = { back: ' + v + 'CqImg, front: new Image(), sheet: new Image(), rx: 0, ry: 0, tw: 1, th: 1, cols: 1, n: 1, fps: 1 };\n'
             + v + 'Anim.front.src = "data:image/webp;base64,' + b64("crawler" + k + "_front.png") + '";\n')
    lay = ", ".join("h%d: [%s, %s]" % (i, x, fy) for i, x in enumerate(xs))
    entries += ('  { id: "' + v.lower() + '", name: "' + nm + '", cq: ' + v + 'CqImg, gov: ' + v + 'CqImg, cqScale: ' + str(round(400 * 0.5366 / W, 4)) + ', govWidth: 1, lift: 6, anim: ' + v + 'Anim, barsAbove: true, meleeFront: ' + str(mf) + ', '
                'defLayout: { c: ' + str(c) + ', w0: [0.75, 0.8], w1: [0.55, 0.82], w2: [0.3, 0.8], ' + lay + ', ko: [0.1, 0.85] } },\n')
old = "var FORTRESS_SKINS = ["
s = s.replace(old, '/* v1533 test: Crawler A/B/C - tall rusty tracked fortress (Harley brief: tank treads, brown rust, TALL, open window row, front cannon platform); A outlined, B painted, C Bonewake-1 gritty. art/originals/ships/crawler/ */\n' + imgs + old)
old = '  { id: "void2b", name: "Voidspire II B",'
i = s.index(old); j = s.index("\n", i) + 1; s = s[:j] + entries + s[j:]
open(out, "w").write(s); print("ok", which)
