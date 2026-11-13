"""Mecha mockups: concept vs reassembled, and an Arena scene with the 5 hero platforms. python3 dev/mecha/mecha_mock.py ASM.png OUTDIR"""
import sys, re
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage
ASM, OUT = sys.argv[1], sys.argv[2]
mech = Image.open(ASM).convert("RGBA")
# platform: flat 2D version (ChatGPT, mecha_platform_flat.png), magenta keyed
pa = np.asarray(Image.open("art/originals/ships/mecha/mecha_platform_flat.png").convert("RGB")).astype(np.float32)
dd = np.minimum(pa[..., 0], pa[..., 2]) - pa[..., 1]; al = np.clip(1 - (dd - 25) / (255 * 0.85 - 25), 0, 1)
cc = np.clip((pa - (1 - al[..., None]) * np.array([255, 0, 255])) / np.maximum(al[..., None], 1e-3), 0, 255); al[al < 0.04] = 0
plat = Image.fromarray(np.dstack([cc, al * 255]).astype(np.uint8)); plat = plat.crop(plat.getbbox()); plat.save("art/originals/ships/mecha/mecha_platform_flat_cut.png")
# 1) concept vs reassembled
con = Image.open("art/originals/ships/mecha/mecha_B4_pick.png").convert("RGB").crop((0, 0, 620, 544))
H = 560; c2 = con.resize((round(con.width * H / con.height), H)); m2 = mech.resize((round(mech.width * (H - 20) / mech.height), H - 20))
cmp = Image.new("RGB", (c2.width + m2.width + 60, H + 40), (34, 38, 52)); cmp.paste(c2, (10, 30))
bgp = Image.new("RGBA", m2.size, (200, 200, 204, 255)); bgp.alpha_composite(m2); cmp.paste(bgp.convert("RGB"), (c2.width + 40, 40))
d = ImageDraw.Draw(cmp); d.text((14, 8), "Concept", fill=(240, 201, 95)); d.text((c2.width + 44, 8), "Rebuilt from the separate parts", fill=(240, 201, 95))
cmp.save(OUT + "/mecha_rebuilt_vs_concept.png")
# 2) Arena scene (left = player side), at 3x. Floor line of this background ~ y 340 (1x).
S = 3; bg = Image.open("art/originals/backgrounds/arena_bg_1200x660.png").convert("RGBA").resize((860 * S, 473 * S))
sc = bg.copy(); gy = 352 * S
mw = 250 * S; mm = mech.resize((mw, round(mech.height * mw / mech.width)))
mx, my = 20 * S, gy - mm.height - 14 * S    # hands float ~14 px above the floor
sh = Image.new("RGBA", sc.size, (0, 0, 0, 0)); ds = ImageDraw.Draw(sh); ds.ellipse([mx + mw * 0.25, gy - 6 * S, mx + mw * 0.75, gy + 6 * S], fill=(0, 0, 0, 120)); sc.alpha_composite(sh.filter(ImageFilter.GaussianBlur(5 * S)))
pw = 50 * S; pp = plat.resize((pw, round(plat.height * pw / plat.width)))
HER = [("lyra", "art/heroes/lyra/lyra_anim_v1.webp", 202, 142, 45.76, 140.19, 34.85), ("vesper", "art/heroes/vesper/vesper_anim_v1.webp", 84, 116, 44.3, 113.78, 28.47),
       ("pip", "art/heroes/pip/pip_anim_v1.webp", 104, 120, 33.63, 117.91, 29.45), ("sera", "art/heroes/sera/sera_anim_v1.webp", 123, 144, 56.91, 141.87, 32.73), ("lyra", "art/heroes/lyra/lyra_anim_v1.webp", 202, 142, 45.76, 140.19, 34.85)]
# platform centres as fractions of the mecha box (x from its back, y from its top): front pair, over the head, back pair
SP = [(1.08, 0.40), (0.98, 0.72), (0.56, -0.06), (0.06, 0.30), (-0.02, 0.62)]
pts = [(mx + fx * mw, my + fy * mm.height) for fx, fy in SP]
def hero(i, cx, top):
    k, f, cw, ch, ax, ay, dh = HER[i]; im = Image.open(f).convert("RGBA").crop((0, 0, cw, ch)); kk = dh * 1.09 * S / ch
    im = im.resize((round(cw * kk), round(ch * kk))); sc.alpha_composite(im, (round(cx - ax * kk), round(top - ay * kk)))
floor = round(pp.height * 0.38)   # the platform floor sits ~30% down the platform picture (inside the rail)
order = sorted(range(5), key=lambda i: pts[i][1] if SP[i][0] < 0.5 else 9e9)
behind = [i for i in range(5) if SP[i][0] < 0.5 or SP[i][1] < 0]
for i in behind:
    cx, cy = pts[i]; sc.alpha_composite(pp, (round(cx - pw / 2), round(cy))); hero(i, cx, cy + floor)
sc.alpha_composite(mm, (mx, my))
for i in range(5):
    if i in behind: continue
    cx, cy = pts[i]; sc.alpha_composite(pp, (round(cx - pw / 2), round(cy))); hero(i, cx, cy + floor)
sc.convert("RGB").save(OUT + "/mecha_arena_mock.png"); print("ok")
