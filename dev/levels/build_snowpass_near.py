"""Snow level near layer (Harley: GPT's near-layer split came out harsh/saturated and ~63px lower; he wants the composite's soft painterly look).
GPT's near layer (try 2) is used ONLY as a stencil: it is aligned onto the composite (best fit sx 0.998, sy 0.97, dy -63) and the near scenery is
cut straight out of the composite's own pixels. Nothing in the composite sits in front of the near layer except the road, so these pixels are exactly
the near layer as painted. Edges feathered 1.5px. Writes art/originals/backgrounds/snowpass_built/snowpass_near_cut.png (full 1536x1024 canvas, RGBA).
Run: python3 dev/levels/build_snowpass_near.py"""
import os, numpy as np, cv2
from PIL import Image
ROOT = os.path.join(os.path.dirname(__file__), "..", ".."); B = os.path.join(ROOT, "art/originals/backgrounds")
c = np.asarray(Image.open(os.path.join(B, "snowpass_v1_composite_1536x1024.png")).convert("RGB"))
n = np.asarray(Image.open(os.path.join(B, "snowpass_layer_near_gpt_try2_1536x1024.png")).convert("RGB")).astype(int)
mag = (np.minimum(n[..., 0], n[..., 2]) - n[..., 1] > 60) | ((n[..., 0] > 150) & (n[..., 2] > 150) & (n[..., 1] < 110))
sx, sy, dx, dy = 0.998, 0.97, 0, -63
M = np.float32([[sx, 0, dx + (1 - sx) * 768], [0, sy, dy + (1 - sy) * 512]])
m = cv2.warpAffine((~mag).astype(np.uint8) * 255, M, (1536, 1024), flags=cv2.INTER_LINEAR)
m = cv2.erode(m, np.ones((3, 3), np.uint8)); m = cv2.GaussianBlur(m, (0, 0), 1.5)
out = np.dstack([c, m]); os.makedirs(os.path.join(B, "snowpass_built"), exist_ok=True)
Image.fromarray(out, "RGBA").save(os.path.join(B, "snowpass_built", "snowpass_near_cut.png"))
ys = np.where(m.max(1) > 128)[0]; print("near rows", ys.min(), ys.max())
