"""Adds Voidspire II A (outlined style) and B (painted style): enclosed alien ships, heroes behind violet glass (layered: back = dark interior, front = see-through glass).
python3 dev/ships/patch_void.py IN.html OUT.html"""
import sys, base64, io
from PIL import Image
src, out = sys.argv[1], sys.argv[2]; s = open(src).read(); D = "art/originals/ships/voidspire/"; W = 1000
def b64(fn):
    im = Image.open(D + fn).convert("RGBA"); im = im.resize((W, round(im.height * W / im.width)), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, "WEBP", quality=88, method=6); return base64.b64encode(b.getvalue()).decode()
imgs, entries = "", ""
for k, nm, lay in [("A", "Voidspire II A", "h0: [0.75, 0.60], h1: [0.655, 0.60], h2: [0.56, 0.60], h3: [0.465, 0.60], h4: [0.37, 0.60]"),
                   ("B", "Voidspire II B", "h0: [0.745, 0.61], h1: [0.65, 0.61], h2: [0.555, 0.61], h3: [0.46, 0.61], h4: [0.365, 0.61]")]:
    v = "void2" + k
    imgs += ('var ' + v + 'CqImg = new Image(); ' + v + 'CqImg.src = "data:image/webp;base64,' + b64("voidspire" + k + "_back.png") + '";\n'
             'var ' + v + 'Anim = { back: ' + v + 'CqImg, front: new Image(), sheet: new Image(), rx: 0, ry: 0, tw: 1, th: 1, cols: 1, n: 1, fps: 1 };\n'
             + v + 'Anim.front.src = "data:image/webp;base64,' + b64("voidspire" + k + "_front.png") + '";\n')
    entries += ('  { id: "' + v.lower() + '", name: "' + nm + '", cq: ' + v + 'CqImg, gov: ' + v + 'CqImg, cqScale: ' + str(round(400 * 0.5366 / W, 4)) + ', govWidth: 1, lift: 12, anim: ' + v + 'Anim, barsAbove: true, '
                'defLayout: { c: [0.97, 0.52], w0: [0.66, 0.62], w1: [0.5, 0.64], w2: [0.3, 0.62], ' + lay + ', ko: [0.12, 0.55] } },\n')
old = "var FORTRESS_SKINS = ["
s = s.replace(old, '/* v1531 test: Voidspire II A / B (Harley comparing ship styles) - enclosed alien ships, riders behind violet glass. art/originals/ships/voidspire/ */\n' + imgs + old)
old = '  { id: "blackwatch2", name: "Blackwatch II",'
i = s.index(old); j = s.index("\n", i) + 1; s = s[:j] + entries + s[j:]
open(out, "w").write(s); print("ok")
