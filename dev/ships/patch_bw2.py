"""Adds Blackwatch II (layered: back = full hull, front = hull with the gallery opening cut out) and the Arena front-layer draw order.
python3 dev/ships/patch_bw2.py IN.html OUT.html"""
import sys, base64, io
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
s = open(src).read()
D = "art/originals/ships/blackwatch/"
W = 1000
def b64(fn):
    im = Image.open(D + fn).convert("RGBA"); im = im.resize((W, round(im.height * W / im.width)), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, "WEBP", quality=88, method=6); return base64.b64encode(b.getvalue()).decode(), im.size
bk, size = b64("blackwatch2_back.png"); fr, _ = b64("blackwatch2_front.png")
# 1) images + skin entry
old = "var FORTRESS_SKINS = ["
img = ('/* v1530 (Harley, ship designs): Blackwatch II - painted (Bonewake 2 style) redesign with an armoured gallery: the riders stand behind the hull and only their heads and shoulders show through the opening. Layered skin: back = full hull, front = hull with the opening cut out (heroes drawn between). Stored 1000 px wide. art/originals/ships/blackwatch/ */\n'
       'var blackwatch2CqImg = new Image(); blackwatch2CqImg.src = "data:image/webp;base64,' + bk + '";\n'
       'var blackwatch2Anim = { back: blackwatch2CqImg, front: new Image(), sheet: new Image(), rx: 0, ry: 0, tw: 1, th: 1, cols: 1, n: 1, fps: 1 }; /* no moving parts (empty sheet) */\n'
       'blackwatch2Anim.front.src = "data:image/webp;base64,' + fr + '";\n')
assert s.count(old) == 1; s = s.replace(old, img + old)
old = '  { id: "ironclad2", name: "Ironclad II",'
i = s.index(old); j = s.index("\n", i) + 1
sc = round(400 * 0.5366 / W, 4)
entry = ('  { id: "blackwatch2", name: "Blackwatch II", cq: blackwatch2CqImg, gov: blackwatch2CqImg, cqScale: ' + str(sc) + ', govWidth: 1, lift: 12, anim: blackwatch2Anim, '
         'defLayout: { c: [0.555, 0.215], w0: [0.68, 0.80], w1: [0.5, 0.82], w2: [0.3, 0.80], h0: [0.72, 0.875], h1: [0.615, 0.875], h2: [0.51, 0.875], h3: [0.405, 0.875], h4: [0.30, 0.875], ko: [0.12, 0.6] } }, '
         '/* v1530: same on-screen length as Bonewake, aspect kept; hero feet low behind the hull so heads + shoulders fill the opening (y 0.52-0.67 of the picture) */\n')
s = s[:j] + entry + s[j:]
# 2) Arena: layered skins draw the back before the heroes and the front after them (riders stand on the deck since v1529)
old = 'function drawArenaFortress(ctx, w, h, isPlayerSide, shieldSet) {'
assert s.count(old) == 1
s = s.replace(old, 'function drawArenaFortress(ctx, w, h, isPlayerSide, shieldSet, part) { /* v1530: part "back" / "front" - a layered skin draws its back before the riders and its front after them; plain skins draw whole on "back" and nothing on "front" */')
old = '''  if (skinAnimReady(skin)) { /* v1170: layered skin - in the Arena the heroes fight on the ground, so both parts are drawn here */
    if (!isPlayerSide) { ctx.translate(cx, 0); ctx.scale(-1, 1); drawSkinPart(ctx, skin, "back", -sw / 2, y, sw, sh); drawSkinPart(ctx, skin, "front", -sw / 2, y, sw, sh); }
    else { drawSkinPart(ctx, skin, "back", cx - sw / 2, y, sw, sh); if (shieldSet) orbitShieldDrawHull(ctx, shieldSet, skin.anim.front, cx - sw / 2, y, sw, sh); else drawSkinPart(ctx, skin, "front", cx - sw / 2, y, sw, sh); }
  }'''
new = '''  var lay = skinAnimReady(skin), wB = part !== "front", wF = part !== "back";
  if (!lay && !wB) { ctx.restore(); return; }
  if (lay) { /* v1170 layered skin; v1530: back and front drawn in separate passes around the riders */
    if (!isPlayerSide) { ctx.translate(cx, 0); ctx.scale(-1, 1); if (wB) drawSkinPart(ctx, skin, "back", -sw / 2, y, sw, sh); if (wF) drawSkinPart(ctx, skin, "front", -sw / 2, y, sw, sh); }
    else { if (wB) drawSkinPart(ctx, skin, "back", cx - sw / 2, y, sw, sh); if (wF) { if (shieldSet) orbitShieldDrawHull(ctx, shieldSet, skin.anim.front, cx - sw / 2, y, sw, sh); else drawSkinPart(ctx, skin, "front", cx - sw / 2, y, sw, sh); } }
  }'''
assert s.count(old) == 1, "arena layered block"; s = s.replace(old, new)
old = '  drawArenaFortress(ctx, w, h, true, osSetA); drawArenaFortress(ctx, w, h, false);'
assert s.count(old) == 1; s = s.replace(old, '  drawArenaFortress(ctx, w, h, true, osSetA, "back"); drawArenaFortress(ctx, w, h, false, null, "back");')
old = '  drawFormation(arenaAnim.aiRoster, false);\n'
assert s.count(old) == 1; s = s.replace(old, old + '  drawArenaFortress(ctx, w, h, true, osSetA, "front"); drawArenaFortress(ctx, w, h, false, null, "front"); /* v1530: layered hulls in front of the deck riders */\n')
open(out, "w").write(s); print("ok", size, sc)
