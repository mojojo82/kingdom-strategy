# Kessa's final game sheet (v1120): rows idle (12 softer frames ping-pong = 22), attack (12 softer frames), cast (15 Arc Burst frames).
# All 160x200 cells from the same Blender camera. Prints the HERO_ANIMS.kessa numbers; writes kessa_final.json (src + palms) and the bolt texture data URL.
import json, base64, io, re, numpy as np
from PIL import Image
H = 'art/originals/sprites_hires/kessa/'
idle = [Image.open(H + 'softer/MixamoIdle_%02d.png' % k).convert('RGBA') for k in range(12)]; idle = idle + idle[-2:0:-1]
att = [Image.open(H + 'softer/1HMagicAttacktamed_%02d.png' % k).convert('RGBA') for k in range(12)]
arc = [Image.open(H + 'arcburst/arc_%02d.png' % k).convert('RGBA') for k in range(15)]
palms = json.load(open(H + 'arcburst/palms.json'))
cw, ch = idle[0].size; rows = (idle, att, arc); n = max(len(r) for r in rows)
sheet = Image.new('RGBA', (cw * n, ch * 3))
for r, row in enumerate(rows):
    for k, im in enumerate(row): sheet.alpha_composite(im, (k * cw, r * ch))
al = np.asarray(idle[0])[..., 3] > 40
def bodytop(a): w = a.sum(1); return int(np.where(w > w.max() * 0.4)[0].min())
rws = np.where(al.sum(1) > 8)[0]; feet = int(rws.max()); top = bodytop(al)  # boots, not the thin staff tip
cols = np.where(al[feet - 8:feet + 1].sum(0) > 1)[0]; ax = float((cols.min() + cols.max()) / 2); ay = feet + 0.5
g = open('test/index.html').read(); m = re.search(r"  kessa: \{ src: \"(data:image/webp;base64,[A-Za-z0-9+/=]+)\", cw: 85", g)
oim = Image.open(io.BytesIO(base64.b64decode(m.group(1).split(',')[1]))).convert('RGBA'); oa = np.asarray(oim)[:78, :85, 3] > 40
oldpx = (76.8 - bodytop(oa)) * 24.9 / 78; dispH = oldpx * ch / (feet - top)
rel = lambda p: [round(p[0] - ax, 1), round(ay - p[1], 1)]
b = io.BytesIO(); sheet.save(b, 'WEBP', quality=90, method=6)
bolt = open(H + 'arcburst/bolts.png', 'rb').read()
out = {'src': 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode(), 'cw': cw, 'ch': ch, 'ax': round(ax, 1), 'ay': ay, 'dispH': round(dispH, 2),
       'idleN': len(idle), 'castHand': rel([sum(p[0] for p in palms[7:10]) / 3, sum(p[1] for p in palms[7:10]) / 3]), 'atkHand': rel(palms[6]),
       'bolt': 'data:image/png;base64,' + base64.b64encode(bolt).decode()}
json.dump(out, open('/tmp/claude-0/-home-claude-kingdom-strategy/debb6e70-4175-5161-a93c-3457224d5d94/scratchpad/kessa/kessa_final.json', 'w'))
print('sheet', sheet.size, 'KB', len(b.getvalue()) // 1024, 'bolt KB', len(bolt) // 1024, {k: v for k, v in out.items() if k not in ('src', 'bolt')})
