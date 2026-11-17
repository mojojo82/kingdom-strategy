# v1706: World-map button icons - key the three ChatGPT 2x2 sheets (magenta), cut each quarter, trim, save the full-size keyed PNG in
# art/originals/ui/mapicons/ and a 144 px webp (3x a 48 px button) in art/ui/mapicons/.  Run: python3 dev/ui/split_mapicons.py
import sys, os
from PIL import Image
sys.path.insert(0, '/home/claude/kingdom-strategy/dev/levels')
from build_graveyard import key
R = '/home/claude/kingdom-strategy/'; O = R + 'art/originals/ui/mapicons/'; G = R + 'art/ui/mapicons/'; os.makedirs(G, exist_ok=True)
NAMES = {1: ['mail', 'tasks', 'search', 'bag'], 2: ['idle', 'recon', 'deals', 'shop'], 3: ['weapons', 'cards', 'alliance', 'shop_alt']}
for n, names in NAMES.items():
    im = key(Image.open(O + 'mapicons_sheet%d_gpt.png' % n).convert('RGB')); W, H = im.size
    for i, nm in enumerate(names):
        q = im.crop(((i % 2) * W // 2, (i // 2) * H // 2, (i % 2 + 1) * W // 2, (i // 2 + 1) * H // 2))
        bb = q.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox(); q = q.crop(bb)
        q.save(O + 'icon_%s.png' % nm)
        s = 144 / max(q.size); sm = q.resize((max(1, round(q.size[0] * s)), max(1, round(q.size[1] * s))), Image.LANCZOS)
        c = Image.new('RGBA', (144, 144), (0, 0, 0, 0)); c.paste(sm, ((144 - sm.size[0]) // 2, (144 - sm.size[1]) // 2)); c.save(G + 'icon_%s.webp' % nm, 'WEBP', quality=90)
        print(nm, q.size, os.path.getsize(G + 'icon_%s.webp' % nm))
