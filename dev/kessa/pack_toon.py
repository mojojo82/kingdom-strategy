# v1122: Kessa's "Gareth look" sprites (Harley 13 Oct: option A shading + C1 outline).
# Blender (Harley's PC, KingdomArt\kessa_toon.blend): Gareth's cel shader rebuilt as an emission material - 3 hard light steps (1 / 0.72 / 0.5, cool shadow tint),
# small hard highlight + pale rim, worked out in sRGB like dev/knight/fit.tpl.html; light = camera right*0.55 + up*0.65 + toward camera*0.55; exposure 0, Standard.
# Frames posed from blframes.json (pb.matrix = mw^-1 (C D C^-1) mw bone.matrix_local, then the head turn Spine2 .0825 / Neck .074 / Head .146 rad about world Z),
# rendered 480x600 (crop x150-630 of 900x600) and scaled to 160x200 in Blender -> art/originals/sprites_hires/kessa/toon/raw. Full-size renders: KingdomArt\toon\full_*.png.
# This script: adds the 1 px near-black outline (C1) and rebuilds the Arc Burst frames = toon attack frame + the palm energy lifted off the old softer arc frames
# (old arc minus old attack, kept within ~34 px of the palm), then packs the same sheet layout as pack_final.py and swaps it into test/index.html.
import json, base64, io, re, numpy as np
from PIL import Image, ImageFilter
H = 'art/originals/sprites_hires/kessa/'; R = H + 'toon/raw/'; O = H + 'toon/'
def outline(im):
    a = im.split()[3].point(lambda v: 255 if v > 60 else 0); ring = a.filter(ImageFilter.MaxFilter(3))
    o = Image.new('RGBA', im.size, (18, 15, 20, 0)); o.putalpha(ring); o.alpha_composite(im); return o
idle = [outline(Image.open(R + 'MixamoIdle_%02d.png' % k).convert('RGBA')) for k in range(12)]
att = [outline(Image.open(R + '1HMagicAttacktamed_%02d.png' % k).convert('RGBA')) for k in range(12)]
for k in range(12): idle[k].save(O + 'MixamoIdle_%02d.png' % k); att[k].save(O + '1HMagicAttacktamed_%02d.png' % k)
palms = json.load(open(H + 'arcburst/palms.json')); amap = list(range(7)) + [6, 6, 6] + list(range(7, 12))
def pm(im): a = np.asarray(im.convert('RGBA')).astype(float) / 255; return a[..., :3] * a[..., 3:], a[..., 3]
yy, xx = np.mgrid[:200, :160]; arc = []
for k in range(15):
    oc, oa = pm(Image.open(H + 'arcburst/arc_%02d.png' % k)); bc, ba = pm(Image.open(H + 'softer/1HMagicAttacktamed_%02d.png' % amap[k]))
    w = np.clip((34 - np.hypot(xx - palms[k][0], yy - palms[k][1])) / 10, 0, 1)
    g = np.clip(oc - bc, 0, 1) * w[..., None]; ga = np.clip(oa - ba, 0, 1) * w
    tc, ta = pm(att[amap[k]]); c = np.clip(tc + g, 0, 1); a = np.clip(ta + ga * (1 - ta), 0, 1)
    rgb = np.where(a[..., None] > 0, c / np.maximum(a[..., None], 1e-6), 0)
    im = Image.fromarray((np.concatenate([np.clip(rgb, 0, 1), a[..., None]], axis=2) * 255 + 0.5).astype(np.uint8)); im.save(O + 'arc_%02d.png' % k); arc.append(im)
idle = idle + idle[-2:0:-1]; cw, ch = 160, 200; rows = (idle, att, arc); n = max(len(r) for r in rows)
sheet = Image.new('RGBA', (cw * n, ch * 3))
for r, row in enumerate(rows):
    for k, im in enumerate(row): sheet.alpha_composite(im, (k * cw, r * ch))
b = io.BytesIO(); sheet.save(b, 'WEBP', quality=90, method=6); src = 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()
g = open('test/index.html').read(); pat = re.compile(r'(  kessa: \{ src: ")data:image/webp;base64,[A-Za-z0-9+/=]+(", cw: 160, ch: 200,)')
assert len(pat.findall(g)) == 1; g = pat.sub(lambda m: m.group(1) + src + m.group(2), g); open('test/index.html', 'w').write(g)
print('sheet', sheet.size, 'KB', len(b.getvalue()) // 1024)
