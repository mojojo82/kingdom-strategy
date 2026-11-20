# Governor gear slab (concept A look) drawn in code so it is an EXACT rounded square.
# thin darker outline -> bright highlight line -> flat tier fill (soft top-to-bottom shade) -> light lip along the bottom. No frame / border.
from PIL import Image, ImageDraw, ImageFilter
import numpy as np
TIERS = {'gold': (229,134,27), 'red': (221,88,86), 'purple': (177,123,174), 'blue': (79,134,216), 'green': (86,170,92), 'grey': (150,150,158)}
def _mul(c, k): return tuple(max(0, min(255, int(v * k))) for v in c)
def _mix(c, d, t): return tuple(int(a + (b - a) * t) for a, b in zip(c, d))
def slab(size=120, tier='gold', radius_frac=0.21, ss=4):
    S = size * ss; r = int(S * radius_frac); c = TIERS.get(tier, tier)
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    o = max(2, int(S * 0.012)); hl = max(3, int(S * 0.02))
    d.rounded_rectangle((0, 0, S - 1, S - 1), r, fill=_mul(c, 0.72) + (255,))                      # thin darker outline
    d.rounded_rectangle((o, o, S - 1 - o, S - 1 - o), r - o, fill=_mix(c, (255, 236, 200), 0.45) + (255,))  # bright highlight line
    inner = Image.new('RGBA', (S, S), (0, 0, 0, 0)); di = ImageDraw.Draw(inner)
    p = o + hl; di.rounded_rectangle((p, p, S - 1 - p, S - 1 - p), r - p, fill=c + (255,))
    # soft vertical shade on the fill: a touch lighter at the top, a touch deeper in the lower middle
    a = np.array(inner).astype(float); ys = np.linspace(0, 1, S)[:, None]
    k = np.where(ys < 0.5, 1.07 - 0.14 * ys, 1.0 - 0.06 * (1 - abs(ys - 0.75) * 4).clip(0, 1))
    a[:, :, :3] = np.clip(a[:, :, :3] * k[:, :, None], 0, 255); inner = Image.fromarray(a.astype(np.uint8))
    im.alpha_composite(inner)
    # light lip along the bottom inside edge
    lip = Image.new('RGBA', (S, S), (0, 0, 0, 0)); dl = ImageDraw.Draw(lip)
    dl.rounded_rectangle((p, S - p - int(S * 0.09), S - 1 - p, S - 1 - p), r - p, fill=_mix(c, (255, 240, 225), 0.38) + (150,))
    lip = lip.filter(ImageFilter.GaussianBlur(S * 0.012)); m = Image.new('L', (S, S), 0); ImageDraw.Draw(m).rounded_rectangle((p, p, S - 1 - p, S - 1 - p), r - p, fill=255)
    lip.putalpha(Image.fromarray((np.array(lip)[:, :, 3] * (np.array(m) / 255)).astype(np.uint8))); im.alpha_composite(lip)
    return im.resize((size, size), Image.LANCZOS)
if __name__ == '__main__':
    import sys
    out = Image.new('RGBA', (6 * 150, 160), (232, 205, 160, 255))
    for i, t in enumerate(['gold', 'red', 'purple', 'blue', 'green', 'grey']): out.alpha_composite(slab(120, t), (15 + i * 150, 20))
    out.save(sys.argv[1]); print(out.size)
