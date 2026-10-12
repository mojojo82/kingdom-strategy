# packs the rendered Kessa frames (attack 12 + idle 12, same camera) into one sheet and builds cmp.html: current sprite vs 3D, Idle / Attack / Arc Burst hold
import sys, glob, json, base64, io, re, numpy as np
from PIL import Image
D = sys.argv[1]
A = sorted(glob.glob(D + '/1HMagicAttacktamed_*.png')); I = sorted(glob.glob(D + '/MixamoIdle_*.png'))
ims = [Image.open(f).convert('RGBA') for f in A + I]; bb = [i.getbbox() for i in ims]
x0 = min(b[0] for b in bb) - 4; y0 = min(b[1] for b in bb) - 4; x1 = max(b[2] for b in bb) + 4; y1 = max(b[3] for b in bb) + 2
H = 240; s = H / (y1 - y0); cw = int(round((x1 - x0) * s))
sheet = Image.new('RGBA', (cw * 12, H * 2))
for k, im in enumerate(ims): sheet.alpha_composite(im.crop((x0, y0, x1, y1)).resize((cw, H), Image.LANCZOS), ((k % 12) * cw, (k // 12) * H))
# feet line: lowest opaque row of the idle frames; figure top: highest opaque row
al = np.asarray(sheet)[..., 3] > 40; rows = np.where(al[H:].any(1))[0]; feet = int(rows.max())
def bodytop(a):  # first row wider than a thin staff: the head, not the staff tip
    w = a.sum(1); return int(np.where(w > w.max() * 0.4)[0].min())
top = bodytop(al[H:H*2, :cw])
# Arc Burst hold frame = attack frame 6 (t~1.13 s, arm fully out); hand = right-most opaque pixel in the top 60% of that frame
hf = 6; a6 = al[:H, hf * cw:(hf + 1) * cw]; ys, xs = np.where(a6[:int(H * 0.62)]); k = xs.argmax(); hand = [int(xs[k]), int(ys[k])]
b = io.BytesIO(); sheet.save(b, 'WEBP', quality=90, method=6); new = 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()
g = open('../../test/index.html').read(); m = re.search(r'  kessa: \{ src: "(data:image/webp;base64,[A-Za-z0-9+/=]+)"', g); old = m.group(1)
oim = Image.open(io.BytesIO(base64.b64decode(old.split(',')[1]))).convert('RGBA'); oa = np.asarray(oim)[..., 3] > 40; orow = np.where(oa[:78].any(1))[0]; otop = bodytop(oa[:78, :85])
cfg = {'new': {'src': new, 'cw': cw, 'ch': H, 'feet': feet, 'top': top, 'hold': hf, 'hand': hand},
       'old': {'src': old, 'cw': 85, 'ch': 78, 'feet': int(orow.max()), 'top': otop}}
import os
BL = os.environ.get('BLENDER_ARC')
if BL:
    bim = Image.open(BL).convert('RGBA'); ba = np.asarray(bim)[..., 3] > 40
    # body only (exclude the bolts to the right of the palm): columns left of 55% width
    sub = ba[:, :int(ba.shape[1] * 0.55)]; brow = np.where(sub.any(1))[0]; btop = bodytop(sub); bb = io.BytesIO(); bim.save(bb, 'WEBP', quality=90)
    cfg['bl'] = {'src': 'data:image/webp;base64,' + base64.b64encode(bb.getvalue()).decode(), 'w': bim.size[0], 'h': bim.size[1], 'feet': int(brow.max()), 'top': btop}
t = open('cmp.tpl.html').read().replace('__CFG__', json.dumps(cfg)); open('cmp.html', 'w').write(t)
print('cell', cw, H, 'feet', feet, 'top', top, 'hand', hand, 'old fig rows', orow.min(), orow.max(), 'KB', len(t) // 1024)
