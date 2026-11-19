"""Mockup (not game code): Baelgor's Fear skill sheet with an anime 'heartbeat' pulse on HIM when the sword is planted - thump-thump twice:
each beat throws out onion-skin copies of his current frame (dark red, swelling and fading), the rest of the picture darkens and drains of colour,
small zoom punch. Background = a real Conquest screenshot. Run: python3 dev/fx/fear_pulse_mock.py BG.png OUT_DIR [COLOR=r,g,b] [HANZO=1]
HANZO=1: an enemy Hanzo starts his Shuriken Storm leap and Fear's stun lands while he is in the air - he freezes there for 4 s, then finishes the leap.
FIRE=1 (5th arg): while Hanzo hangs frozen, small black-flame fireballs (Atlas loop) fly from Baelgor to him in braided paths - each group of three
twists round one another like a rope, converging on him; white hit flash + puff on impact."""
import os, subprocess, sys
import numpy as np
from PIL import Image, ImageEnhance, ImageDraw, ImageFilter
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
BGP, OUT = sys.argv[1], sys.argv[2]; os.makedirs(os.path.join(OUT, "f"), exist_ok=True)
FIRE = len(sys.argv) > 5 and sys.argv[5] in ("1", "2", "3"); FBRED = len(sys.argv) > 5 and sys.argv[5] == "3"   # 3 = code fireballs in the pulse red
BRAID = float(os.environ.get("BRAID", "16"))
HZECHO = os.environ.get("HZECHO") == "1"
HZTINT = os.environ.get("HZTINT") == "1"
HZTREM = os.environ.get("HZTREM") == "1"     # he trembles (small shake, harder on each of his beats)
HZBURST = os.environ.get("HZBURST") == "1"   # release burst: one big red echo + ring when the stun breaks
HZTHREAD = os.environ.get("HZTHREAD") == "1" # a thin red thread from the eye in Baelgor's sword to him, throbbing with the beats
HZEYE = os.environ.get("HZEYE") == "1"       # the eye (fear_eye_white_v1 tinted red) opens above him, watches, pulses on beats, blinks shut at release
HZFX = os.environ.get("HZFX", "")   # cracks | chains | slash : extra effect on the frozen hero (on top of HZECHO if set)
DARKE = os.environ.get("DARKE") == "1"   # dark energy (ChatGPT smoke puffs + tileable energy strip, animated in code) from the sword eye to him, swirling round him
EYEIMG = None
if HZEYE:
    _e = Image.open(os.path.join(ROOT, "art/originals/heroes/siphon/fx/fear_eye_white_v1.png")).convert("RGBA"); _e = _e.resize((46, round(46 * _e.height / _e.width)), Image.LANCZOS)
    _a = np.asarray(_e).astype(np.float32); _a[..., 0] = np.clip(_a[..., 0] * 1.0, 0, 255); _a[..., 1] *= 0.25; _a[..., 2] *= 0.3; EYEIMG = Image.fromarray(_a.astype(np.uint8))   # fear tint: the frozen hero goes dark + drained of colour for the stun, red flash on each of his heartbeats   # the frozen hero does his own heartbeat echo (red ghost copies of himself) for the whole stun   # braid spread (px on this 2x canvas)
CODEFB = len(sys.argv) > 5 and sys.argv[5] in ("2", "3")   # 2 = code-drawn fireballs (white core, black flame tongues with a white rim, black wisps)
GCOL = tuple(int(x) for x in (sys.argv[3] if len(sys.argv) > 3 else "225,25,45").split(",")); HZ = len(sys.argv) > 4 and sys.argv[4] == "1"
hzs = Image.open(os.path.join(ROOT, "art/heroes/hanzo/hanzo_skill_anim_v2.webp")).convert("RGBA"); hzi = Image.open(os.path.join(ROOT, "art/heroes/hanzo/hanzo_anim_v1.webp")).convert("RGBA")
HCLIP = [0, 0, 0, 0, 0.27, 0.27, 6.93, 14.13, 14.13, 17.6, 17.6, 19.47, 19.47, 21.07, 21.07, 22.13, 22.13, 23.2, 23.2, 24, 24, 24.8, 24.8, 25.87, 25.87, 26.4, 26.4, 27.47, 27.47, 28.8, 28.8, 29.33, 29.33, 24, 24, 18.67, 18.67, 18.67, 18.67, 18.67, 18.67, 18.67, 18.67, 18.67, 18.67, 18.67, 0, 0, 0, 0, 0, 0]
FBF = []
if FIRE and not CODEFB:
    import glob, tempfile
    _t = tempfile.mkdtemp(); subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(ROOT, "art/originals/heroes/siphon/fx/fear_fireball_loop_v1.mp4"), os.path.join(_t, "%04d.png")], check=True)
    for _f in sorted(glob.glob(os.path.join(_t, "*.png")))[:-1]:
        _a = np.asarray(Image.open(_f).convert("RGB")).astype(np.float32); _M = np.median(_a[:30].reshape(-1, 3), 0)
        _d = _a[..., 1] - np.maximum(_a[..., 0], _a[..., 2]); _dm = _M[1] - max(_M[0], _M[2]); _al = np.clip(1 - (_d - 25) / (_dm * 0.85 - 25), 0, 1)
        _c = np.clip((_a - (1 - _al[..., None]) * _M) / np.maximum(_al[..., None], 1e-3), 0, 255); _c[..., 1] = np.minimum(_c[..., 1], np.maximum(_c[..., 0], _c[..., 2])); _al[_al < 0.03] = 0
        _im = Image.fromarray(np.dstack([_c, _al * 255]).astype(np.uint8), "RGBA").crop((220, 230, 880, 540)); FBF.append(_im.resize((round(_im.width * 0.09), round(_im.height * 0.09)), Image.LANCZOS))
def _nz(t, k): return math.sin(t * 7.1 + k * 1.7) * 0.5 + math.sin(t * 13.3 + k * 4.1) * 0.3 + math.sin(t * 23.7 + k * 2.3) * 0.2
def _tongue(dr, x, y, ang, L, w, fill, ss):   # teardrop from head (x,y) streaming back along ang+pi
    pts = []; ca, sa = math.cos(ang + math.pi), math.sin(ang + math.pi)
    for i in range(21):
        u = i / 20; ww = w * math.sin(math.pi * min(1, 0.12 + u * 0.88)) * (1 - u) ** 0.6; pts.append((u * L, ww))
    pts = pts + [(px_, -py_) for px_, py_ in reversed(pts)]
    dr.polygon([((x + ca * px_ - sa * py_) * ss, (y + sa * px_ + ca * py_) * ss) for px_, py_ in pts], fill=fill)
def code_fireball(fr, x, y, ang, t, k, wisps, sc=1.0):
    SS = 3; R = 44; box = (round(x - R), round(y - R)); lay = Image.new("RGBA", (2 * R * SS, 2 * R * SS), (0, 0, 0, 0)); d = ImageDraw.Draw(lay); cx, cy = R, R
    for q in wisps:   # trailing black wisps (world coords -> local)
        u = q["age"] / q["max"]; lx, ly = q["x"] - box[0], q["y"] - box[1]
        if 0 <= lx < 2 * R and 0 <= ly < 2 * R:
            _tongue(d, lx, ly, q["ang"], q["L"] * (1 - 0.4 * u) * sc, q["w"] * (1 - 0.5 * u) * sc + 0.6, ((255, 120, 130) if FBRED else (255, 255, 255)) + (int(110 * (1 - u)),), SS)
            _tongue(d, lx + math.cos(q["ang"]) * 0.8, ly + math.sin(q["ang"]) * 0.8, q["ang"], q["L"] * (1 - 0.4 * u) * sc * 0.92, q["w"] * (1 - 0.5 * u) * sc, ((200, 20, 40) if FBRED else (8, 8, 12)) + (int(220 * (1 - u)),), SS)
    for i in range(6, -1, -1):   # flame tongues: white rim first, black body on top, each wobbling on its own
        L = (15 + i * 4.2) * (1 + 0.35 * _nz(t * 2.6, i * 3.1 + k)) * sc; w = (8.6 - i * 0.6) * sc; da = 0.5 * _nz(t * 2.1, i + 20 + k) * (1 if i % 2 else -1)
        _tongue(d, cx + math.cos(ang) * 1.6, cy + math.sin(ang) * 1.6, ang + da, L + 1.2, w + 0.8, ((255, 140, 150, 190) if FBRED else (240, 244, 255, 170)), SS)
        _tongue(d, cx + math.cos(ang) * 1.2, cy + math.sin(ang) * 1.2, ang + da, L, w, ((225, 25, 45, 245) if FBRED else (4, 4, 8, 250)), SS)
    lay = lay.filter(ImageFilter.GaussianBlur(0.35 * SS)).resize((2 * R, 2 * R), Image.LANCZOS)
    g = Image.new("RGBA", (2 * R, 2 * R), (0, 0, 0, 0)); gd = ImageDraw.Draw(g)   # white core + soft halo
    fl = 1 + 0.12 * _nz(t, 3 + k); 
    for rr, a, col in ((8.5 * fl * sc, 45, (255, 60, 75) if FBRED else (255, 255, 255)), (6.5 * fl * sc, 110, (255, 80, 95) if FBRED else (255, 255, 255)), (4.8 * fl * sc, 255, (255, 190, 195) if FBRED else (255, 255, 255))): gd.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), fill=col + (a,))
    g = g.filter(ImageFilter.GaussianBlur(1.4)); lay.alpha_composite(g)
    fr.alpha_composite(lay, box)
import random as _rnd, math
def make_cracks(seed):   # a branching crack pattern (list of segments with the beat index they appear on)
    r = _rnd.Random(seed); segs = []
    def grow(x, y, a, L, depth, beat):
        if depth > 4 or L < 3: return
        n = r.randint(2, 4); px_, py_ = x, y
        for i in range(n):
            a += r.uniform(-0.6, 0.6); nx_, ny_ = px_ + math.cos(a) * L / n, py_ + math.sin(a) * L / n; segs.append((px_, py_, nx_, ny_, beat, depth)); px_, py_ = nx_, ny_
        for k in range(r.randint(1, 2)): grow(px_, py_, a + r.uniform(-1.2, 1.2), L * 0.65, depth + 1, min(3, beat + 1))
    for k in range(5): grow(0, 0, k * 2 * math.pi / 5 + r.uniform(-0.3, 0.3), r.uniform(22, 34), 0, 0)
    return segs
CRACKS = make_cracks(9); SHARDS = [(_rnd.Random(k).uniform(0, 6.28), _rnd.Random(k + 50).uniform(60, 160), _rnd.Random(k + 90).uniform(3, 7)) for k in range(16)]
_CUT = os.path.join(ROOT, "art/originals/heroes/siphon/fx/cut")
PUFFS = []; ESTRIP = None; LINKS = {}
CLAWS = {}
if HZFX == "claws": CLAWS = {k_: Image.open(os.path.join(_CUT, "claw_%s.png" % k_)).convert("RGBA") for k_ in ("open", "closed")}
def portal_edge_fade(h, w, top=740, bot=820, x0=24, x1=110):
    """Ground smoke burst of the portal clip spreads past the clip's sides (v2 frames 19-54, rows below ~840): fade alpha to 0 toward the left /
    right edges, only in the ground band (rows below top..bot), so the smoke dissolves softly instead of being cut. The hand / ring (x >= 118) is untouched."""
    sm = lambda e0, e1, v: (lambda u: u * u * (3 - 2 * u))(np.clip((v - e0) / (e1 - e0), 0, 1))
    xs = np.arange(w, dtype=np.float32); side = sm(x0, x1, np.minimum(xs, w - 1 - xs))
    band = sm(top, bot, np.arange(h, dtype=np.float32))[:, None]
    return 1 - band * (1 - side[None, :])
PORTAL = []   # HZFX=portal: the Atlas portal-grab clip (fx/portal_grab_v1.mp4, keyed): portal opens under him, the hand rises and grabs him
PORTALDN = []   # PORTALDESC=clip.mp4: the hand sinks back into the portal and it closes (fx/portal_descend_v1.mp4), played after the stun
def _load_portal(name):
    import glob as _g3, tempfile as _tf3
    out = []; _t3 = _tf3.mkdtemp(); subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(ROOT, "art/originals/heroes/siphon/fx/" + name), os.path.join(_t3, "%04d.png")], check=True)
    for _f in sorted(_g3.glob(os.path.join(_t3, "*.png"))):
        _a = np.asarray(Image.open(_f).convert("RGB")).astype(np.float32); _M = np.array([11.0, 230.0, 10.0])
        _d = _a[..., 1] - np.maximum(_a[..., 0], _a[..., 2]); _al = np.clip(1 - (_d - 20) / (180 - 20), 0, 1)
        _c = np.clip((_a - (1 - _al[..., None]) * _M) / np.maximum(_al[..., None], 1e-3), 0, 255); _c[..., 1] = np.minimum(_c[..., 1], _c[..., 2] + 6)
        if os.environ.get("PORTALFADE", "1") == "1": _al = _al * portal_edge_fade(*_al.shape)
        _al[_al < 0.04] = 0
        out.append(Image.fromarray(np.dstack([_c, _al * 255]).astype(np.uint8), "RGBA"))
    return out
if HZFX == "portal":
    PORTAL = _load_portal(os.environ.get("PORTALCLIP", "portal_grab_v1.mp4"))
    if os.environ.get("PORTALDESC"): PORTALDN = _load_portal(os.environ["PORTALDESC"])
CLAWANIM = []   # CLAWANIM=1: the Atlas claw loop (fx/claw_loop_v1.mp4, keyed) instead of the two still poses
if HZFX == "claws" and os.environ.get("CLAWANIM") == "1":
    import glob as _g, tempfile as _tf
    _t2 = _tf.mkdtemp(); subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(ROOT, "art/originals/heroes/siphon/fx/claw_loop_v1.mp4"), os.path.join(_t2, "%04d.png")], check=True)
    for _f in sorted(_g.glob(os.path.join(_t2, "*.png")))[:-1]:
        _a = np.asarray(Image.open(_f).convert("RGB")).astype(np.float32); _M = np.median(_a[:20].reshape(-1, 3), 0)
        _d = _a[..., 1] - np.maximum(_a[..., 0], _a[..., 2]); _dm = _M[1] - max(_M[0], _M[2]); _al = np.clip(1 - (_d - 20) / (_dm * 0.8 - 20), 0, 1)
        _c = np.clip((_a - (1 - _al[..., None]) * _M) / np.maximum(_al[..., None], 1e-3), 0, 255); _c[..., 1] = np.minimum(_c[..., 1], _c[..., 2] + 6); _al[_al < 0.04] = 0
        CLAWANIM.append(Image.fromarray(np.dstack([_c, _al * 255]).astype(np.uint8), "RGBA").crop((140, 290, 640, 990)))
if DARKE or HZFX in ("chains2", "claws"):
    PUFFS = [Image.open(os.path.join(_CUT, "puff_%02d.png" % i)).convert("RGBA") for i in range(16)]
    _es = Image.open(os.path.join(_CUT, "energy_strip.png")).convert("RGBA"); ESTRIP = _es.resize((round(_es.width * 26 / _es.height), 26), Image.LANCZOS)
    for n_ in ("link_face_0", "link_edge_0", "link_face_1", "link_edge_1"): _l = Image.open(os.path.join(_CUT, n_ + ".png")).convert("RGBA"); LINKS[n_] = _l.resize((max(1, round(_l.width * 11 / _l.height)), 11), Image.LANCZOS)
_PR = _rnd.Random(3); PST = []   # live smoke puffs
def _puff(fr, x, y, size, rot, alpha, idx):
    im = PUFFS[idx % 16]; sc = size / max(im.width, im.height); im = im.resize((max(1, round(im.width * sc)), max(1, round(im.height * sc))), Image.LANCZOS).rotate(rot, resample=Image.BICUBIC, expand=True)
    if alpha < 1: im.putalpha(im.getchannel("A").point(lambda v: int(v * alpha)))
    fr.alpha_composite(im, (round(x - im.width / 2), round(y - im.height / 2))) if x - im.width / 2 >= 0 and y - im.height / 2 >= 0 else fr.paste(im, (round(x - im.width / 2), round(y - im.height / 2)), im)
def _stream(fr, t, S, C, fin):   # three energy ribbons: the strip texture scrolled toward him, bent into a travelling wave, tapered at both ends
    L = math.hypot(C[0] - S[0], C[1] - S[1]); Li = max(4, round(L)); ang = math.degrees(math.atan2(C[1] - S[1], C[0] - S[0]))
    for r_ in range(3):
        H = ESTRIP.height; off = int((t * 240 + r_ * 400) % ESTRIP.width); reps = (Li + off) // ESTRIP.width + 2
        tile = Image.new("RGBA", (ESTRIP.width * reps, H)); [tile.paste(ESTRIP, (k * ESTRIP.width, 0)) for k in range(reps)]
        strip = tile.crop((ESTRIP.width * reps - off - Li, 0, ESTRIP.width * reps - off, H))   # scrolls toward +x (toward him)
        amp = 14 + 6 * r_; ph = r_ * 2.1; pad = int(amp) + 4; band = Image.new("RGBA", (Li, H + 2 * pad))
        A = np.asarray(strip).astype(np.float32); out = np.zeros((H + 2 * pad, Li, 4), np.float32)
        for x in range(0, Li, 2):
            u = x / Li; taper = max(0.0, math.sin(math.pi * min(1, u * 1.08))) ** 0.7 * (0.9 - 0.15 * r_); dy = int(pad + amp * math.sin(math.pi * u) * math.sin(u * 5 + ph + t * 3.2))
            col = A[:, x:x + 2, :].copy(); col[..., 3] *= taper * fin * (0.85 if r_ == 0 else 0.55); out[dy:dy + H, x:x + col.shape[1], :] = col
        band = Image.fromarray(out.astype(np.uint8), "RGBA").rotate(-ang, resample=Image.BICUBIC, expand=True)
        cx_, cy_ = (S[0] + C[0]) / 2, (S[1] + C[1]) / 2; fr.alpha_composite(band, (max(0, round(cx_ - band.width / 2)), max(0, round(cy_ - band.height / 2))))
def _claws(fr, t, C, bb, beat, back):   # shadow arms rise out of the ground and grab him; they clench on each heartbeat and sink back at release
    if not bb or t < IMP: return
    rel = t - (IMP + STUN); rise = min(1, (t - IMP - 0.05) / 0.35) if t >= IMP + 0.05 else 0
    if rel > 0: rise = max(0, 1 - rel / 0.4)
    if rise <= 0: return
    ground = FEETY + 2; reach = ground - (C[1] - 4)
    specs = [(-52, -22, 1.08, False, True), (52, 22, 1.08, True, False)]   # (x offset at the ground, tilt deg, size, mirrored, drawn behind him)
    for k_, (xo, tilt, sz, mir, isback) in enumerate(specs):
        if isback != back: continue
        clench = beat > 0.25
        if CLAWANIM:   # play the Atlas grab loop at 1.6x, the two arms half a cycle apart
            im = CLAWANIM[int((t * 24 * 1.6 + k_ * len(CLAWANIM) / 2)) % len(CLAWANIM)]; H = reach * sz * 1.05; sc = H / im.height
        else:
            im = CLAWS["closed" if clench else "open"]; H = reach * sz * (1.08 if clench else 1.0); sc = H / im.height
        im = im.resize((max(1, round(im.width * sc * 0.62)), max(1, round(H))), Image.LANCZOS)   # slimmer arms so he stays visible between them
        if mir: im = im.transpose(Image.FLIP_LEFT_RIGHT)
        sway = 4 * math.sin(t * 2.3 + k_ * 1.7); im = im.rotate(tilt + sway, resample=Image.BICUBIC, expand=True)
        vis = round(im.height * rise); im = im.crop((0, 0, im.width, vis)) if vis > 0 else None   # only the part above the ground shows while it rises
        if im is None: continue
        if k_ == 2: im.putalpha(im.getchannel("A").point(lambda v: int(v * 0.75)))
        x0 = round(C[0] + xo - im.width / 2); y0 = round(ground - vis); fr.alpha_composite(im, (max(0, x0), max(0, y0)))
    if back:
        for k_ in range(3):   # smoke at the roots
            _puff(fr, C[0] - 50 + k_ * 50 + 6 * math.sin(t * 3 + k_), ground - 6, 30, t * 40 + k_ * 90, 0.55 * rise, 3 + k_ * 4)
_PORTAL_AT = {}
def _comp(fr, im, x0, y0):
    if x0 >= 0 and y0 >= 0: fr.alpha_composite(im, (x0, y0))
    else: fr.paste(im, (x0, y0), im)
def _portal(fr, t, C, bb, beat, back):
    if not PORTAL or t < IMP: return
    SPD = 1.5; e = (t - IMP) * 24 * SPD; n = len(PORTAL); fi = min(n - 1, int(e)); rel = t - (IMP + STUN)
    GRABY, PORTY = (float(v) for v in os.environ.get("PORTALY", "420,1085").split(","))   # in the clip: where the fist closes / where the portal lies (768x1152)
    if rel >= 0 and PORTALDN:   # after the stun: he is let go, the fist sinks back into the portal and it closes (behind him), same spot and size
        if not back or not _PORTAL_AT: return
        DS, DC, DK = (float(v) for v in os.environ.get("PORTALDSPD", "4,2,90").split(","))   # sink speed (x real time), closing speed, frame where the fist is gone
        tk = DK / (24 * DS); di = int(rel * 24 * DS) if rel < tk else int(DK + (rel - tk) * 24 * DC)
        if di >= len(PORTALDN): return
        sc, x0, y0 = _PORTAL_AT["v"]; im = PORTALDN[di].resize((round(768 * sc), round(1152 * sc)), Image.LANCZOS)
        a_ = min(1.0, (len(PORTALDN) - 1 - di) / 8)   # last few frames fade (the crack goes away)
        if a_ < 1: im.putalpha(im.getchannel("A").point(lambda v: int(v * a_)))
        _comp(fr, im, x0, y0); return
    a_ = 1.0 if rel < 0 else max(0, 1 - rel / 0.4)
    if a_ <= 0 or C is None: return
    front = fi >= int(os.environ.get("PORTALFRONT", "95"))   # once the fist closes it is drawn over him (grabbing); before that the rising arm is behind him
    if front == back: return
    im = PORTAL[fi]
    sc = (FEETY - C[1]) / (PORTY - GRABY); im = im.resize((round(im.width * sc), round(im.height * sc)), Image.LANCZOS)
    if a_ < 1: im.putalpha(im.getchannel("A").point(lambda v: int(v * a_)))
    x0 = round(C[0] - 384 * sc); y0 = round(FEETY - PORTY * sc); _PORTAL_AT["v"] = (sc, x0, y0)
    _comp(fr, im, x0, y0)
def fx_back(fr, t, C, bb, beat):
    if HZFX == "portal": _portal(fr, t, C, bb, beat, back=True)
    if HZFX == "claws" and C is not None: _claws(fr, t, C, bb, beat, back=True)
    if not (DARKE or HZFX == "chains2") or C is None: return
    S = (FEETX + 40, FEETY - 34); on = IMP <= t < IMP + STUN; fin = (min(1, (t - IMP) / 0.3) * min(1, (IMP + STUN - t) / 0.3)) if on else 0
    if DARKE:
        if on:
            for _ in range(1): PST.append({"u": 0, "spd": _PR.uniform(0.9, 1.4), "lat": _PR.uniform(-1, 1), "ph": _PR.uniform(0, 6.3), "sz": _PR.uniform(16, 30), "rot": _PR.uniform(0, 360), "vr": _PR.uniform(-90, 90), "idx": _PR.randrange(16), "orb": None})
        if fin > 0: _stream(fr, t, S, C, fin)
        for q in PST:   # travel along the stream, then orbit round him for a while
            if q["orb"] is None:
                q["u"] += q["spd"] / FPS
                if q["u"] >= 1: q["orb"] = {"a": _PR.uniform(0, 6.3), "life": 0, "max": _PR.uniform(0.6, 1.2)}
            else: q["orb"]["life"] += 1 / FPS; q["orb"]["a"] += 4.5 / FPS
            q["rot"] += q["vr"] / FPS
        PST[:] = [q for q in PST if q["orb"] is None or q["orb"]["life"] < q["orb"]["max"]]
        rr = max(14, (bb[2] - bb[0]) * 0.55) if bb else 20
        for q in PST:
            if q["orb"] is None:
                u = q["u"]; L = math.hypot(C[0] - S[0], C[1] - S[1]); ux, uy = (C[0] - S[0]) / L, (C[1] - S[1]) / L; w_ = 22 * q["lat"] * math.sin(math.pi * u) * math.sin(u * 4 + q["ph"] + t * 2)
                _puff(fr, S[0] + ux * L * u - uy * w_, S[1] + uy * L * u + ux * w_, q["sz"] * (0.6 + 0.6 * u), q["rot"], 0.6 * min(1, u * 4), q["idx"])
            elif math.sin(q["orb"]["a"]) < 0:   # far side of the swirl: behind him
                k_ = q["orb"]["life"] / q["orb"]["max"]; _puff(fr, C[0] + math.cos(q["orb"]["a"]) * rr, C[1] + math.sin(q["orb"]["a"]) * rr * 0.35 - 6 * k_, q["sz"] * 0.9, q["rot"], 0.7 * (1 - k_), q["idx"])
    if HZFX == "chains2": _chains(fr, t, C, bb, beat, back=True)
def fx_front(fr, t, C, bb, beat):
    if HZFX == "portal": _portal(fr, t, C, bb, beat, back=False)
    if HZFX == "claws" and C is not None: _claws(fr, t, C, bb, beat, back=False)
    if not (DARKE or HZFX == "chains2") or C is None: return
    if DARKE:
        rr = max(14, (bb[2] - bb[0]) * 0.55) if bb else 20
        for q in PST:
            if q["orb"] is not None and math.sin(q["orb"]["a"]) >= 0:
                k_ = q["orb"]["life"] / q["orb"]["max"]; _puff(fr, C[0] + math.cos(q["orb"]["a"]) * rr, C[1] + math.sin(q["orb"]["a"]) * rr * 0.35 - 6 * k_, q["sz"] * 0.9, q["rot"], 0.7 * (1 - k_), q["idx"])
    if HZFX == "chains2": _chains(fr, t, C, bb, beat, back=False)
def _chains(fr, t, C, bb, beat, back):   # a chain spiralling round him: links on the far side draw behind him, near side in front
    if not bb or t < IMP: return
    rel = t - (IMP + STUN)
    if rel > 0.7: return
    top, bot = C[1] - (bb[3] - bb[1]) * 0.36, C[1] + (bb[3] - bb[1]) * 0.36; R0 = (bb[2] - bb[0]) * 0.5 + 4
    turns = 2.2; N = 58; grow = min(1, (t - IMP) / 0.55); spin = t * 1.6
    for i in range(N):
        s_ = i / (N - 1)
        if s_ > grow: break
        th = s_ * turns * 2 * math.pi + spin; R = R0 * (1 - 0.16 * beat); depth = math.sin(th)
        x = C[0] + R * math.cos(th); y = bot + (top - bot) * s_ + 0.32 * R * depth   # seen slightly from above: each loop is a flat ellipse, near side lower
        if (depth < 0) != back: continue
        if rel > 0:   # snapped: links fly outward and drop
            k_ = rel / 0.7; x += math.cos(th) * 90 * k_; y += -40 * k_ + 260 * k_ * k_
        im = LINKS["link_face_%d" % (i // 2 % 2)] if i % 2 == 0 else LINKS["link_edge_%d" % (i // 2 % 2)]
        dth = turns * 2 * math.pi; dx = -R * math.sin(th) * dth; dy = (top - bot) + 0.32 * R * math.cos(th) * dth; ang = math.degrees(math.atan2(dy, dx))   # follow the spiral's direction
        sc = 1 + 0.2 * depth; im = im.resize((max(1, round(im.width * sc)), max(1, round(im.height * sc))), Image.LANCZOS).rotate(-ang + 90, resample=Image.BICUBIC, expand=True)
        a_ = (0.6 if depth < 0 else 1.0) * (1 - max(0, rel) / 0.7)
        if beat > 0.2: im = Image.alpha_composite(im, tint(im, (255, 60, 70), 0.35 * beat))
        if a_ < 1: im.putalpha(im.getchannel("A").point(lambda v: int(v * a_)))
        fr.alpha_composite(im, (max(0, round(x - im.width / 2)), max(0, round(y - im.height / 2))))
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
FEETX, FEETY = 330, int(os.environ.get("FEETY", "333"))   # 333 = measured feet line in a real Conquest frame (v1734, canvas px - 380); was 318 (15 px too high)
K = 2 * 71.82 / CH; KI = 2 * IDH / ICH
FPS = 30; PRE, POST = 0.6, 0.8; TOT = PRE + N / FPS_S + POST; IMP = PRE + 28 / FPS_S
BEATS = [IMP, IMP + 0.22, IMP + 1.0, IMP + 1.22]; BEAT_LEN = 0.45
HZ_X = 600; HZ_FREEZE_F = 20; HZ_T0 = IMP - HZ_FREEZE_F / 24; STUN = 4.0
if HZ: TOT = max(TOT, IMP + STUN + (52 - HZ_FREEZE_F) / 24 + 0.6)
if PORTALDN: TOT = max(TOT, IMP + STUN + len(PORTALDN) / 36 + 0.3)
import math, random
random.seed(5)
FB_DUR = 0.75; GROUPS = [IMP + 0.55, IMP + 1.45, IMP + 2.35]   # three braided groups while he hangs there
FBS = [{"t0": g + k * 0.03, "ph": k * 2 * math.pi / 3, "fi": (k * 17 + gi * 5) % 120} for gi, g in enumerate(GROUPS) for k in range(3)]
HZ_C = [None]
HZ_BEATS = [IMP + 0.45 + n * 0.95 + d for n in range(4) for d in (0, 0.22)]   # thump-thump pairs through the 4 s stun
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
        hx = round(HZ_X - (him.width - hax) * hk); hy = round(FEETY - 2 * hl - hay * hk)
        if HZTREM and IMP <= t < IMP + STUN:
            kick = max([0] + [(1 - (t - b) / 0.3) for b in HZ_BEATS if 0 <= t - b < 0.3]); hx += round((0.8 + 2.4 * kick) * math.sin(t * 95)); hy += round(0.6 * kick * math.sin(t * 77))
        _bb = hs.getchannel("A").getbbox(); HZ_C[0] = (hx + (_bb[0] + _bb[2]) / 2, hy + (_bb[1] + _bb[3]) / 2) if _bb else None;
        if HZECHO and _bb:
            for b in HZ_BEATS:
                pp = (t - b) / BEAT_LEN
                for j in range(3):
                    qq = pp - j * 0.18
                    if 0 <= qq < 1:
                        sc_ = 1 + 0.8 * qq; gimg = tint(hs, GCOL, 0.7 * (1 - qq) ** 1.3).resize((round(hs.width * sc_), round(hs.height * sc_)), Image.LANCZOS); ccx, ccy = HZ_C[0]
                        gx, gy = round(ccx + (hx - ccx) * sc_), round(ccy + (hy - ccy) * sc_); fr.paste(gimg, (gx, gy), gimg) if gx < 0 or gy < 0 else fr.alpha_composite(gimg, (gx, gy))
        if HZTINT and IMP <= t < IMP + STUN:
            fin = min(1, (t - IMP) / 0.15) * min(1, (IMP + STUN - t) / 0.2)   # fades in fast, fades out as the stun breaks
            rgb = hs.convert("RGB"); rgb = ImageEnhance.Color(rgb).enhance(1 - 0.75 * fin); rgb = ImageEnhance.Brightness(rgb).enhance(1 - 0.45 * fin)
            hs2 = rgb.convert("RGBA"); hs2.putalpha(hs.getchannel("A"))
            fl = 0
            for b in HZ_BEATS:
                pp = (t - b) / 0.3
                if 0 <= pp < 1: fl = max(fl, (1 - pp) ** 1.5)
            if fl > 0: hs2 = Image.alpha_composite(hs2, tint(hs, GCOL, 0.65 * fl))
            hs = hs2
        _beat = max([0] + [(1 - (t - b) / 0.35) for b in HZ_BEATS if 0 <= t - b < 0.35]); _bbw = (hx + _bb[0], hy + _bb[1], hx + _bb[2], hy + _bb[3]) if _bb else None
        fx_back(fr, t, HZ_C[0], _bbw, _beat)
        fr.alpha_composite(hs, (hx, max(0, hy))) if hy >= 0 else fr.paste(hs, (hx, hy), hs)
        fx_front(fr, t, HZ_C[0], _bbw, _beat)
        if _bb and HZ_C[0]:
            ccx, ccy = HZ_C[0]; ov = Image.new("RGBA", fr.size, (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
            beat = max([0] + [(1 - (t - b) / 0.35) for b in HZ_BEATS if 0 <= t - b < 0.35])
            if HZTHREAD and IMP <= t < IMP + STUN:
                sx, sy = FEETX + 40, FEETY - 34; fin = min(1, (t - IMP) / 0.25) * min(1, (IMP + STUN - t) / 0.2)
                pts = [(sx + (ccx - sx) * u + 6 * math.sin(u * 9 + t * 6) * math.sin(math.pi * u), sy + (ccy - sy) * u + 6 * math.sin(u * 7 - t * 5) * math.sin(math.pi * u)) for u in [i / 30 for i in range(31)]]
                od.line(pts, fill=(225, 25, 45, int((90 + 140 * beat) * fin)), width=3 if beat > 0.3 else 2); od.line(pts, fill=(255, 190, 195, int((40 + 120 * beat) * fin)), width=1)
            if HZBURST:
                e = t - (IMP + STUN)
                if 0 <= e < 0.55:
                    q = e / 0.55; sc_ = 1 + 1.4 * q; g = tint(hs, GCOL, 0.9 * (1 - q) ** 1.2).resize((round(hs.width * sc_), round(hs.height * sc_)), Image.LANCZOS)
                    ov.alpha_composite(g, (max(0, round(ccx + (hx - ccx) * sc_)), max(0, round(ccy + (hy - ccy) * sc_)))); R = 10 + 70 * q
                    od.ellipse((ccx - R, ccy - R, ccx + R, ccy + R), outline=(255, 70, 85, int(220 * (1 - q))), width=max(1, round(4 * (1 - q))))
            nb = sum(1 for b in HZ_BEATS[0::2] if t >= b)   # how many heartbeat pairs so far
            if HZFX == "cracks" and IMP + 0.3 <= t < IMP + STUN:
                for (x1, y1, x2, y2, bi, dp) in CRACKS:
                    if bi < nb:
                        w_ = max(1, 3 - dp // 2); od.line((ccx + x1, ccy + y1, ccx + x2, ccy + y2), fill=(20, 0, 4, 200), width=w_ + 2); od.line((ccx + x1, ccy + y1, ccx + x2, ccy + y2), fill=(255, 40 + int(120 * beat), 60 + int(100 * beat), 240), width=w_)
            if HZFX == "cracks" and IMP + STUN <= t < IMP + STUN + 0.6:   # shatter
                q = (t - IMP - STUN) / 0.6
                for (a, sp, sz) in SHARDS:
                    x0 = ccx + math.cos(a) * sp * q; y0 = ccy + math.sin(a) * sp * q + 120 * q * q; rr = sz * (1 - q * 0.5)
                    od.polygon([(x0 + rr * math.cos(a + 2.1 * j + q * 6), y0 + rr * math.sin(a + 2.1 * j + q * 6)) for j in range(3)], fill=(235, 30, 50, int(230 * (1 - q))))
            if HZFX == "chains" and IMP <= t < IMP + STUN + 0.7:
                for side in (-1, 1):
                    ax_, ay_ = ccx + side * 70, FEETY - 2; ex, ey = ccx + side * 6, ccy + 4
                    grow_ = min(1, (t - IMP) / 0.25); sag = (26 - 10 * beat) if t < IMP + STUN else 26 + 300 * (t - IMP - STUN) ** 2
                    nlinks = 15
                    for i in range(int(nlinks * grow_)):
                        u = i / nlinks; x_ = ax_ + (ex - ax_) * u; y_ = ay_ + (ey - ay_) * u + sag * math.sin(math.pi * u) * (1 if t < IMP + STUN else 1)
                        if t >= IMP + STUN and i > nlinks * 0.5: continue   # snapped: the top half is gone
                        lw, lh = (6, 3.6) if i % 2 == 0 else (3, 5.5)
                        od.ellipse((x_ - lw, y_ - lh, x_ + lw, y_ + lh), outline=(30, 26, 30, 255), width=3); od.ellipse((x_ - lw, y_ - lh, x_ + lw, y_ + lh), outline=(220 + int(35 * beat), 40, 55, 180 + int(70 * beat)), width=1)
                    if t < IMP + STUN: od.ellipse((ex - 9, ey - 6, ex + 9, ey + 6), outline=(225, 30, 50, 150 + int(100 * beat)), width=2)
            if HZFX == "slash":
                for n_, b in enumerate(HZ_BEATS[0::2]):
                    e = t - b
                    if 0 <= e < 0.45:
                        sweep = min(1, e / 0.1); fade = 1 if e < 0.1 else max(0, 1 - (e - 0.1) / 0.35); dirn = 1 if n_ % 2 == 0 else -1
                        R1, R2 = 46, 38; a0 = math.radians(-150 if dirn > 0 else -30); a1 = a0 + dirn * math.radians(120) * sweep; rot = math.radians(-18 * dirn)
                        def P(a, R): xx, yy = math.cos(a) * R, math.sin(a) * R * 0.55; return (ccx + xx * math.cos(rot) - yy * math.sin(rot), ccy + 4 + xx * math.sin(rot) + yy * math.cos(rot))
                        steps = 24; outer = [P(a0 + (a1 - a0) * i / steps, R1 + 6 * math.sin(math.pi * i / steps)) for i in range(steps + 1)]; inner = [P(a0 + (a1 - a0) * i / steps, R2) for i in range(steps, -1, -1)]
                        od.polygon(outer + inner, fill=(225, 25, 45, int(230 * fade))); od.line(outer, fill=(255, 220, 225, int(240 * fade)), width=2)
            if HZEYE and IMP <= t < IMP + STUN + 0.25:
                o = min(1, (t - IMP) / 0.2) if t < IMP + STUN else max(0, 1 - (t - IMP - STUN) / 0.15)   # opens, then blinks shut at release
                sc_ = 1 + 0.18 * beat; ew, eh = round(EYEIMG.width * sc_), max(1, round(EYEIMG.height * sc_ * o))
                if eh > 1: ei = EYEIMG.resize((ew, eh), Image.LANCZOS); top = hy + (_bb[1]) - 12 - eh; ov.alpha_composite(ei, (round(ccx - ew / 2), max(0, round(top + EYEIMG.height * (1 - o) / 2))))
            fr.alpha_composite(ov)
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
            for wq in q.get("wisps", []): wq["age"] += 1 / FPS; wq["x"] -= math.cos(wq["ang"]) * 0; wq["y"] -= 9 / FPS
            u = (t - q["t0"]) / FB_DUR
            if 0 <= u <= 1:
                amp = BRAID * math.sin(math.pi * u); w = q["ph"] + u * 2 * math.pi * 1.6   # braid: same helix, phases 120 deg apart, wraps 1.6 turns, tight at both ends
                off = amp * math.sin(w); x = src[0] + ux * L * u + nx * off; y = src[1] + uy * L * u + ny * off
                du = 0.01; amp2 = BRAID * math.sin(math.pi * min(1, u + du)); off2 = amp2 * math.sin(q["ph"] + min(1, u + du) * 2 * math.pi * 1.6)
                x2 = src[0] + ux * L * min(1, u + du) + nx * off2; y2 = src[1] + uy * L * min(1, u + du) + ny * off2
                depth = math.cos(w)   # the strand 'behind' is a touch smaller / dimmer so they read as twisting round each other
                if CODEFB:
                    a_ = math.atan2(y2 - y, x2 - x); W_ = q.setdefault("wisps", [])
                    for _ in range(1): W_.append({"x": x + random.uniform(-2, 2), "y": y + random.uniform(-2, 2), "ang": a_ + random.uniform(-0.5, 0.5), "L": random.uniform(7, 12), "w": random.uniform(3, 4.6), "age": 0, "max": random.uniform(0.18, 0.32)})
                    code_fireball(fr, x, y, a_, t, q["fi"], [wq for wq in W_ if wq["age"] < wq["max"]], 1 + 0.15 * depth)
                else:
                    im2 = FBF[(q["fi"] + int(t * 24)) % len(FBF)].rotate(math.degrees(math.atan2(-(y2 - y), x2 - x)), resample=Image.BICUBIC, expand=True)
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
