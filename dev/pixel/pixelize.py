"""Smooth / fake-pixel image -> clean pixel art. usage: pixelize.py src out_prefix target_h colors [checker]"""
import sys, numpy as np
from PIL import Image, ImageFilter
from collections import deque
src, pre, TH, NC = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]); checker = len(sys.argv) > 5
im = Image.open(src).convert('RGBA'); a = np.asarray(im).astype(np.int32).copy(); H, W = a.shape[:2]
if checker:  # remove a drawn-in grey/white checkerboard: flood from the edges over bright, colourless pixels
    rgb = a[..., :3]; sat = rgb.max(2) - rgb.min(2); cand = (sat < 18) & (rgb.min(2) > 150)
    m = np.zeros((H, W), bool); q = deque()
    for x in range(W):
        for y in (0, H - 1):
            if cand[y, x] and not m[y, x]: m[y, x] = True; q.append((y, x))
    for y in range(H):
        for x in (0, W - 1):
            if cand[y, x] and not m[y, x]: m[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and not m[ny, nx] and cand[ny, nx]: m[ny, nx] = True; q.append((ny, nx))
    a[m, 3] = 0
# crop to the art
ys, xs = np.where(a[..., 3] > 20); a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]; H, W = a.shape[:2]
k = TH / H; TW = max(1, round(W * k))
base = Image.fromarray(a.astype(np.uint8), 'RGBA')
# 1) naive: plain smooth shrink (what the game does with a big smooth image)
naive = base.resize((TW, TH), Image.LANCZOS); naive.save(pre + '_naive.png')
# 2) pixel art (v2): shrink by averaging each block (clean shading), then snap to a small palette (no dither) and make edges hard
sm = base.resize((TW, TH), Image.BOX); sm = sm.filter(ImageFilter.UnsharpMask(radius=1, percent=60, threshold=1))
s_a = np.asarray(sm); alpha = s_a[..., 3]
rgb = Image.fromarray(s_a[..., :3]); q = rgb.quantize(NC, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
out = np.zeros((TH, TW, 4), np.uint8); out[..., :3] = np.asarray(q); out[..., 3] = np.where(alpha > 110, 255, 0)
out[out[..., 3] == 0, :3] = 0
# 3) outline: every see-through pixel touching the art becomes a dark outline (a darkened copy of its neighbour, not flat black)
o = out.copy(); A = out[..., 3] > 0
for ty in range(TH):
    for tx in range(TW):
        if A[ty, tx]: continue
        nb = [(ty + dy, tx + dx) for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= ty + dy < TH and 0 <= tx + dx < TW and A[ty + dy, tx + dx]]
        if nb: c = out[nb[0][0], nb[0][1], :3].astype(int); o[ty, tx, :3] = (c * 0.25 + np.array([12, 10, 18]) * 0.75).astype(np.uint8); o[ty, tx, 3] = 255
Image.fromarray(o, 'RGBA').save(pre + '_pixel.png')
print(pre, TW, TH)
