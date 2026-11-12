"""Adds the Walker test skin (Ironclad walker: body + Atlas leg walk cycle in front of it, body bob synced to the legs) and the drawSkinPart support
(anim.sw/sh = stored sheet frame size if smaller than tw/th; anim.bobTrack = per-frame body offset). python3 dev/ships/patch_walker.py IN.html OUT.html"""
import sys, json, base64, io
from PIL import Image
src, out = sys.argv[1], sys.argv[2]; s = open(src).read(); D = "art/originals/ships/walker/"
J = json.load(open(D + "walker_anim.json"))
def b64png(fn):
    b = io.BytesIO(); Image.open(D + fn).convert("RGBA").save(b, "WEBP", quality=88, method=6); return base64.b64encode(b.getvalue()).decode()
sheet = base64.b64encode(open(D + "walker_legs_sheet.webp", "rb").read()).decode()
img = ('/* v1535 (Harley): Walker - Ironclad walker (his blockout, style B): body from ChatGPT (legs removed), legs = Atlas walk cycle drawn in front of the body (far legs tucked behind it), body bob follows the leg tops (bobTrack). Open window slit, empty cannon bay under the nose. art/originals/ships/walker/ */\n'
       'var walkerCqImg = new Image(); walkerCqImg.src = "data:image/webp;base64,' + b64png("walker_back.png") + '";\n'
       'var walkerAnim = { back: walkerCqImg, front: new Image(), sheet: new Image(), walk: true, over: true, rx: %s, ry: %s, tw: %d, th: %d, sw: %d, sh: %d, cols: %d, n: %d, fps: %d, bobTrack: %s };\n' % (J["rx"], J["ry"], J["tw"], J["th"], J["sw"], J["sh"], J["cols"], J["n"], J["fps"], json.dumps(J["bobTrack"]))
       + 'walkerAnim.front.src = "data:image/webp;base64,' + b64png("walker_front.png") + '";\nwalkerAnim.sheet.src = "data:image/webp;base64,' + sheet + '";\n')
s = s.replace("var FORTRESS_SKINS = [", img + "var FORTRESS_SKINS = [", 1)
lay = ", ".join("h%d: [%s, %s]" % (i, x, J["feet"]) for i, x in enumerate(J["spots"]))
entry = ('  { id: "walker", name: "Walker", cq: walkerCqImg, gov: walkerCqImg, cqScale: 0.2146, govWidth: 1, lift: 0, anim: walkerAnim, barsAbove: true, '
         'defLayout: { c: ' + json.dumps(J["c"]) + ', w0: [0.7, 0.45], w1: [0.5, 0.47], w2: [0.3, 0.45], ' + lay + ', ko: [0.1, 0.55] } }, /* v1535 */\n')
old = '  { id: "crawlerb", name: "Crawler B",'
i = s.index(old); s = s[:i] + entry + s[i:]
old = '''    ctx.drawImage(a.sheet, (f % a.cols) * a.tw, Math.floor(f / a.cols) * a.th, a.tw, a.th, x + a.rx * k, y + a.ry * k, a.tw * k, a.th * k);'''
assert s.count(old) == 1, "sheet draw"
s = s.replace(old, '''    var sw = a.sw || a.tw, sh = a.sh || a.th; /* v1535: a sheet can be stored smaller than it is drawn (walker legs at 0.6) */
    ctx.drawImage(a.sheet, (f % a.cols) * sw, Math.floor(f / a.cols) * sh, sw, sh, x + a.rx * k, y + a.ry * k, a.tw * k, a.th * k);''')
old = 'function hullBobPx(a, h) { var t = performance.now() / 1000; return h * a.bob * (0.6 * Math.sin(t * 13.8) + 0.4 * Math.sin(t * 33.3 + 1)); }'
assert s.count(old) == 1, "bob"
s = s.replace(old, 'function hullBobPx(a, h) { var t = performance.now() / 1000; if (a.bobTrack) { var ft = t * a.fps, f0 = Math.floor(ft) % a.n, f1 = (f0 + 1) % a.n, u = ft - Math.floor(ft); return h * (a.bobTrack[f0] * (1 - u) + a.bobTrack[f1] * u); } return h * a.bob * (0.6 * Math.sin(t * 13.8) + 0.4 * Math.sin(t * 33.3 + 1)); } /* v1535: bobTrack = per-frame offsets that follow a walk cycle */')
for old, new in [("var bdy = a.bob ? hullBobPx(a, h) : 0;", "var bdy = (a.bob || a.bobTrack) ? hullBobPx(a, h) : 0;"),
                 ("bd = A && A.bob ? hullBobPx(A, box.sh) : 0;", "bd = A && (A.bob || A.bobTrack) ? hullBobPx(A, box.sh) : 0;")]:
    assert s.count(old) == 1, old; s = s.replace(old, new)

# level numbers of riders inside a layered hull with barsAbove: drawn above the HP bar (under their feet the hull hides them - or not, on the walker)
old = "ctx.fillText(String(sprite.h.level), slot.x, slot.y + size / 2 + 10);"
assert s.count(old) == 4, s.count(old)
s = s.replace(old, "ctx.fillText(String(sprite.h.level), slot.x, (slot.deck && (isPlayerSide ? fortressSkin() : (arenaAnim.aiFortressSkin || FORTRESS_SKINS[0])).barsAbove) ? slot.y - 28 : slot.y + size / 2 + 10);")
open(out, "w").write(s); print("ok")
