"""Hero tier list picture (Harley's tier colours SS / S / A / B / C) from a team_rank result, with the heroes' card portraits on their rarity colour.
Per hero = average win % of the random 5-hero teams he/she is in (team_rank.js). Tier by the Lv80 number; Lv40 shown small.
Run: python3 dev/balance/tier_list_image.py results/team_rank_<TAG>.json OUT.png [SS,S,A,B cut-offs, e.g. 70,60,52,45]
Card portraits come from HERO_CARD_ART2 in test/index.html; heroes without one take a PNG/WebP from env EXTRA_DIR/<key>.webp."""
import base64, json, os, re, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
RES, OUT = sys.argv[1], sys.argv[2]
CUTS = [float(x) for x in (sys.argv[3] if len(sys.argv) > 3 else "70,60,52,45").split(",")]
d = json.load(open(RES if os.path.isabs(RES) else os.path.join(os.path.dirname(os.path.abspath(__file__)), RES)))
def per_hero(lvl):
    L = d["levels"][lvl]; per = {}
    for t, s in zip(d["teams"], L["sc"]):
        g = s["w"] + s["l"] + s["d"]; p = (s["w"] + s["d"] / 2) / g if g else 0
        for k in t["ros"]: per.setdefault(k, []).append(p)
    return {k: 100 * sum(v) / len(v) for k, v in per.items()}
H80, H40 = per_hero("80"), per_hero("40") if "40" in d["levels"] else {}
G = open(os.path.join(ROOT, "test/index.html"), encoding="utf-8").read()
i = G.index("var HERO_CARD_ART2 = {"); art = dict(re.findall(r'(\w+): "data:image/webp;base64,([^"]+)"', G[i:G.index("};", i)]))
rar = dict(re.findall(r'\n  (\w+): \{ name: "[^"]+",[^\n]*?rarity: "(\w+)"', G[G.index("var HERO_DEFS"):]))
names = d.get("names", {})
BG = {"Epic": ((0x9b, 0x59, 0xd6), (0x6a, 0x35, 0xa8)), "Rare": ((0x4f, 0x8f, 0xd9), (0x2f, 0x5f, 0xa3)), "Legendary": ((0xf2, 0xb6, 0x32), (0xd9, 0x90, 0x2a))}
CW, CH = 132, 176; NAMEH = 40
def card(k):
    if k in art: im = Image.open(__import__("io").BytesIO(base64.b64decode(art[k]))).convert("RGBA")
    else: im = Image.open(os.path.join(os.environ["EXTRA_DIR"], k + ".webp")).convert("RGBA")
    t, b = BG.get(rar.get(k, "Epic"), BG["Epic"]); a = np.zeros((im.size[1], im.size[0], 4), np.uint8)
    f = np.linspace(0, 1, im.size[1])[:, None]
    for c in range(3): a[..., c] = (t[c] * (1 - f) + b[c] * f).astype(np.uint8)
    a[..., 3] = 255; bg = Image.fromarray(a); bg.alpha_composite(im); return bg.resize((CW, CH), Image.LANCZOS)
def font(sz, bold=True):
    for p in ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]:
        if os.path.exists(p): return ImageFont.truetype(p, sz)
    return ImageFont.load_default()
TIERS = [("SS", (0xff, 0x7f, 0x7f)), ("S", (0xff, 0xbf, 0x7f)), ("A", (0xff, 0xdf, 0x7f)), ("B", (0xff, 0xff, 0x7f)), ("C", (0xbf, 0xff, 0x7f))]
def tier_of(v):
    for n, c in enumerate(CUTS):
        if v >= c: return n
    return len(CUTS)
rows = [[] for _ in TIERS]
for k in sorted(H80, key=lambda k: -H80[k]): rows[tier_of(H80[k])].append(k)
PER = 7; LBL = 120; GAP = 8; ROWH = CH + NAMEH + 2 * GAP
nlines = [max(1, (len(r) + PER - 1) // PER) for r in rows]
W = LBL + GAP + PER * (CW + GAP); Hh = sum(n * ROWH for n in nlines) + (len(TIERS) + 1) * 2 + 70
img = Image.new("RGB", (W, Hh), (0x1a, 0x1a, 0x17)); dr = ImageDraw.Draw(img)
dr.text((GAP, 18), "Hero tier list - Arena team ranking (Lv80, Lv40 in brackets)", font=font(22), fill=(240, 201, 95))
y = 70
for (tn, col), ks, nl in zip(TIERS, rows, nlines):
    h = nl * ROWH; dr.rectangle([0, y, LBL, y + h], fill=col, outline=(0, 0, 0), width=2)
    f = font(40); tw = dr.textlength(tn, font=f); dr.text(((LBL - tw) / 2, y + h / 2 - 24), tn, font=f, fill=(30, 30, 30))
    for j, k in enumerate(ks):
        x = LBL + GAP + (j % PER) * (CW + GAP); yy = y + GAP + (j // PER) * ROWH
        img.paste(card(k), (x, yy)); dr.rectangle([x, yy, x + CW - 1, yy + CH - 1], outline=(0, 0, 0), width=2)
        nm = names.get(k, k.title()); f2 = font(15); dr.text((x + (CW - dr.textlength(nm, font=f2)) / 2, yy + CH + 2), nm, font=f2, fill=(235, 235, 235))
        s = "%.0f%%" % H80[k] + ("  (%.0f%%)" % H40[k] if k in H40 else ""); f3 = font(13, False); dr.text((x + (CW - dr.textlength(s, font=f3)) / 2, yy + CH + 21), s, font=f3, fill=(190, 190, 190))
    y += h + 2
img.save(OUT); print(OUT, img.size); print({TIERS[n][0]: [(k, round(H80[k], 1), round(H40.get(k, 0), 1)) for k in r] for n, r in enumerate(rows)})
