"""Adds Voidspire II A (outlined style) and B (painted style): enclosed alien ships, heroes behind violet glass (layered: back = dark interior, front = see-through glass).
python3 dev/ships/patch_void.py IN.html OUT.html"""
import sys, base64, io
from PIL import Image
src, out = sys.argv[1], sys.argv[2]; s = open(src).read(); D = "art/originals/ships/voidspire/"; W = 1000
def b64(fn):
    im = Image.open(D + fn).convert("RGBA"); im = im.resize((W, round(im.height * W / im.width)), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, "WEBP", quality=88, method=6); return base64.b64encode(b.getvalue()).decode()
imgs, entries = "", ""
for k, nm, mf, lay in [("A", "Voidspire II A", 0.82, "h0: [0.75, 0.736], h1: [0.655, 0.736], h2: [0.56, 0.736], h3: [0.465, 0.736], h4: [0.37, 0.736]"),
                   ("B", "Voidspire II B", 0.79, "h0: [0.745, 0.734], h1: [0.65, 0.734], h2: [0.555, 0.734], h3: [0.46, 0.734], h4: [0.365, 0.734]")]:
    v = "void2" + k
    imgs += ('var ' + v + 'CqImg = new Image(); ' + v + 'CqImg.src = "data:image/webp;base64,' + b64("voidspire" + k + "fin_back.png") + '";\n'
             'var ' + v + 'Anim = { back: ' + v + 'CqImg, front: new Image(), sheet: new Image(), rx: 0, ry: 0, tw: 1, th: 1, cols: 1, n: 1, fps: 1 };\n'
             + v + 'Anim.front.src = "data:image/webp;base64,' + b64("voidspire" + k + "fin_front.png") + '";\n')
    entries += ('  { id: "' + v.lower() + '", name: "' + nm + '", cq: ' + v + 'CqImg, gov: ' + v + 'CqImg, cqScale: ' + str(round(400 * 0.5366 / W, 4)) + ', govWidth: 1, lift: 10, anim: ' + v + 'Anim, barsAbove: true, meleeFront: ' + str(mf) + ', '
                'defLayout: { c: [0.97, 0.52], w0: [0.66, 0.62], w1: [0.5, 0.64], w2: [0.3, 0.62], ' + lay + ', ko: [0.12, 0.55] } },\n')
old = "var FORTRESS_SKINS = ["
s = s.replace(old, '/* v1531 test: Voidspire II A / B (Harley comparing ship styles) - enclosed alien ships, riders behind violet glass; lower fin cut to a third (Harley: low enough for melee swings to land on the hull), lift 10. art/originals/ships/voidspire/ */\n' + imgs + old)
old = '  { id: "blackwatch2", name: "Blackwatch II",'
i = s.index(old); j = s.index("\n", i) + 1; s = s[:j] + entries + s[j:]
# Arena: melee heroes stop at the skin's meleeFront (fraction of the picture from the back) instead of the picture's front edge - a long nose spear has only air under it
old = "          var endX = isPlayerSide ? ocxN - oswN / 2 - 6 : ocxN + oswN / 2 + 6;"
assert s.count(old) == 1, "endX"
s = s.replace(old, "          var mfN = oswN * ((oppSkinN.meleeFront || 1) - 0.5), endX = isPlayerSide ? ocxN - mfN - 6 : ocxN + mfN + 6; /* v1531: meleeFront = where the hull is low enough to hit (Voidspire's nose spear has air under it) */")
open(out, "w").write(s); print("ok")
