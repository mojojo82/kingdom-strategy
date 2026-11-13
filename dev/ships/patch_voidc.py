"""Voidspire III A / B (style C, gritty Bonewake 1 look) - the Voidspire II A/B designs restyled; glass windows like Voidspire II.
python3 dev/ships/patch_voidc.py IN.html OUT.html"""
import sys, base64, io
from PIL import Image
src, out = sys.argv[1], sys.argv[2]; s = open(src).read(); D = "art/originals/ships/voidspire/"; W = 1000
def b64(fn):
    im = Image.open(D + fn).convert("RGBA"); im = im.resize((W, round(im.height * W / im.width)), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, "WEBP", quality=88, method=6); return base64.b64encode(b.getvalue()).decode()
imgs, entries = "", ""
for k, nm, mf, lay in [("A", "Voidspire III A", 0.82, "h0: [0.75, 0.736], h1: [0.655, 0.736], h2: [0.56, 0.736], h3: [0.465, 0.736], h4: [0.37, 0.736]"),
                       ("B", "Voidspire III B", 0.79, "h0: [0.745, 0.734], h1: [0.65, 0.734], h2: [0.555, 0.734], h3: [0.46, 0.734], h4: [0.365, 0.734]")]:
    v = "void3" + k
    imgs += ('var ' + v + 'CqImg = new Image(); ' + v + 'CqImg.src = "data:image/webp;base64,' + b64("voidspireC_" + k + "_back.png") + '";\n'
             'var ' + v + 'Anim = { back: ' + v + 'CqImg, front: new Image(), sheet: new Image(), rx: 0, ry: 0, tw: 1, th: 1, cols: 1, n: 1, fps: 1 };\n'
             + v + 'Anim.front.src = "data:image/webp;base64,' + b64("voidspireC_" + k + "_front.png") + '";\n')
    entries += ('  { id: "' + v.lower() + '", name: "' + nm + '", cq: ' + v + 'CqImg, gov: ' + v + 'CqImg, cqScale: ' + str(round(400 * 0.5366 / W, 4)) + ', govWidth: 1, lift: 10, anim: ' + v + 'Anim, barsAbove: true, meleeFront: ' + str(mf) + ', '
                'defLayout: { c: [0.97, 0.52], w0: [0.66, 0.62], w1: [0.5, 0.64], w2: [0.3, 0.62], ' + lay + ', ko: [0.12, 0.55] } },\n')
old = "var FORTRESS_SKINS = ["
assert s.count(old) == 1
s = s.replace(old, '/* v1561: Voidspire III A / B - the Voidspire II designs in style C (gritty Bonewake 1 look; Harley: II was too bright and cartoony). art/originals/ships/voidspire/voidspireC_* */\n' + imgs + old)
old = '  { id: "void2b",'
i = s.index(old); j = s.index("\n", i) + 1; s = s[:j] + entries + s[j:]
s = s.replace('void2a: [[0.66, 0.62], [0.5, 0.64], [0.3, 0.62]], void2b: [[0.66, 0.62], [0.5, 0.64], [0.3, 0.62]],', 'void2a: [[0.66, 0.62], [0.5, 0.64], [0.3, 0.62]], void2b: [[0.66, 0.62], [0.5, 0.64], [0.3, 0.62]], void3a: [[0.66, 0.62], [0.5, 0.64], [0.3, 0.62]], void3b: [[0.66, 0.62], [0.5, 0.64], [0.3, 0.62]],')
s = s.replace('void2a: [0.50, 0.60], void2b: [0.50, 0.60],', 'void2a: [0.50, 0.60], void2b: [0.50, 0.60], void3a: [0.50, 0.60], void3b: [0.50, 0.60],')
open(out, "w").write(s); print("ok", s.count("void3a"))
