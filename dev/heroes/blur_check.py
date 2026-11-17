# v1720: "is it blurry" check for every hero animation sheet. For each sheet's first idle frame: how many sheet pixels the game has for every phone
# pixel (3x screen), and how much fine detail survives when the browser draws it (bilinear, half-pixel offset) compared with the ideal (the LARGE
# original frame shrunk straight to phone size). 100% = as sharp as the art allows. Run: python3 dev/heroes/blur_check.py [test/index.html]
import re, os, sys, glob, numpy as np
from PIL import Image
s = open(sys.argv[1] if len(sys.argv) > 1 else 'test/index.html', encoding='utf-8').read()
i = s.index('var HERO_ANIMS = {'); blk = s[i:s.index('\n};', i)]
def lap(im):
    a = np.asarray(im.convert('RGBA')).astype(np.float32); L = 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]; A = a[..., 3] / 255
    l = np.abs(4 * L[1:-1, 1:-1] - L[:-2, 1:-1] - L[2:, 1:-1] - L[1:-1, :-2] - L[1:-1, 2:])
    m = (A[1:-1, 1:-1] > .9) & (A[:-2, 1:-1] > .9) & (A[2:, 1:-1] > .9) & (A[1:-1, :-2] > .9) & (A[1:-1, 2:] > .9)
    return float(l[m].mean()) if m.sum() > 50 else None
def fig(im): return im.crop(im.getchannel('A').point(lambda v: 255 if v > 128 else 0).getbbox())
def browser(im, h):   # how a canvas draws it: area-ish shrink when the sheet is bigger, bilinear stretch when smaller, at a half-pixel offset
    sc = h / im.size[1]; w = max(1, round(im.size[0] * sc))
    if sc < 1: im = im.resize((max(1, round(im.size[0] * sc * 2)), max(1, round(im.size[1] * sc * 2))), Image.BOX); sc = h / im.size[1]
    return im.transform((w, h), Image.AFFINE, (1 / sc, 0, -0.5 / sc, 0, 1 / sc, -0.5 / sc), Image.BILINEAR)
out = []
for line in blk.split('\n'):
    m = re.match(r'\s*([a-z0-9_]+): \{ src: (.*?), (?:wrap: (\d+), )?cw: ([\d.]+), ch: ([\d.]+)', line)
    if not m: continue
    k = m.group(1); cw = int(float(m.group(4))); ch = int(float(m.group(5))); fm = re.search(r'"([^"]+\.webp)"', m.group(2))
    d = re.search(r'dispH: ([\d.]+)', line); sm = re.search(r'sizeMul: ([\d.]+)', line); r0 = re.search(r'idle: \[(\d+), (\d+)\]', line)
    if not (fm and d): continue
    p = next((c for c in [fm.group(1), 'test/' + fm.group(1)] if os.path.exists(c)), None)
    if not p: continue
    disp = float(d.group(1)) * (float(sm.group(1)) if sm else 1); ri = int(r0.group(1)) * 2 if r0 else 0
    f = fig(Image.open(p).crop((0, ri * ch, cw, ri * ch + ch))); dev = round(f.size[1] / ch * disp * 3)
    hero = re.sub(r'_(skill|block)$', '', k); lg = sorted(glob.glob('art/originals/heroes/%s/large/%s/*.webp' % (hero, 'skill' if k.endswith('_skill') else 'idle')))
    ideal = fig(Image.open(lg[0]).convert('RGBA')) if lg and not k.endswith('_block') else f
    e_b = lap(browser(f, dev)); e_i = lap(ideal.resize((max(1, round(ideal.size[0] * dev / ideal.size[1])), dev), Image.LANCZOS))
    out.append((k, round(ch / (disp * 3), 2), round(100 * e_b / e_i) if e_b and e_i else None, round(e_i, 1) if e_i else None, 'model3d' in line, bool(lg)))
print('%-16s %6s %8s %7s' % ('sheet', 'px/px', 'sharp%', 'detail'))
for r in sorted(out, key=lambda r: (r[2] or 0)): print('%-16s %6.2f %7s%% %7s %s' % (r[0], r[1], r[2], r[3], '(3D)' if r[4] else ('' if r[5] else '(no large set)')))
