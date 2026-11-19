"""Mockup (not game code): Baelgor's Fear skill sheet with an anime 'heartbeat' pulse on HIM when the sword is planted - thump-thump twice:
each beat throws out onion-skin copies of his current frame (dark red, swelling and fading), the rest of the picture darkens and drains of colour,
small zoom punch. Background = a real Conquest screenshot. Run: python3 dev/fx/fear_pulse_mock.py BG.png OUT_DIR [COLOR=r,g,b] [HANZO=1]
HANZO=1: an enemy Hanzo starts his Shuriken Storm leap and Fear's stun lands while he is in the air - he freezes there for 4 s, then finishes the leap."""
import os, subprocess, sys
import numpy as np
from PIL import Image, ImageEnhance
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
BGP, OUT = sys.argv[1], sys.argv[2]; os.makedirs(os.path.join(OUT, "f"), exist_ok=True)
GCOL = tuple(int(x) for x in (sys.argv[3] if len(sys.argv) > 3 else "225,25,45").split(",")); HZ = len(sys.argv) > 4 and sys.argv[4] == "1"
hzs = Image.open(os.path.join(ROOT, "art/heroes/hanzo/hanzo_skill_anim_v2.webp")).convert("RGBA"); hzi = Image.open(os.path.join(ROOT, "art/heroes/hanzo/hanzo_anim_v1.webp")).convert("RGBA")
HCLIP = [0, 0, 0, 0, 0.27, 0.27, 6.93, 14.13, 14.13, 17.6, 17.6, 19.47, 19.47, 21.07, 21.07, 22.13, 22.13, 23.2, 23.2, 24, 24, 24.8, 24.8, 25.87, 25.87, 26.4, 26.4, 27.47, 27.47, 28.8, 28.8, 29.33, 29.33, 24, 24, 18.67, 18.67, 18.67, 18.67, 18.67, 18.67, 18.67, 18.67, 18.67, 18.67, 18.67, 0, 0, 0, 0, 0, 0]
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
        hx = round(HZ_X - (him.width - hax) * hk); hy = round(FEETY - 2 * hl - hay * hk); fr.alpha_composite(hs, (hx, max(0, hy))) if hy >= 0 else fr.paste(hs, (hx, hy), hs)
    if dark > 0:
        g = ImageEnhance.Color(fr.convert("RGB")).enhance(1 - 0.85 * dark); g = ImageEnhance.Brightness(g).enhance(1 - 0.55 * dark); fr = g.convert("RGBA")
    bb = spr.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox(); cx, cy = px + (bb[0] + bb[2]) / 2, py + (bb[1] + bb[3]) / 2   # his own body centre this frame
    for s, a in ghosts:
        gimg = tint(spr, GCOL, a).resize((round(hw * s), round(hh * s)), Image.LANCZOS)
        gx, gy = round(cx + (px - cx) * s), round(cy + (py - cy) * s); fr.alpha_composite(gimg, (gx, gy)) if gx >= 0 and gy >= 0 else fr.paste(gimg, (gx, gy), gimg)
    fr.alpha_composite(spr, (px, py))
    if zoom > 1.0005:
        zw, zh = W / zoom, H / zoom; x0, y0 = cx - (cx) / zoom, cy - (cy) / zoom; fr = fr.crop((round(x0), round(y0), round(x0 + zw), round(y0 + zh))).resize((W, H), Image.LANCZOS)
    fr.convert("RGB").save(os.path.join(OUT, "f", "%04d.png" % n)); n += 1
subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", str(FPS), "-i", os.path.join(OUT, "f", "%04d.png"), "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-pix_fmt", "yuv420p", os.path.join(OUT, "fear_pulse_gamesize.mp4")], check=True)
# zoomed view (2x around him) so the effect is easy to see
subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", str(FPS), "-i", os.path.join(OUT, "f", "%04d.png"), "-vf", ("crop=520:300:%d:%d,scale=1040:600:flags=lanczos" % (FEETX - 120, 40)) if HZ else ("crop=430:300:%d:%d,scale=860:600:flags=lanczos" % (FEETX - 215, 40)), "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-pix_fmt", "yuv420p", os.path.join(OUT, "fear_pulse_zoom2x.mp4")], check=True)
print("frames", n, "beats at", [round(b, 2) for b in BEATS])
