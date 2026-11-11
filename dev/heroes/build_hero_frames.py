"""New-hero animation frames (Harley, 10 Nov 2026 workflow; first hero: Juno Rivet).
Keys MiniMax H3 Max clips (flat magenta background) and writes, per clip:
  - the LARGE keep-set: every keyed frame at full video size (WebP q90) in art/originals/heroes/<hero>/large/<clip>/
  - (only with --sheets) an old-style game copy: cropped frames in WebP sheets + manifest. NOT used: the game copy is made by
    build_hero_anim.py (HERO_ANIMS grid sheet) from the LARGE set.
Key: alpha from min(r,b)-g against the per-frame magenta (median of the top 40 rows), magenta un-mixed; semi-transparent
pixels that aren't fire (smoke) and pink-tinted low-saturation pixels go grey. Optional soft edge fade (right / top px) for
a clip whose effect touched the frame edge (Juno attack v1 only - Harley 10 Nov: keep the WHOLE animation in frame next time).
Run: python3 dev/heroes/build_hero_frames.py juno [STAND=96]"""
import glob, json, os, subprocess, sys, tempfile
import numpy as np, cv2
from PIL import Image
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
SHEETS = "--sheets" in sys.argv; sys.argv = [a for a in sys.argv if a != "--sheets"]
HERO = sys.argv[1]; STAND = float(sys.argv[2]) if len(sys.argv) > 2 else 96
CFG = {"juno": {"clips": {"idle": ("juno_idle_h3max_768_5s_v1.mp4", 0, 0), "attack": ("juno_attack_h3max_768_5s_v1.mp4", 170, 90)},
                "stand_src": 580, "feet_y": 681},
       # v1480 Bram (melee): the attack clip came from a smaller start frame, so every clip is measured on its own (meta.json, see below)
       "bram": {"clips": {"idle": ("bram_idle_h3max_768_5s_v1.mp4", 0, 0), "run": ("bram_run_h3max_768_5s_v1.mp4", 0, 0), "attack": ("bram_attack_h3max_768_5s_v3.mp4", 0, 0)},
                "stand_src": 427, "feet_y": 679},
       # v1499 Pip (ranged, on the fortress deck): idle v1; attack v3 (H3 Max adds a muzzle flash + smoke at video frames 42-57 whatever the prompt says -
       # build_hero_anim.py skips those frames and the game draws its own flare round)
       "pip": {"clips": {"idle": ("pip_idle_h3max_768_5s_v1.mp4", 0, 0), "attack": ("pip_attack_h3max_768_5s_v3.mp4", 0, 0)},
                "stand_src": 561, "feet_y": 725},
       # v1502 Hanzo (melee, icy recolour): idle v1 + run v1 (big start frame), attack v2 + attack2 v2 (smaller attack start frame), skill v2 (small skill start frame)
       "hanzo": {"clips": {"idle": ("hanzo_idle_h3max_768_5s_v1.mp4", 0, 0), "run": ("hanzo_run_h3max_768_5s_v1.mp4", 0, 0), "attack": ("hanzo_attack1_h3max_768_5s_v2.mp4", 0, 0),
                           "attack2": ("hanzo_attack2_h3max_768_5s_v2.mp4", 0, 0), "skill": ("hanzo_skill_h3max_768_5s_v2.mp4", 0, 0)},
                 "stand_src": 400, "feet_y": 655}}[HERO]
META = {}   # per clip, measured on its first frame (= the start frame): body height (rows wider than 12 px - thin steam wisps don't count), feet line, feet centre
HD = os.path.join(ROOT, "art/originals/heroes", HERO); OUT = os.path.join(ROOT, "art/heroes", HERO)
os.makedirs(OUT, exist_ok=True)
def ss(t): t = np.clip(t, 0, 1); return t * t * (3 - 2 * t)
def key(a, FR, FT):
    a = a.astype(np.float32); M = np.median(a[:40].reshape(-1, 3), 0)
    d = np.minimum(a[..., 0], a[..., 2]) - a[..., 1]; dm = min(M[0], M[2]) - M[1]
    al = np.clip(1 - (d - 25) / (dm * 0.85 - 25), 0, 1)
    c = np.clip((a - (1 - al[..., None]) * M) / np.maximum(al[..., None], 1e-3), 0, 255)
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    fire = (r > 190) & (g > 110) & (r - b > 70)
    mx, mn = c.max(-1), c.min(-1); sat = (mx - mn) / (mx + 1)
    grey = ((al < 0.92) & ~fire) | ((r > g + 10) & (b > g) & (sat < 0.7) & ~fire)
    gv = np.clip(g * 0.9 + r * 0.1, 0, 255); c[grey] = np.stack([gv, gv * 0.98, gv * 0.95], -1)[grey]
    al[al < 0.03] = 0
    h, w = al.shape
    if FR: al *= ss((w - 1 - np.arange(w)) / FR)[None, :]
    if FT: al *= ss(np.arange(h) / FT)[:, None]
    return np.dstack([c, al * 255]).astype(np.uint8)
k = STAND / CFG["stand_src"]; SHEET, PAD = 2048, 2
man = {"hero": HERO, "fps": 24, "stand": STAND, "clips": {}}
sheets, cur = [], None; x = y = rowh = 0
def new_sheet():
    global cur, x, y, rowh
    cur = Image.new("RGBA", (SHEET, SHEET), (0, 0, 0, 0)); sheets.append([cur, 0]); x = y = rowh = 0
new_sheet()
feet_x = None
for clip, (fn, FR, FT) in CFG["clips"].items():
    tmp = tempfile.mkdtemp()
    subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(HD, "clips", fn), os.path.join(tmp, "%04d.png")], check=True)
    large = os.path.join(HD, "large", clip); os.makedirs(large, exist_ok=True)
    frames = []
    for i, f in enumerate(sorted(glob.glob(os.path.join(tmp, "*.png")))):
        im = Image.fromarray(key(np.asarray(Image.open(f).convert("RGB")), FR, FT), "RGBA")
        if i == 0:
            A = np.asarray(im.getchannel("A")) > 128; rows = np.nonzero(A.sum(1) > 12)[0]; fy = int(rows.max())
            xs0 = np.nonzero(A[fy - 30:fy].any(0))[0]; META[clip] = {"stand": int(rows.max() - rows.min()), "feet_y": fy, "feet_x": float((xs0.min() + xs0.max()) / 2)}
        if feet_x is None:   # body centre at the feet line in the very first frame (the start frame)
            al = np.asarray(im.getchannel("A"))[CFG["feet_y"] - 40:CFG["feet_y"]] > 128; xs = np.nonzero(al.any(0))[0]; feet_x = (xs.min() + xs.max()) / 2
        im.save(os.path.join(large, "%04d.webp" % i), "WEBP", quality=90, method=4)
        bb = im.getchannel("A").point(lambda v: 255 if v > 6 else 0).getbbox()
        if not bb: frames.append(None); continue
        sm = im.crop(bb); w, h = max(1, round(sm.width * k)), max(1, round(sm.height * k)); sm = sm.resize((w, h), Image.LANCZOS)
        if x + w > SHEET: x = 0; y += rowh + PAD; rowh = 0
        if y + h > SHEET: sheets[-1][1] = max(sheets[-1][1], y); new_sheet()
        cur.paste(sm, (x, y))
        # [sheet, sx, sy, w, h, dx, dy]: draw at (feetX + dx, feetY + dy) in sheet px, facing right
        frames.append([len(sheets) - 1, x, y, w, h, round((bb[0] - feet_x) * k, 2), round((bb[1] - CFG["feet_y"]) * k, 2)])
        x += w + PAD; rowh = max(rowh, h); sheets[-1][1] = max(sheets[-1][1], y + rowh)
    man["clips"][clip] = frames; print(clip, len(frames), "frames", META.get(clip))
    json.dump(META, open(os.path.join(HD, "large", "meta.json"), "w"), indent=1)
if not SHEETS: sys.exit(0)
files = []
for i, (sh, uh) in enumerate(sheets):
    fn = "%s_s%d.webp" % (HERO, i); sh.crop((0, 0, SHEET, min(SHEET, uh + PAD))).save(os.path.join(OUT, fn), "WEBP", quality=85, method=6); files.append(fn)
man["sheets"] = files
json.dump(man, open(os.path.join(OUT, HERO + "_frames.json"), "w"), separators=(",", ":"))
print("sheets", files, "total KB", sum(os.path.getsize(os.path.join(OUT, f)) for f in files) // 1024)
