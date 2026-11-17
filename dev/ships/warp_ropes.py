# v1718: warp the separately drawn pirate ropes (ChatGPT, different proportions) onto the approved Pirate ship with a thin-plate spline through
# matching control points (mast knots, rail ends, bow tip). The rope sheet's own bowsprit boom is erased first (the ship has its own bowsprit).
# Run: python3 dev/ships/warp_ropes.py ROPES_KEYED.png SHIP_KEYED.png OUT.png
import sys, numpy as np
from PIL import Image
from scipy.interpolate import RBFInterpolator
from scipy.ndimage import map_coordinates
rp, shp, out = sys.argv[1:4]
R = np.array(Image.open(rp).convert('RGBA')).astype(np.float32)
H, W = R.shape[:2]
yy, xx = np.mgrid[0:H, 0:W]
R[(xx >= 1075) & (yy > 697 - (xx - 1080) * 120 / 420), 3] = 0   # the rope sheet's bowsprit boom + hanging loop
def rail(x): return 615 if x < 300 else (628 if x < 1000 else 628 - (x - 1000) * 11 / 300)
src = [(490, 245), (493, 285), (851, 205), (850, 258), (985, 400), (55, 592), (1495, 585), (1440, 600), (1350, 630), (1200, 680)]
dst = [(488, 228), (488, 262), (858, 230), (858, 265), (990, 305), (48, 592), (1498, 578), (1440, 592), (1345, 610), (1290, 619)]
for x in [155, 220, 300, 350, 397, 435, 525, 590, 688, 738, 785, 832, 912, 990, 1022, 1056, 1090]:
    dx = 1.028 * x - 16.6; src.append((x, 740)); dst.append((dx, rail(dx)))
f = RBFInterpolator(np.array(dst, float), np.array(src, float), kernel='thin_plate_spline', smoothing=0.5)
pts = np.stack([xx.ravel(), yy.ravel()], 1).astype(float)
m = np.empty_like(pts)
for i in range(0, len(pts), 200000): m[i:i + 200000] = f(pts[i:i + 200000])
O = np.zeros_like(R)
for c in range(4): O[..., c] = map_coordinates(R[..., c], [m[:, 1].reshape(H, W), m[:, 0].reshape(H, W)], order=1, cval=0)
Image.fromarray(np.clip(O, 0, 255).astype(np.uint8)).save(out)
S = Image.open(shp).convert('RGBA'); S.alpha_composite(Image.open(out)); S.save(out.replace('.png', '_onship.png'))
