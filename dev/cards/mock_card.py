"""Card mockup: art behind the empty frame, class icon in the socket, text drawn by code (stand-in serif fonts; the game will use Cinzel /
EB Garamond). python3 dev/cards/mock_card.py OUT.png  (writes a 4-rarity strip)"""
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
R = "/home/claude/kingdom-strategy/"; SP = sys.argv[2] if len(sys.argv) > 2 else "/tmp"
FB = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"; FR = "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf"
FI = "/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf"; FRB = "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
L = dict(art=(64, 70, 960, 905), sock=(512, 797, 62), name=950, type=1043, eff=1165, flav=1268, plate=1420)
COL = dict(common="#d8d8d8", rare="#d6e8ff", epic="#efe0ff", legendary="#ffe9a8")
def card(rarity, art, icon, name, typ, eff, flav):
    W, H = 1024, 1536; c = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    x0, y0, x1, y1 = L["art"]; aw, ah = x1 - x0, y1 - y0; s = max(aw / art.width, ah / art.height)
    a = art.resize((round(art.width * s), round(art.height * s)), Image.LANCZOS); ox = (a.width - aw) // 2; oy = int((a.height - ah) * 0.08)
    a = a.crop((ox, oy, ox + aw, oy + ah)); m = Image.new("L", (aw, ah), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, aw - 1, ah - 1), 46, fill=255)
    c.paste(a, (x0, y0), m)
    fr = Image.open(f"{SP}/frame_{rarity}.png").convert("RGBA"); c.alpha_composite(fr)
    cx, cy, r = L["sock"]; ic = icon.copy(); k = (r * 1.75) / max(ic.size); ic = ic.resize((round(ic.width * k), round(ic.height * k)), Image.LANCZOS)
    c.alpha_composite(ic, (cx - ic.width // 2, cy - ic.height // 2))
    d = ImageDraw.Draw(c)
    def t(y, s, f, size, fill, stroke=0, sc=None):
        F = ImageFont.truetype(f, size); w = d.textlength(s, font=F)
        while w > 640 and size > 20: size -= 2; F = ImageFont.truetype(f, size); w = d.textlength(s, font=F)
        d.text((W / 2, y), s, font=F, fill=fill, anchor="mm", stroke_width=stroke, stroke_fill=sc)
    t(L["name"], name.upper(), FB, 46, "#fff6dc", 2, "#1a1020")
    t(L["type"], typ, FRB, 36, "#2a1f14")
    t(L["eff"], eff, FR, 46, "#1c140c")
    t(L["flav"], flav, FI, 32, "#3a2e22")
    t(L["plate"], rarity.upper(), FB, 40, COL[rarity], 2, "#140c18")
    return c
art = Image.open(R + "art/originals/cards/tcg_concepts/desperate_spark_art_v1.png").convert("RGBA")
icon = Image.open(R + "art/originals/cards/icons/icon_caster.png").convert("RGBA")
cards = [card(k, art, icon, "Desperate Spark", "Support - Kessa", "Kessa's base ATK +200%.", "A final surge, when there is no other choice.") for k in ["common", "rare", "epic", "legendary"]]
strip = Image.new("RGB", (4 * 1024 + 5 * 40, 1536 + 80), "#22262e")
for i, cd in enumerate(cards): strip.paste(cd, (40 + i * 1064, 40), cd)
strip.save(sys.argv[1]); cards[3].save(sys.argv[1].replace(".png", "_legendary.png")); print("ok")
