# Iron Lily move-linking (v3): any number of clips, cut ranges, no joins near the standing start or mid-air.
# A "segment" = a playable stretch of one video. Cutting a bad bit splits a video into two segments.
import numpy as np, json, random, cv2, subprocess, os, sys
from PIL import Image, ImageDraw, ImageFont
FPS = 24
INTRO = 36          # first 1.5 s of every video = standing start: never jump into/out of it
SEGS = [            # name, small-frame dir, big-frame dir, first frame, end frame (exclusive)
  ('A',  'f1', 'big1', 0, 124),
  ('B',  'f2', 'big2', 0, 243),
  ('C',  'f3', 'big3', 0, 175, 15),    # acro 0-7.3 s
  ('C2', 'f3', 'big3', 193, 243, 15),  # acro 8.0-10 s (7.3-8.0 s cut: frozen pose + white sword flash)
  ('Rin', 'f5', 'big5', 38, 66, 15),   # run clip (v1425): stance -> take-off -> first strides (0-1.6 s turn/pauses cut)
  ('Rrun', 'f5', 'big5', 66, 79, 13),  # one clean stride, loops 78 -> 66 (camera tracking her)
  ('Rout', 'f5', 'big5', 79, 100, 15), # last strides -> stops into her stance (frozen end cut)
  ('H',   'f6', 'big6', 24, 101, 15),  # v1430 heavy blade (HD): rising slash, jumping overhead cleave, long thrust (turn + front-on end pose cut)
  ('K',   'f7', 'big7', 18, 101, 15),  # v1430 closing in (HD): leaping strike, lunge, forward roll into rising slash, low slide (3/4 end pose cut)
  ('Idle','f8', 'big8', 49, 83, 12),   # v1430 idle (HD, 55% frame scaled to match): one clean breathing loop, 49 -> 82
]
TAIL_IN, TAIL_OUT = 40, 30  # don't jump into the last 40 frames of a segment; leave in the last 30
F = []
for si, sg in enumerate(SEGS):
  a, b = sg[3], sg[4]
  for k in range(a, b): F.append((si, k))
N = len(F)
segof = lambda i: F[i][0]; fno = lambda i: F[i][1]
seg_end = lambda i: SEGS[segof(i)][4]
tail_in = lambda i: SEGS[segof(i)][5] if len(SEGS[segof(i)]) > 5 else TAIL_IN  # cut segments have no held ending
def npy(i): return '%s/%04d.npy' % (SEGS[segof(i)][1], fno(i))
def big(i): return '%s/%04d.png' % (SEGS[segof(i)][2], fno(i))
def name(i): return '%s %.1fs' % (SEGS[segof(i)][0], fno(i) / FPS)

# ---- pose fingerprints (same as match.py) ----
DESC = []; ANC = []
CACHE = 'fp_cache.npz'
for i in (range(0) if os.path.exists(CACHE) else range(N)):
  a = np.load(npy(i)); al = a[..., 3].astype(np.float32) / 255; r, g, b = [a[..., c].astype(np.float32) for c in range(3)]
  red = ((r > 140) & (r > g + 60) & (r > b + 40) & (al > 0.4)).astype(np.float32)
  body = ((al > 0.5) & (red < 0.5)).astype(np.float32)
  ys, xs = np.where(body > 0)
  if len(xs) < 50: ys, xs = np.where(al > 0.5)
  ax = float(np.median(xs)); ay = float(ys.max())
  M = np.float32([[1, 0, 140 - ax], [0, 1, 260 - ay]])
  B = cv2.warpAffine(body, M, (280, 290)); Rd = cv2.warpAffine(red, M, (280, 290))
  DESC.append(np.concatenate([cv2.resize(B, (28, 29), interpolation=cv2.INTER_AREA).ravel(), 0.7 * cv2.resize(Rd, (28, 29), interpolation=cv2.INTER_AREA).ravel()]))
  ANC.append((ax, ay))
if os.path.exists(CACHE):
  z = np.load(CACHE); DESC = z['d']; ANC = [tuple(x) for x in z['a']]
else:
  DESC = np.array(DESC); np.savez(CACHE, d=DESC, a=np.array(ANC))
same_seg_ahead = lambda i, k: i + k if i + k < N and segof(i + k) == segof(i) else max(x for x in range(N) if segof(x) == segof(i))
nxt2 = [same_seg_ahead(i, 2) for i in range(N)]
D2 = np.concatenate([DESC, DESC[nxt2]], 1)
sq = (D2 ** 2).sum(1); dist = np.sqrt(np.maximum(sq[:, None] + sq[None, :] - 2 * D2 @ D2.T, 0))

# ---- frames that can't be joined: standing start, mid-air (4 before take-off .. 2 after landing) ----
NOJ = set(i for i in range(N) if fno(i) < INTRO)
for vid in set(s[1] for s in SEGS):
  ids = [i for i in range(N) if SEGS[segof(i)][1] == vid]; fl = float(np.median([ANC[i][1] for i in ids]))
  for i in ids:
    if ANC[i][1] < fl - 12:
      for d in range(-4, 3):
        if 0 <= i + d < N and segof(i + d) == segof(i): NOJ.add(i + d)

# ---- candidate joins ----
pairs = []
for i in range(N):
  for j in range(N):
    if segof(i) == segof(j) and abs(fno(i) - fno(j)) < 20: continue
    pairs.append((dist[i, j], i, j))
PCT = float(os.environ.get('PCT', '3.0')); thr = np.percentile([d for d, _, _ in pairs], PCT); print('join threshold', PCT, '% ->', round(float(thr), 2))
JF = {}
for d, i, j in pairs:
  if d > thr or i in NOJ or j in NOJ: continue
  if fno(j) > seg_end(j) - tail_in(j): continue
  if dist[same_seg_ahead(i, 10), same_seg_ahead(j, 10)] < 12: continue   # must lead somewhere different
  JF.setdefault(i, []).append((j, float(d)))

# ---- options map: exits grouped into moments, destinations grouped into places ----
def group(ids):
  out = []
  for x in sorted(ids):
    if out and x - out[-1][-1] <= 3 and segof(x) == segof(out[-1][-1]): out[-1].append(x)
    else: out.append([x])
  return out
report = []; ones = 0; exits = 0; reached = set()
for si, s in enumerate(SEGS):
  report.append('clip %s (%.1f-%.1f s)' % (s[0], s[3] / FPS, s[4] / FPS))
  for g in group(i for i in JF if segof(i) == si):
    places = group(set(j for i in g for j, _ in JF[i])); exits += 1; ones += len(places) == 1
    for p in places: reached.update(p)
    report.append('  exit %s -> %d place(s): %s' % (name(g[0]), len(places), ', '.join(name(p[0]) for p in places)))
report.append('TOTAL exits %d, with only one option %d' % (exits, ones))
open('options.txt', 'w').write('\n'.join(report)); print('\n'.join(report))

json.dump({'fps': FPS, 'segs': [[sg[0], sg[2], sg[3], sg[4]] for sg in SEGS], 'frames': [list(x) for x in F], 'anc': [[float(a), float(b)] for a, b in ANC], 'noj': sorted(int(i) for i in NOJ),
           'jumps': {str(i): [[int(j), round(d, 3)] for j, d in v] for i, v in JF.items()}, 'tail_in': [tail_in(F.index((si, SEGS[si][3]))) for si in range(len(SEGS))],
           'forced': {str(i): int(min([x for x in range(N) if x not in NOJ and fno(x) <= seg_end(x) - tail_in(x) and (segof(x) != segof(i) or abs(x - i) > 30)], key=lambda x: dist[i, x]))
                      for i in range(N) if (i + 1 >= N or segof(i + 1) != segof(i)) or (fno(i) > seg_end(i) - (tail_in(i) - 10) and i not in NOJ)}}, open('graph.json', 'w'))
if os.environ.get('RENDER') == '0': sys.exit()
# ---- seeded walk ----
random.seed(int(sys.argv[1]) if len(sys.argv) > 1 else 7)
seq = []; i = F.index((0, 0)); seg = 0; cuts = []; used = {}
TOTAL = 30 * FPS
while len(seq) < TOTAL:
  seq.append(i); seg += 1
  n = i + 1 if i + 1 < N and segof(i + 1) == segof(i) else None
  near_end = fno(i) > seg_end(i) - (tail_in(i) - 10) and i not in NOJ  # leave 10 frames after the last frame we may jump into
  opts = JF.get(i, [])
  if seg >= 18 and opts and (random.random() < 0.35 or near_end or n is None):
    cand = sorted(opts, key=lambda x: x[1] + 4 * used.get(x[0], 0))[:6]
    other = [c for c in cand if segof(c[0]) != segof(i)]
    j = random.choice(other or cand)[0]; used[j] = used.get(j, 0) + 1; cuts.append((len(seq), i, j)); i = j; seg = 0; continue
  if n is None or near_end:
    ok = [x for x in range(N) if x not in NOJ and fno(x) <= seg_end(x) - tail_in(x) and (segof(x) != segof(i) or abs(x - i) > 30)]
    j = min(ok, key=lambda x: dist[i, x] + 4 * used.get(x, 0)); used[j] = used.get(j, 0) + 1; cuts.append((len(seq), i, j)); i = j; seg = 0; continue
  i = n
print('cuts', len(cuts), 'clips used', sorted(set(SEGS[segof(k)][0] for k in seq)))
json.dump({'seq': [list(F[k]) for k in seq], 'cuts': [[t, list(F[a]), list(F[b])] for t, a, b in cuts]}, open('walk3.json', 'w'))

# ---- render 1280x720: floor locked, only x aligned at joins ----
BM = json.load(open('bigmeta.json')); W = 853
try: fnt = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 24)
except: fnt = None
for labels, out in ((True, 'lily_linked_3clips_test.mp4'), (False, 'lily_linked_3clips_clean.mp4')):
  os.makedirs('out3', exist_ok=True); offx = 0.0; prev = None; cutset = {c[0]: c for c in cuts}; label = ''; lab_t = 0
  for t, k in enumerate(seq):
    if t in cutset:
      _, a, b = cutset[t]; offx += ANC[a][0] - ANC[b][0]; label = 'JOIN  %s  ->  %s' % (name(a), name(b)); lab_t = 24
    offx += (W * 0.45 - ANC[k][0] - offx) * 0.04
    bn = big(k); im = Image.open(bn); im = im.resize((max(1, im.width // 2), max(1, im.height // 2)), Image.LANCZOS); x0, y0 = BM[bn]
    cv = Image.new('RGBA', (1280, 720), (30, 34, 52, 255)); cv.alpha_composite(im, (int(round(offx * 1.5 + x0 * 0.5)), int(round(y0 * 0.5))))
    if prev is not None and (t in cutset or t - 1 in cutset): cv = Image.blend(prev, cv, 0.5 if t in cutset else 0.75)
    prev = cv.copy()
    if labels:
      d = ImageDraw.Draw(cv); d.text((12, 8), name(k), fill=(200, 200, 220), font=fnt)
      if lab_t > 0: d.text((12, 38), label, fill=(255, 210, 80), font=fnt); lab_t -= 1
    cv.convert('RGB').save('out3/%04d.png' % t)
  subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', 'out3/%04d.png', '-frames:v', str(len(seq)), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', out])
print('done')
