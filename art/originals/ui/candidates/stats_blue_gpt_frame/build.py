from PIL import Image
import numpy as np
from scipy import ndimage
O = np.array(Image.open('/root/.claude/uploads/debb6e70-4175-5161-a93c-3457224d5d94/f4570770-image.png').convert('RGB')).astype(float)
H, W, _ = O.shape
r, g, b = O[...,0], O[...,1], O[...,2]
AX = 1011                      # mirror: x' = AX - x  (upper rails 68..942 -> centre 505.5)
T = 985                        # heavy part starts at the 2/3 mark
FILL = np.median(O[300:900, 300:700].reshape(-1,3), axis=0)
print("interior", FILL.astype(int))

# --- 1) right half cleaned of lava: frame mask, then per-row outer edge + per-column bottom edge
blue = (b > r + 12) & (b > 35)
gold = (r > 105) & (g > 0.62 * r) & (b < g)
frame = blue | gold
frame = ndimage.binary_opening(frame, np.ones((3,3)))
R = O.copy()
for y in range(H):
    xs = np.where(frame[y, 506:])[0]
    if len(xs): R[y, 506 + xs.max() + 2:] = 0
    else: R[y, 506:] = 0
for x in range(506, W):
    ys = np.where(frame[:, x])[0]
    if len(ys): R[ys.max() + 2:, x] = 0
# black anything still lava-coloured outside the interior box
lava = (r > b + 30) & (g < 0.6 * r)
box = np.zeros((H, W), bool); box[60:1300, 120:900] = True
R[lava & ~box] = 0

C = O.copy()
xl = np.arange(0, 506)
# --- 2) lower third (y >= T) of the LEFT half = mirror of the cleaned right half
C[T:, :506] = R[T:, AX - xl]
# --- 3) upper rails: uniform. Vertical rail = per-column median of the clean stretch y300-640, from y80 down to T
colmed = np.median(O[300:640, 0:150], axis=0)            # (150,3)
C[80:T, 0:150] = colmed[None]
# top rail = per-row median of a clean run, across x 150..505, rows 30..80
rowmed = np.median(O[30:80, 200:480], axis=1)            # (50,3)
C[30:80, 150:506] = rowmed[:, None]
# blend the kept original top-left corner bevel (y<80, x<150) into the uniform rail below it
for i in range(10):
    t = (i + 1) / 11; y = 80 + i
    C[y, 0:150] = O[y, 0:150] * (1 - t) + colmed * t
# --- 4) chamfered transition: heavy block = mirrored heavy texture under a mask whose inner-top corner is cut at 45 degrees
up_inner, hv_inner = 75, 106
up_outer, hv_outer = 60, AX - 966
N = hv_inner - up_inner
HEAVY = R[:, AX - xl]                       # heavy texture for every row (right side is heavy from ~750 down)
yy, xx = np.mgrid[0:H, 0:506]
top = np.full((H, 506), 10**6, float)
y0 = T - N
inner = (xx >= up_inner) & (xx < hv_inner)
top = np.where(xx < up_inner, y0, top)
top = np.where(inner, y0 + (xx - up_inner), top)          # 45 deg: further in -> starts lower
outer = (xx >= hv_outer) & (xx < up_outer)
top = np.where(outer, y0 + (up_outer - xx), top)          # small chamfer on the outside too
top = np.where(xx < hv_outer, 10**6, top)
m = (yy >= top) & (yy < T + 4) & (xx < hv_inner)
mf = ndimage.gaussian_filter(m.astype(float), 0.7)[..., None]
C[:, :506] = C[:, :506] * (1 - mf) + HEAVY * mf
acc = np.zeros((H, W))
for i in range(N):
    acc[y0 + i, up_inner + i - 1: up_inner + i + 1] = 1
acc = ndimage.gaussian_filter(acc, 0.8)
glow = np.array([90, 210, 255.0])
C = C * (1 - acc[..., None] * 0.85) + glow * acc[..., None] * 0.85
C = C + np.clip(ndimage.gaussian_filter(acc, 3.5) * 2.0, 0, 1)[..., None] * np.array([15, 55, 90.0])
# --- 5) mirror the finished left half onto the right
out = C.copy()
out[:, 506:AX + 1] = C[:, AX - np.arange(506, AX + 1)]
out[:, AX + 1:] = 0
# --- 6) clear specks outside the frame: keep only big connected non-black parts
nb = out.mean(axis=2) > 14
lbl, n = ndimage.label(nb)
sizes = ndimage.sum(nb, lbl, range(1, n + 1))
keep = np.isin(lbl, [i + 1 for i, sz in enumerate(sizes) if sz > 3000])
out[~ndimage.binary_dilation(keep, iterations=2)] = 0
out = np.clip(out, 0, 255).astype(np.uint8)
Image.fromarray(out).save('frank/panel_clean_v3.png')
print("saved")
