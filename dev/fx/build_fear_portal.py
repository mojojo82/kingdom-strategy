"""Baelgor Fear portal for the game (v1735): key the two Atlas clips (portal_grab_v2 = portal opens, hand rises and grabs; portal_descend_v1 up to
the small ring = the fist sinks back and it closes - the crack after it is left out, Harley 19 Nov), fade the ground smoke at the clip's sides
(same as the approved mockup), crop, scale and pack every 2nd frame into one sheet per clip.
Run: python3 dev/fx/build_fear_portal.py  -> art/heroes/siphon/fear_portal_grab_v1.webp, fear_portal_desc_v1.webp + prints the FEAR_PORTAL values."""
import glob, json, math, os, subprocess, tempfile
import numpy as np
from PIL import Image
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
FX = os.path.join(ROOT, "art/originals/heroes/siphon/fx"); OUT = os.path.join(ROOT, "art/heroes/siphon")
X0, Y0, X1, Y1 = 24, 120, 744, 1110; K = 0.3; STEP = 2
def edge_fade(h, w, top=740, bot=820, x0=24, x1=110):
    sm = lambda e0, e1, v: (lambda u: u * u * (3 - 2 * u))(np.clip((v - e0) / (e1 - e0), 0, 1))
    xs = np.arange(w, dtype=np.float32); side = sm(x0, x1, np.minimum(xs, w - 1 - xs)); band = sm(top, bot, np.arange(h, dtype=np.float32))[:, None]
    return 1 - band * (1 - side[None, :])
def keyed(clip, lim):
    t = tempfile.mkdtemp(); subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(FX, clip), os.path.join(t, "%04d.png")], check=True)
    out = []; F = None; M = np.array([11.0, 230.0, 10.0])
    for f in sorted(glob.glob(os.path.join(t, "*.png")))[:lim]:
        a = np.asarray(Image.open(f).convert("RGB")).astype(np.float32)
        d = a[..., 1] - np.maximum(a[..., 0], a[..., 2]); al = np.clip(1 - (d - 20) / 160, 0, 1)
        c = np.clip((a - (1 - al[..., None]) * M) / np.maximum(al[..., None], 1e-3), 0, 255); c[..., 1] = np.minimum(c[..., 1], c[..., 2] + 6)
        if F is None: F = edge_fade(*al.shape)
        al = al * F; al[al < 0.04] = 0
        out.append(Image.fromarray(np.dstack([c, al * 255]).astype(np.uint8), "RGBA").crop((X0, Y0, X1, Y1)))
    return out
CW, CH = round((X1 - X0) * K), round((Y1 - Y0) * K)
def pack(frames, name):
    fr = frames[::STEP]; n = len(fr); cols = min(n, 4096 // CW); rows = math.ceil(n / cols)
    sh = Image.new("RGBA", (cols * CW, rows * CH), (0, 0, 0, 0))
    for i, im in enumerate(fr): sh.paste(im.resize((CW, CH), Image.LANCZOS), ((i % cols) * CW, (i // cols) * CH))
    p = os.path.join(OUT, name); sh.save(p, "WEBP", quality=82, method=6); print(p, sh.size, n, "frames", os.path.getsize(p) // 1024, "KB"); return n, cols
ng, cg = pack(keyed("portal_grab_v2.mp4", 999), "fear_portal_grab_v1.webp")
nd, cd = pack(keyed("portal_descend_v1.mp4", 103), "fear_portal_desc_v1.webp")
cx = lambda x: round((x - X0) * K, 2); cy = lambda y: round((y - Y0) * K, 2)
print(json.dumps({"cw": CW, "ch": CH, "step": STEP, "grab": {"n": ng, "cols": cg}, "desc": {"n": nd, "cols": cd}, "ringX": cx(380), "ringY": cy(947), "grabY": cy(500), "portY": cy(975), "frontAt": 108, "ringR": round(255 * K, 2)}))
