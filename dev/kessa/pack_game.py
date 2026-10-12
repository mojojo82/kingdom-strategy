# Kessa game sheet for a TEST mockup: row 0 = idle ping-pong (12 frames + 10 back = 22), row 1 = attack (12). Same body height as the old pixel Kessa.
import sys, glob, json, base64, io, re, numpy as np
from PIL import Image
D = sys.argv[1]; OUT = sys.argv[2]
A = sorted(glob.glob(D + '/1HMagicAttacktamed_*.png')); I = sorted(glob.glob(D + '/MixamoIdle_*.png'))
idle = [Image.open(f).convert('RGBA') for f in I]; idle = idle + idle[-2:0:-1]
att = [Image.open(f).convert('RGBA') for f in A]
allf = idle + att; bb = [i.getbbox() for i in allf]
x0 = min(b[0] for b in bb) - 4; y0 = min(b[1] for b in bb) - 4; x1 = max(b[2] for b in bb) + 4; y1 = max(b[3] for b in bb) + 2
H = 300; s = H / (y1 - y0); cw = int(round((x1 - x0) * s)); n = max(len(idle), len(att))
sheet = Image.new('RGBA', (cw * n, H * 2))
for r, row in enumerate((idle, att)):
    for k, im in enumerate(row): sheet.alpha_composite(im.crop((x0, y0, x1, y1)).resize((cw, H), Image.LANCZOS), (k * cw, r * H))
al = np.asarray(sheet)[..., 3] > 40
def bodytop(a): w = a.sum(1); return int(np.where(w > w.max() * 0.4)[0].min())
c0 = al[:H, :cw]; rows = np.where(c0.any(1))[0]; feet = int(rows.max()); top = bodytop(c0)
cols = np.where(c0[feet - 12:feet + 1].any(0))[0]; ax = float((cols.min() + cols.max()) / 2)
g = open('../../test/index.html').read(); m = re.search(r'  kessa: \{ src: "(data:image/webp;base64,[A-Za-z0-9+/=]+)"', g)
oim = Image.open(io.BytesIO(base64.b64decode(m.group(1).split(',')[1]))).convert('RGBA'); oa = np.asarray(oim)[:78, :85, 3] > 40
obody = 76.8 - bodytop(oa)            # old: feet anchor ay 76.8, cell 78 -> dispH 24.9
oldpx = obody * 24.9 / 78               # old body height on screen (css px at scale 1)
dispH = oldpx * H / (feet - top)        # new cell height on screen so the body matches
b = io.BytesIO(); sheet.save(b, 'WEBP', quality=90, method=6)
cfg = {'src': 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode(), 'cw': cw, 'ch': H, 'ax': round(ax, 1), 'ay': feet + 0.5,
       'fps': {'idle': 11, 'run': 11, 'attack': 16}, 'rows': {'idle': [0, len(idle)], 'run': [0, len(idle)], 'attack': [1, len(att)]}, 'once': {'attack': True}, 'sizeMul': 1, 'dispH': round(dispH, 2)}
json.dump(cfg, open(OUT, 'w')); print('cell', cw, H, 'feet', feet, 'top', top, 'ax', ax, 'old body px', round(oldpx, 1), 'dispH', round(dispH, 2), 'KB', len(cfg['src']) // 1024)
