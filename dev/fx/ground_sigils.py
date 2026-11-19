"""Ground sigil ideas for Baelgor's Fear portal (Harley, 19 Nov 2026: alternatives to a pentagram). Code-drawn, red glow.
Run: python3 dev/fx/ground_sigils.py BG.png OUT.png  -> top-down designs + each one laid on the ground in the scene under the portal spot."""
import math, random, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont
BG, OUT = sys.argv[1], sys.argv[2]
R = 300; SZ = 2 * R + 40; C = SZ / 2; RED = (235, 30, 50)
def P(a, r): return (C + r * math.cos(a), C + r * math.sin(a))
def star(d, n, step, r, w, rot=-math.pi / 2):
    pts = [P(rot + 2 * math.pi * k / n, r) for k in range(n)]
    for k in range(n): d.line([pts[k], pts[(k + step) % n]], fill=255, width=w)
def ring(d, r, w): d.ellipse([C - r, C - r, C + r, C + r], outline=255, width=w)
def runes(d, r, n, seed, h=22):
    rnd = random.Random(seed)
    for k in range(n):
        a = 2 * math.pi * k / n; x, y = P(a, r); ca, sa = math.cos(a + math.pi / 2), math.sin(a + math.pi / 2)
        for _ in range(rnd.randint(2, 3)):   # each rune = 2-3 strokes in a small box, rotated to follow the ring
            u0, v0, u1, v1 = [rnd.uniform(-0.5, 0.5) for _ in range(4)]
            def T(u, v): return (x + (u * ca - v * sa) * h * 0.6, y + (u * sa + v * ca) * h)
            d.line([T(u0 * 0.8, -0.5), T(u1 * 0.8, 0.5)] if rnd.random() < 0.5 else [T(u0, v0), T(u1, v1)], fill=255, width=4)
def draw_design(i):
    m = Image.new("L", (SZ, SZ), 0); d = ImageDraw.Draw(m)
    if i == 0:   # reference: upright pentagram
        ring(d, R, 8); ring(d, R - 40, 4); star(d, 5, 2, R - 40, 7); runes(d, R - 20, 24, 1, 18)
    elif i == 1:   # rune circle: no star, three rune rings, thorn ticks
        ring(d, R, 8); ring(d, R - 46, 4); ring(d, R - 120, 6); ring(d, 70, 4)
        runes(d, R - 23, 28, 2); runes(d, R - 83, 20, 3, 26)
        for k in range(12): a = 2 * math.pi * k / 12; d.line([P(a, R - 120), P(a, 70)], fill=255, width=3)
    elif i == 2:   # heptagram (7-point star)
        ring(d, R, 8); ring(d, R - 40, 4); star(d, 7, 3, R - 40, 6); ring(d, 80, 5); runes(d, R - 20, 28, 4, 18)
    elif i == 3:   # thorn crown: ring of inward thorns + crack lines
        ring(d, R, 9); ring(d, R - 30, 3)
        for k in range(16):
            a = 2 * math.pi * k / 16; L = R - 30 - (110 if k % 2 == 0 else 60)
            d.polygon([P(a - 0.07, R - 30), P(a + 0.07, R - 30), P(a, L)], fill=255)
        rnd = random.Random(5)
        for k in range(7):
            a = rnd.uniform(0, 2 * math.pi); pts = [P(a, 20)]
            for s in range(5): a += rnd.uniform(-0.25, 0.25); pts.append(P(a, 20 + (s + 1) * 26))
            d.line(pts, fill=255, width=4)
    elif i == 4:   # fear eye sigil: eye in the middle, rays, two rings (ties to the eye in his sword)
        ring(d, R, 8); ring(d, R - 36, 4); runes(d, R - 18, 26, 6, 16)
        for k in range(24): a = 2 * math.pi * k / 24; d.line([P(a, 150 if k % 2 else 120), P(a, R - 50)], fill=255, width=4 if k % 2 else 6)
        ew, eh = 120, 62; d.chord([C - ew, C - eh * 1.6, C + ew, C + eh * 1.6], 25, 155, outline=255, width=8); d.chord([C - ew, C - eh * 1.6, C + ew, C + eh * 1.6], 205, 335, outline=255, width=8)
        d.ellipse([C - 34, C - 34, C + 34, C + 34], outline=255, width=8); d.ellipse([C - 10, C - 22, C + 10, C + 22], fill=255)
    elif i == 5:   # horned crest: Baelgor's horned helm as a sigil - two big horns, a spike down, rune ring
        ring(d, R, 8); ring(d, R - 36, 4); runes(d, R - 18, 26, 8, 16)
        for sg in (-1, 1):
            pts = [(C + sg * (30 + 150 * math.sin(u * 1.4)), C + 40 - 190 * u + 60 * u * u) for u in [k / 14 for k in range(15)]]
            for k in range(14): d.line([pts[k], pts[k + 1]], fill=255, width=max(3, round(16 * (1 - k / 14))))
        d.polygon([(C - 26, C + 30), (C + 26, C + 30), (C, C + 200)], outline=255, width=6); d.ellipse([C - 46, C - 26, C + 46, C + 46], outline=255, width=7)
    elif i == 6:   # claw sigil: three claw slashes across a ring (the hand's own mark), kept inside the ring
        ring(d, R, 8); ring(d, R - 34, 3); runes(d, R - 17, 26, 9, 16)
        for k in (-1, 0, 1):
            pts = [(C - 150 + 70 * k + s_ * 30, C - 150 + 70 * k * -0.2 + s_ * 30 + 10 * math.sin(s_ * 0.8) + 40 * k) for s_ in range(11)]
            for s_ in range(10): d.line([pts[s_], pts[s_ + 1]], fill=255, width=max(2, round(16 * math.sin(math.pi * (s_ + 0.5) / 10))))
    elif i == 7:   # vortex: curved arms spiralling into the centre (matches the swirling portal)
        ring(d, R, 8); ring(d, R - 36, 4); runes(d, R - 18, 26, 10, 16)
        for k in range(7):
            a0 = 2 * math.pi * k / 7; pts = [P(a0 + 2.2 * u, (R - 50) * (1 - u) + 30 * u) for u in [q / 24 for q in range(25)]]
            for q in range(24): d.line([pts[q], pts[q + 1]], fill=255, width=max(3, round(10 * (1 - q / 24) + 3)))
        ring(d, 34, 6)
    return m
NAMES = ["Pentagram (reference)", "Rune circle", "7-point star", "Thorn crown", "Fear eye", "Horned crest", "Claw marks", "Vortex"]
def glow(mask, col=RED):
    m = mask.filter(ImageFilter.GaussianBlur(1.2)); g = mask.filter(ImageFilter.GaussianBlur(10))
    out = Image.new("RGBA", mask.size, col + (0,)); out.putalpha(g.point(lambda v: int(min(255, v * 2.2) * 0.75)))
    core = Image.new("RGBA", mask.size, (255, 120, 120, 0)); core.putalpha(m)
    return Image.alpha_composite(out, core)
bg = Image.open(BG).convert("RGB").crop((0, 380, 860, 760)); FEETY = 333; GX = 600
TW = 300; cells = []
f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 20)
for i in range(8):
    m = draw_design(i); g = glow(m)
    top = Image.new("RGB", (SZ, SZ), (14, 12, 18)); top.paste(g, (0, 0), g); top = top.resize((TW, TW), Image.LANCZOS)
    flat = g.resize((150, round(150 * 0.26)), Image.LANCZOS)   # laid flat on the ground (same width as the portal ring)
    sc = bg.copy().convert("RGBA"); sc.alpha_composite(flat, (GX - 75, FEETY - flat.height // 2 - 2)); sc = sc.crop((GX - 150, FEETY - 110, GX + 150, FEETY + 40)).convert("RGB")
    cell = Image.new("RGB", (TW, TW + sc.height + 34), (24, 22, 28)); cell.paste(top, (0, 0)); cell.paste(sc, (0, TW))
    dr = ImageDraw.Draw(cell); dr.text((8, TW + sc.height + 6), "%d  %s" % (i, NAMES[i]), font=f, fill=(240, 201, 95)); cells.append(cell)
W4 = 4; sheet = Image.new("RGB", (W4 * (TW + 8) + 8, 2 * (cells[0].height + 8) + 8), (10, 10, 12))
for i, c in enumerate(cells): sheet.paste(c, (8 + (i % W4) * (TW + 8), 8 + (i // W4) * (c.height + 8)))
sheet.save(OUT); print(OUT, sheet.size)
