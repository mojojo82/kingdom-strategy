"""Iron Lily: keyed 2K frames + move graph -> in-game WebP sprite sheets + manifest, and the LARGE keep-set.
Run from the folder holding big1/ big2/ big3/ bigmeta.json graph.json (made by link.py):
  python3 build_sheets.py OUT_GAME_DIR OUT_LARGE_DIR [standing_px=170] [tag=v1]
Game copy: sheets <= 2048x2048, frames at ~170 px standing (3x a ~56 CSS px hero). Large copy: every 2K keyed frame as WebP q90."""
import json, os, sys
from PIL import Image
src = '.'; out = sys.argv[1]; large = sys.argv[2]; STAND = float(sys.argv[3]) if len(sys.argv) > 3 else 170; TAG = sys.argv[4] if len(sys.argv) > 4 else 'v1'
G = json.load(open('graph.json')); BM = json.load(open('bigmeta.json'))
SX, SY = 2560 / 853, 1440 / 480                     # small (matching) units -> 2K video px
STAND_2K = 573                                       # her standing height in the 2K videos
k = STAND / STAND_2K
FLOOR = G['anc'][0][1] * SY                          # floor line (clip A frame 0 feet), 2K px
os.makedirs(out, exist_ok=True); os.makedirs(large, exist_ok=True)
frames = []; SHEET = 2048; PAD = 2
sheets = []; cur = None; x = y = rowh = 0
def new_sheet():
    global cur, x, y, rowh
    cur = Image.new('RGBA', (SHEET, SHEET), (0, 0, 0, 0)); sheets.append(cur); x = y = rowh = 0
new_sheet(); used_h = [0]
done_large = set()
for gi, (si, fno) in enumerate(G['frames']):
    seg = G['segs'][si]; name = '%s/%04d.png' % (seg[1], fno)
    im = Image.open(name); x0, y0 = BM[name]
    if name not in done_large:   # large keep-set, one file per video frame
        d = os.path.join(large, seg[1].replace('big', 'clip')); os.makedirs(d, exist_ok=True)
        im.save(os.path.join(d, '%04d.webp' % fno), 'WEBP', quality=90, method=4); done_large.add(name)
    w, h = max(1, round(im.width * k)), max(1, round(im.height * k))
    sm = im.resize((w, h), Image.LANCZOS)
    if x + w > SHEET: x = 0; y += rowh + PAD; rowh = 0
    if y + h > SHEET: used_h[-1] = y; new_sheet(); used_h.append(0)
    cur.paste(sm, (x, y))
    frames.append([len(sheets) - 1, x, y, w, h, round(x0 * k, 2), round((y0 - FLOOR) * k, 2), round(G['anc'][gi][0] * SX * k, 2)])
    x += w + PAD; rowh = max(rowh, h); used_h[-1] = max(used_h[-1], y + rowh)
files = []
for i, sh in enumerate(sheets):
    sh = sh.crop((0, 0, SHEET, min(SHEET, used_h[i] + PAD)))
    fn = 'lily_%s_s%d.webp' % (TAG, i); sh.save(os.path.join(out, fn), 'WEBP', quality=85, method=6); files.append(fn)
air = sorted(set(G['noj']))
man = {'tag': TAG, 'fps': G['fps'], 'stand': STAND, 'sheets': files,
       # frame: [sheet, sx, sy, w, h, left (video x * k), top relative to the floor, feet x (video x * k)]
       'f': frames, 'segs': [[s[0], G['frames'].index([si, s[2]]), G['frames'].index([si, s[3] - 1])] for si, s in enumerate(G['segs'])],
       'noj': air, 'tailIn': G['tail_in'],
       'jumps': {i: [j for j, d in sorted(v, key=lambda t: t[1])] for i, v in G['jumps'].items()},  # best match first
       'forced': G['forced']}  # where to go when a segment runs out and no join is open
json.dump(man, open(os.path.join(out, 'lily_%s.json' % TAG), 'w'), separators=(',', ':'))
tot = sum(os.path.getsize(os.path.join(out, f)) for f in files)
print('frames', len(frames), 'sheets', len(files), 'MB %.2f' % (tot / 1e6), 'manifest KB %.1f' % (os.path.getsize(os.path.join(out, 'lily_%s.json' % TAG)) / 1e3))
