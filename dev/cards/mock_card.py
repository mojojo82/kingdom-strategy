"""Card mockups: art behind the empty frame, icon in the socket, text drawn by code (stand-in serif fonts; the game uses Cinzel / EB Garamond).
python3 dev/cards/mock_card.py CARDS.json OUT_PREFIX [FRAMES_DIR]
CARDS.json = [{"slug","rarity","icon","name","type","effect","flavour","oy"(0..1 vertical crop, default 0.08)}]
Writes OUT_PREFIX_sheet.png (cards in a row) and OUT_PREFIX_squares.png (the centred square crop each art gets in the Overlord profile)."""
import sys, json
from PIL import Image, ImageDraw, ImageFont
R = "/home/claude/kingdom-strategy/"; FD = sys.argv[3] if len(sys.argv) > 3 else R + "art/originals/cards/frames"
FB = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"; FR = "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf"
FI = "/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf"; FRB = "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
L = dict(art=(64, 70, 960, 905), sock=(512, 824, 66), name=950, type=1043, eff=1165, flav=1268, plate=1420)
COL = dict(common="#d8d8d8", rare="#d6e8ff", epic="#efe0ff", legendary="#ffe9a8")
def wrap(d, s, F, maxw):
    words, lines, cur = s.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if d.textlength(t, font=F) <= maxw: cur = t
        else: lines.append(cur); cur = w
    if cur: lines.append(cur)
    return lines
_OV = {}
def socket_overlay(rarity):
    """Frame pixels around the icon socket that are metal (bright: ring, spike), so they can be drawn over the icon. The dark recess stays under it."""
    if rarity not in _OV:
        import numpy as np
        fr = np.asarray(Image.open(f"{FD}/frame_{rarity}_keyed.png").convert("RGBA")).copy(); lum = fr[..., :3].mean(2)
        m = np.zeros(lum.shape, bool); m[720:940, 410:614] = True; m &= lum > 85
        fr[..., 3] = np.where(m, fr[..., 3], 0); _OV[rarity] = Image.fromarray(fr, "RGBA")
    return _OV[rarity]
def card(c):
    W, H = 1024, 1536; out = Image.new("RGBA", (W, H), (0, 0, 0, 0)); art = Image.open(R + "art/originals/cards/art/" + c["slug"] + "_v" + str(c.get("v", 1)) + ".png").convert("RGBA")
    x0, y0, x1, y1 = L["art"]; aw, ah = x1 - x0, y1 - y0; s = max(aw / art.width, ah / art.height)
    a = art.resize((round(art.width * s), round(art.height * s)), Image.LANCZOS); ox = (a.width - aw) // 2; oy = int((a.height - ah) * c.get("oy", 0.08))
    a = a.crop((ox, oy, ox + aw, oy + ah)); m = Image.new("L", (aw, ah), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, aw - 1, ah - 1), 46, fill=255)
    out.paste(a, (x0, y0), m); out.alpha_composite(Image.open(f"{FD}/frame_{c['rarity']}_keyed.png").convert("RGBA"))
    if c.get("icon"):
        cx, cy, r = L["sock"]; ic = Image.open(R + f"art/originals/cards/icons/icon_{c['icon']}.png").convert("RGBA"); k = (r * 1.75) / max(ic.size)
        ic = ic.resize((round(ic.width * k), round(ic.height * k)), Image.LANCZOS); out.alpha_composite(ic, (cx - ic.width // 2, cy - ic.height // 2))
        out.alpha_composite(socket_overlay(c["rarity"]))  # the socket's metal ring + the little spike below it sit ON TOP of the icon
    d = ImageDraw.Draw(out)
    def t(y, s, f, size, fill, stroke=0, sc=None, maxw=640):
        F = ImageFont.truetype(f, size)
        while d.textlength(s, font=F) > maxw and size > 20: size -= 2; F = ImageFont.truetype(f, size)
        d.text((W / 2, y), s, font=F, fill=fill, anchor="mm", stroke_width=stroke, stroke_fill=sc)
    t(L["name"], c["name"].upper(), FB, 46, "#fff6dc", 2, "#1a1020", 600); t(L["type"], c["type"], FRB, 36, "#2a1f14", maxw=460)
    F = ImageFont.truetype(FR, 44); lines = wrap(d, c["effect"], F, 700)
    if len(lines) > 3: F = ImageFont.truetype(FR, 36); lines = wrap(d, c["effect"], F, 720)
    lh = F.size * 1.15; y = L["eff"] + 20 - (len(lines) - 1) * lh / 2 - (0 if len(lines) > 1 else 20)
    for i, ln in enumerate(lines): d.text((W / 2, y + i * lh), ln, font=F, fill="#1c140c", anchor="mm")
    if c.get("flavour"): t(L["flav"] + (14 if len(lines) > 2 else 0), c["flavour"], FI, 30, "#3a2e22", maxw=720)
    t(L["plate"], c["rarity"].upper(), FB, 40, COL[c["rarity"]], 2, "#140c18", 380)
    sq = a.crop(((aw - ah) // 2, 0, (aw - ah) // 2 + ah, ah)) if aw > ah else a.crop((0, (ah - aw) // 2, aw, (ah - aw) // 2 + aw))
    return out, sq.convert("RGB").resize((400, 400), Image.LANCZOS)
cards = json.load(open(sys.argv[1])); res = [card(c) for c in cards]; n = len(res)
sheet = Image.new("RGB", (n * 1024 + (n + 1) * 40, 1616), "#22262e"); sq = Image.new("RGB", (n * 400 + (n + 1) * 20, 440), "#22262e")
for i, (cd, s) in enumerate(res): sheet.paste(cd, (40 + i * 1064, 40), cd); sq.paste(s, (20 + i * 420, 20))
sheet.save(sys.argv[2] + "_sheet.png"); sq.save(sys.argv[2] + "_squares.png"); print("ok", n)
