"""Mockup (not game code): Baelgor's Fear skill sheet with an anime 'heartbeat' pulse on HIM when the sword is planted - thump-thump twice:
each beat throws out onion-skin copies of his current frame (dark red, swelling and fading), the rest of the picture darkens and drains of colour,
small zoom punch. Background = a real Conquest screenshot. Run: python3 dev/fx/fear_pulse_mock.py BG.png OUT_DIR [COLOR=r,g,b] [HANZO=1]
HANZO=1: an enemy Hanzo starts his Shuriken Storm leap and Fear's stun lands while he is in the air - he freezes there for 4 s, then finishes the leap.
FIRE=1 (5th arg): while Hanzo hangs frozen, small black-flame fireballs (Atlas loop) fly from Baelgor to him in braided paths - each group of three
twists round one another like a rope, converging on him; white hit flash + puff on impact."""
import os, subprocess, sys
import numpy as np
from PIL import Image, ImageEnhance, ImageDraw
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
BGP, OUT = sys.argv[1], sys.argv[2]; os.makedirs(os.path.join(OUT, "f"), exist_ok=True)
FIRE = len(sys.argv) > 5 and sys.argv[5] == "1"
GCOL = tuple(int(x) for x in (sys.argv[3] if len(sys.argv) > 3 else "225,25,45").split(",")); HZ = len(sys.argv) > 4 and sys.argv[4] == "1"
hzs = Image.open(os.path.join(ROOT, "art/heroes/hanzo/hanzo_skill_anim_v2.webp")).convert("RGBA"); hzi = Image.open(os.path.join(ROOT, "art/heroes/hanzo/hanzo_anim_v1.webp")).convert("RGBA")
HCLIP = [0, 0, 0, 0, 0.27, 0.27, 6.93, 14.13, 14.13, 17.6, 17.6, 19.47, 19.47, 21.07, 21.07, 22.13, 22.13, 23.2, 23.2, 24, 24, 24.8, 24.8, 25.87, 25.87, 26.4, 26.4, 27.47, 27.47, 28.8, 28.8, 29.33, 29.33, 24, 24, 18.67, 18.67, 18.67, 18.67, 18.67, 18.67, 18.67, 18.67, 18.67, 18.67, 18.67, 0, 0, 0, 0, 0, 0]
FBF = []
if FIRE:
    import glob, tempfile
    _t = tempfile.mkdtemp(); subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(ROOT, "art/originals/heroes/siphon/fx/fear_fireball_loop_v1.mp4"), os.path.join(_t, "%04d.png")], check=True)
    for _f in sorted(glob.glob(os.path.join(_t, "*.png")))[:-1]:
        _a = np.asarray(Image.open(_f).convert("RGB")).astype(np.float32); _M = np.median(_a[:30].reshape(-1, 3), 0)
        _d = _a[..., 1] - np.maximum(_a[..., 0], _a[..., 2]); _dm = _M[1] - max(_M[0], _M[2]); _al = np.clip(1 - (_d - 25) / (_dm * 0.85 - 25), 0, 1)
        _c = np.clip((_a - (1 - _al[..., None]) * _M) / np.maximum(_al[..., None], 1e-3), 0, 255); _c[..., 1] = np.minimum(_c[..., 1], np.maximum(_c[..., 0], _c[..., 2])); _al[_al < 0.03] = 0
        _im = Image.fromarray(np.dstack([_c, _al * 255]).astype(np.uint8), "RGBA").crop((220, 230, 880, 540)); FBF.append(_im.resize((round(_im.width * 0.09), round(_im.height * 0.09)), Image.LANCZOS))
def hanzo_lift(f):
    P = 80; T = 0
    if 6 <= f < 35: u = (f - 6) / 29; T = P * (1 - (1 - u) ** 2)
    elif 35 <= f < 46: u = (f - 35) / 11; T = P * (1 - u * u)
    i = max(0, min(51, int(f))); fr = max(0, min(1, f - i)); a = HCLIP[i]; b = HCLIP[min(51, i + 1)]
    return max(-a, T - (a + (b - a) * fr * fr * (3 - 2 * fr)))
sheet = Image.open(os.path.join(ROOT, "art/heroes/siphon/siphon_skill_anim_v1.webp")).convert("RGBA")
CW, CH, AX, AY, WRAP, ROW, N, FPS_S = 442, 395, 151.0, 375.9, 9, 1, 69, 16
idle = Image.open(os.path.join(ROOT, "art/heroes/siphon/siphon_anim_v1.webp")).convert("RGBA")
ICW, ICH, IAX, IAY, IDH = 497, 393, 191.03, 388.43, 68.35
def cell(f): return sheet.crop(((f % WRAP) * CW, (ROW * 2 + f // WRAP) * CH, (f % WRAP) * CW + CW, (ROW * 2 + f // WRAP) * CH + CH))
bg0 = Image.open(BGP).convert("RGB").crop((0, 380, 860, 760)); W, H = bg0.size
FEETX, FEETY = 330, 318; K = 2 * 71.82 / CH; KI = 2 * IDH / ICH
FPS = 30; PRE, POST = 0.6, 0.8; TOT = PRE + N / FPS_S + POST; IMP = PRE + 28 / FPS_S
BEATS = [IMP, IMP + 0.22, IMP + 1.0, IMP + 1.22]; BEAT_LEN = 0.45
HZ_X = 600; HZ_FREEZE_F = 20; HZ_T0 = IMP - HZ_FREEZE_F / 24; STUN = 4.0
if HZ: TOT = max(TOT, IMP + STUN + (52 - HZ_FREEZE_F) / 24 + 0.6)
import math
FB_DUR = 0.75; GROUPS = [IMP + 0.55, IMP + 1.45, IMP + 2.35]   # three braided groups while he hangs there
FBS = [{"t0": g + k * 0.03, "ph": k * 2 * math.pi / 3, "fi": (k * 17 + gi * 5) % 120} for gi, g in enumerate(GROUPS) for k in range(3)]
HZ_C = [None]
def hanzo_at(t):   # (image, k, ax, ay, lift px at scale 1)
    if t < HZ_T0: return hzi.crop((0, 0, 274, 141)), 2 * 37.6 / 141, 82.83, 135.65, 0
    e = t - HZ_T0
    if e >= HZ_FREEZE_F / 24: e = HZ_FREEZE_F / 24 if t < IMP + STUN else e - STUN
    f = e * 24
    if f >= 52: return hzi.crop((0, 0, 274, 141)), 2 * 37.6 / 141, 82.83, 135.65, 0
    fi = int(f); c = hzs.crop(((fi % 13) * 190, (2 + fi // 13) * 278, (fi % 13) * 190 + 190, (2 + fi // 13) * 278 + 278))
    return c, 2 * 74.13 / 278, 87.2, 255.35, hanzo_lift(f)
def hero_at(t):
    if t < PRE or t >= PRE + N / FPS_S: c = idle.crop((0, 0, ICW, ICH)); return c, KI, IAX, IAY
    return cell(min(N - 1, int((t - PRE) * FPS_S))), K, AX, AY
def tint(im, col, a):
    arr = np.asarray(im).astype(np.float32); out = arr.copy(); out[..., :3] = col; out[..., 3] = arr[..., 3] * a; return Image.fromarray(out.astype(np.uint8))
n = 0
for i in range(int(TOT * FPS)):
    t = i / FPS; im, k, ax, ay = hero_at(t)
    hw, hh = round(im.width * k), round(im.height * k); spr = im.resize((hw, hh), Image.LANCZOS); px, py = round(FEETX - ax * k), round(FEETY - ay * k)
    dark = 0.0; ghosts = []; zoom = 1.0
    for b in BEATS:
        p = (t - b) / BEAT_LEN
        if 0 <= p < 1:
            dark = max(dark, (1 - p) ** 1.5); zoom = max(zoom, 1 + 0.035 * (1 - p) ** 3)
            for j in range(3):
                q = p - j * 0.18
                if 0 <= q < 1: ghosts.append((1 + 0.9 * q, 0.75 * (1 - q) ** 1.3))
    fr = bg0.copy().convert("RGBA")
    if HZ:  # drawn before the darkening - Fear's effect on the target is Harley's call, so he only freezes
        him, hk, hax, hay, hl = hanzo_at(t); hs = him.transpose(Image.FLIP_LEFT_RIGHT).resize((round(him.width * hk), round(him.height * hk)), Image.LANCZOS)
        hx = round(HZ_X - (him.width - hax) * hk); hy = round(FEETY - 2 * hl - hay * hk); _bb = hs.getchannel("A").getbbox(); HZ_C[0] = (hx + (_bb[0] + _bb[2]) / 2, hy + (_bb[1] + _bb[3]) / 2) if _bb else None; fr.alpha_composite(hs, (hx, max(0, hy))) if hy >= 0 else fr.paste(hs, (hx, hy), hs)
    if dark > 0:
        g = ImageEnhance.Color(fr.convert("RGB")).enhance(1 - 0.85 * dark); g = ImageEnhance.Brightness(g).enhance(1 - 0.55 * dark); fr = g.convert("RGBA")
    bb = spr.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox(); cx, cy = px + (bb[0] + bb[2]) / 2, py + (bb[1] + bb[3]) / 2   # his own body centre this frame
    for s, a in ghosts:
        gimg = tint(spr, GCOL, a).resize((round(hw * s), round(hh * s)), Image.LANCZOS)
        gx, gy = round(cx + (px - cx) * s), round(cy + (py - cy) * s); fr.alpha_composite(gimg, (gx, gy)) if gx >= 0 and gy >= 0 else fr.paste(gimg, (gx, gy), gimg)
    fr.alpha_composite(spr, (px, py))
    if FIRE and HZ and HZ_C[0]:
        src = (FEETX + 26, FEETY - 46); tx, ty = HZ_C[0]; L = math.hypot(tx - src[0], ty - src[1]); ux, uy = (tx - src[0]) / L, (ty - src[1]) / L; nx, ny = -uy, ux
        lay = Image.new("RGBA", fr.size, (0, 0, 0, 0)); dr = ImageDraw.Draw(lay)
        for q in FBS:
            u = (t - q["t0"]) / FB_DUR
            if 0 <= u <= 1:
                amp = 16 * math.sin(math.pi * u); w = q["ph"] + u * 2 * math.pi * 1.6   # braid: same helix, phases 120 deg apart, wraps 1.6 turns, tight at both ends
                off = amp * math.sin(w); x = src[0] + ux * L * u + nx * off; y = src[1] + uy * L * u + ny * off
                du = 0.01; amp2 = 16 * math.sin(math.pi * min(1, u + du)); off2 = amp2 * math.sin(q["ph"] + min(1, u + du) * 2 * math.pi * 1.6)
                x2 = src[0] + ux * L * min(1, u + du) + nx * off2; y2 = src[1] + uy * L * min(1, u + du) + ny * off2
                im2 = FBF[(q["fi"] + int(t * 24)) % len(FBF)].rotate(math.degrees(math.atan2(-(y2 - y), x2 - x)), resample=Image.BICUBIC, expand=True)
                depth = math.cos(w)   # the strand 'behind' is a touch smaller / dimmer so they read as twisting round each other
                sc = 1 + 0.18 * depth; im2 = im2.resize((max(1, round(im2.width * sc)), max(1, round(im2.height * sc))), Image.LANCZOS)
                if depth < 0: im2.putalpha(im2.getchannel("A").point(lambda v: int(v * 0.8)))
                fr.alpha_composite(im2, (round(x - im2.width * 0.62), round(y - im2.height / 2)))
            e = t - q["t0"] - FB_DUR
            if 0 <= e < 0.3:
                k2 = e / 0.3; R = 5 + 22 * k2
                dr.ellipse((tx - R * 0.6, ty - R * 0.6, tx + R * 0.6, ty + R * 0.6), fill=(18, 18, 22, int(130 * (1 - k2)))); dr.ellipse((tx - R, ty - R, tx + R, ty + R), outline=(255, 255, 255, int(230 * (1 - k2))), width=max(1, round(3 * (1 - k2))))
                if k2 < 0.3: dr.ellipse((tx - 9, ty - 9, tx + 9, ty + 9), fill=(255, 255, 255, int(255 * (1 - k2 / 0.3))))
        fr.alpha_composite(lay)
    if zoom > 1.0005:
        zw, zh = W / zoom, H / zoom; x0, y0 = cx - (cx) / zoom, cy - (cy) / zoom; fr = fr.crop((round(x0), round(y0), round(x0 + zw), round(y0 + zh))).resize((W, H), Image.LANCZOS)
    fr.convert("RGB").save(os.path.join(OUT, "f", "%04d.png" % n)); n += 1
subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", str(FPS), "-i", os.path.join(OUT, "f", "%04d.png"), "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-pix_fmt", "yuv420p", os.path.join(OUT, "fear_pulse_gamesize.mp4")], check=True)
# zoomed view (2x around him) so the effect is easy to see
subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", str(FPS), "-i", os.path.join(OUT, "f", "%04d.png"), "-vf", ("crop=520:300:%d:%d,scale=1040:600:flags=lanczos" % (FEETX - 120, 40)) if HZ else ("crop=430:300:%d:%d,scale=860:600:flags=lanczos" % (FEETX - 215, 40)), "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-pix_fmt", "yuv420p", os.path.join(OUT, "fear_pulse_zoom2x.mp4")], check=True)
print("frames", n, "beats at", [round(b, 2) for b in BEATS])
