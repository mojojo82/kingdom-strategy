# Governor gear mockup on the Overlord Profile: exact rounded-square slabs (dev/ui/gear_slab.py), GPT icons, everything else drawn in code.
import sys, math; sys.path.insert(0, 'dev/ui')
from gear_slab import slab
from PIL import Image, ImageDraw, ImageFont
D = 'art/originals/ui/gov_gear/'
import cv2, numpy as np
src = cv2.imread(D + 'refs/ref_overlord_profile.png'); H, W = src.shape[:2]
mask = np.zeros((H, W), np.uint8); mask[158:572, 26:178] = 255; mask[158:572, W - 178:W - 26] = 255   # the profile's old empty slots
ship = (src.astype(int).sum(2) < 260) & (np.arange(H)[:, None] > 330) & (np.arange(H)[:, None] < 480)   # the ship's dark hull ends reach into the slot columns
ship &= ~(((np.arange(W)[None, :] < 150) | (np.arange(W)[None, :] > W - 150)) & False)
from scipy import ndimage as _nd
lab, n = _nd.label(src.astype(int).sum(2) < 300); big = np.zeros((H, W), bool)
for i, sz in enumerate(_nd.sum(np.ones((H, W)), lab, range(1, n + 1))):
    if sz > 20000: big |= lab == i + 1   # the ship is the one big dark shape
mask[big] = 0
mask[330:480, 156:178] = 0; mask[330:480, W - 178:W - 156] = 0   # leave the ship's nose / tail untouched
clean = cv2.inpaint(src, mask, 9, cv2.INPAINT_TELEA)
base = Image.fromarray(cv2.cvtColor(clean, cv2.COLOR_BGR2RGB)).convert('RGBA')
L = lambda n: ImageFont.truetype('fonts/LilitaOne-Regular.woff', n)
S = 112; xs = [42, W - 42 - S]; ys = [150, 300, 450]
GEAR = [  # (icon, tier, P, stars, level, upgradable, gems)  gems: colour or None = empty socket
    ('helm', 'gold', 'T3', 3, 121, True, ['blue'] * 3), ('armour', 'red', 'T2', 2, 94, True, ['green', 'green', None]), ('gauntlet', 'purple', 'T1', 1, 40, False, ['gold', None, None]),
    ('gun', 'blue', 'T2', 2, 133, True, ['blue', 'blue', None]), ('ring', 'gold', 'T3', 3, 118, False, ['green', None, None]), ('amulet', 'purple', 'T2', 2, 70, True, ['purple', 'purple', None])]
GEM = {'blue': (64, 150, 235), 'green': (70, 190, 90), 'gold': (240, 190, 50), 'purple': (170, 90, 220)}
def cute_star(img, cx, cy, r, fill=(255, 206, 38), outline=(110, 52, 8)):
    from PIL import ImageFilter
    ss = 6; R = r * ss; N = R * 2 + 8 * ss; c = N / 2
    pts = [(c + (R if i % 2 == 0 else R * 0.52) * math.sin(i * math.pi / 5), c - (R if i % 2 == 0 else R * 0.52) * math.cos(i * math.pi / 5)) for i in range(10)]
    m = Image.new('L', (N, N), 0); ImageDraw.Draw(m).polygon(pts, fill=255)
    m = m.filter(ImageFilter.GaussianBlur(R * 0.16)).point(lambda v: 255 if v > 110 else 0)      # rounded tips
    o = m.filter(ImageFilter.MaxFilter(2 * int(R * 0.2) + 1))                                     # outline ring
    st = Image.new('RGBA', (N, N), outline + (0,)); st.putalpha(o)
    body = Image.new('RGBA', (N, N), fill + (255,)); body.putalpha(m); st.alpha_composite(body)
    hl = Image.new('L', (N, N), 0); ImageDraw.Draw(hl).ellipse((c - R * 0.42, c - R * 0.62, c - R * 0.05, c - R * 0.2), fill=150)
    hl = Image.fromarray((np.array(hl) * (np.array(m) > 0)).astype(np.uint8)); w = Image.new('RGBA', (N, N), (255, 252, 220, 0)); w.putalpha(hl); st.alpha_composite(w)
    st = st.resize((N // ss, N // ss), Image.LANCZOS); img.alpha_composite(st, (int(cx - st.width / 2), int(cy - st.height / 2)))
def star(d, cx, cy, r, fill, outline):
    pts = [(cx + (r if i % 2 == 0 else r * 0.45) * math.sin(i * math.pi / 5), cy - (r if i % 2 == 0 else r * 0.45) * math.cos(i * math.pi / 5)) for i in range(10)]
    d.polygon(pts, fill=fill, outline=outline, width=2)
def gem(img, cx, cy, r, col):
    ss = 4; R = r * ss; g = Image.new('RGBA', (R * 2 + 8, R * 2 + 8), (0, 0, 0, 0)); d = ImageDraw.Draw(g); c = R + 4
    hexp = [(c + R * math.cos(math.pi / 6 + i * math.pi / 3), c + R * math.sin(math.pi / 6 + i * math.pi / 3)) for i in range(6)]
    if col is None: d.polygon(hexp, fill=(150, 150, 156, 255), outline=(90, 70, 50, 255), width=ss * 2)
    else:
        cc = GEM[col]; d.polygon(hexp, fill=cc + (255,), outline=(70, 45, 20, 255), width=ss * 2)
        d.polygon([(c, c - R * 0.55), (c + R * 0.5, c), (c, c + R * 0.55), (c - R * 0.5, c)], fill=tuple(min(255, v + 60) for v in cc) + (255,))
        d.ellipse((c - R * 0.55, c - R * 0.7, c - R * 0.2, c - R * 0.35), fill=(255, 255, 255, 200))
    g = g.resize((g.width // ss, g.height // ss), Image.LANCZOS); img.alpha_composite(g, (int(cx - g.width / 2), int(cy - g.height / 2)))
k = 0
for x in xs:
    for y in ys:
        ic, tier, P, st, lv, up, gems = GEAR[k]; k += 1
        base.alpha_composite(slab(S, tier), (x, y))
        icon = Image.open(D + f'icon_{ic}.png').convert('RGBA'); f = (S * 0.70) / max(icon.size); icon = icon.resize((int(icon.width * f), int(icon.height * f)), Image.LANCZOS)
        base.alpha_composite(icon, (x + (S - icon.width) // 2, y + (S - icon.height) // 2))   # centred in the square
        d = ImageDraw.Draw(base)
        d.text((x + 8, y + 4), P, font=L(26), fill=(255, 228, 60), stroke_width=3, stroke_fill=(70, 35, 10))
        for s in range(st): cute_star(base, x + 19, y + 46 + s * 22, 12)
        d = ImageDraw.Draw(base)
        d.text((x + S / 2 + 6, y + S - 17), f'Lv.{lv}', font=L(23), fill=(255, 255, 255), stroke_width=3, stroke_fill=(50, 30, 15), anchor='mm')
        if up: d.ellipse((x + S - 16, y - 6, x + S + 6, y + 16), fill=(225, 30, 30), outline=(255, 255, 255), width=3)
        for g_, col in enumerate(gems): gem(base, x + S / 2 + (g_ - 1) * 30, y + S + 19, 12, col)
base.convert('RGB').save(D + 'code_mock_v1.png'); print(base.size)
