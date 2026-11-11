"""Hero card video (HERO_CARD_VIDEO) from an H3 Max clip on flat magenta - Harley's card standard (10 Nov 2026): the hero moves into a
heroic pose, then the later part loops (intro once, then loopStart, like Iron Lily).
Steps: key the magenta (per-frame median of the top rows), bake the rarity gradient in, crop to the 5:4 card box, and make the loop seamless by
cross-fading the last BLEND frames into the frames right after the loop point. Writes an mp4 with a keyframe at loopStart and prints the
HERO_CARD_VIDEO entry values.
Run: python3 dev/heroes/build_card_video.py CLIP.mp4 OUT.mp4 LOOP_START_SEC [BLEND_FRAMES=24] [OUT_W=800] [ZOOM=1] [CX]
ZOOM > 1 crops tighter, anchored at the bottom centre (the hero's body is cut at the bottom edge) - check the top of the clip stays clear."""
import glob, os, subprocess, sys, tempfile
import numpy as np
from PIL import Image
src, out, LS = sys.argv[1], sys.argv[2], float(sys.argv[3])
BLEND = int(sys.argv[4]) if len(sys.argv) > 4 else 24
OW = int(sys.argv[5]) if len(sys.argv) > 5 else 800
ZOOM = float(sys.argv[6]) if len(sys.argv) > 6 else 1.0
CX = float(sys.argv[7]) if len(sys.argv) > 7 else None   # optional crop centre x (video px), e.g. the held pose's centre
TOP, BOT = (np.array([242, 182, 50.]), np.array([217, 144, 42.])) if os.environ.get("RARITY") == "Legendary" else (np.array([79, 143, 217.]), np.array([47, 95, 163.])) if os.environ.get("RARITY") == "Rare" else (np.array([155, 89, 214.]), np.array([106, 53, 168.]))   # RARITY=Rare: blue (#4f8fd9 -> #2f5fa3, v1499 Pip); default Epic purple, same as HERO_CARD_VIDEO.gareth bg (#9b59d6 -> #6a35a8)
tmp = tempfile.mkdtemp(); subprocess.run(["ffmpeg", "-v", "error", "-i", src, os.path.join(tmp, "f%04d.png")], check=True)
fs = sorted(glob.glob(os.path.join(tmp, "f*.png"))); FPS = 24
fr = []
for f in fs:
    a = np.asarray(Image.open(f).convert("RGB")).astype(np.float32); H, W = a.shape[:2]
    M = np.median(a[:30].reshape(-1, 3), 0); d, dm = ((a[..., 1] - np.maximum(a[..., 0], a[..., 2]), M[1] - max(M[0], M[2])) if os.environ.get("BG") == "green" else (np.minimum(a[..., 0], a[..., 2]) - a[..., 1], min(M[0], M[2]) - M[1]))  # v1508: BG=green for green-screen clips
    al = np.clip(1 - (d - 30) / (dm * 0.8 - 30), 0, 1)[..., None]
    c = np.clip((a - (1 - al) * M) / np.maximum(al, 1e-3), 0, 255)
    g = np.linspace(0, 1, H)[:, None, None]; bg = (TOP * (1 - g) + BOT * g) * np.ones((H, W, 3))
    o = c * al + bg * (1 - al)
    ch = round(H / ZOOM); cw = round(ch * 5 / 4); x0 = (W - cw) // 2 if CX is None else int(min(W - cw, max(0, CX - cw / 2)))
    fr.append(o[H - ch:, x0:x0 + cw])
L = round(LS * FPS); n = len(fr)
assert L + BLEND < n - BLEND, "loop too short"
for k in range(BLEND):   # last BLEND frames fade into frames L-BLEND+k .. so the jump end -> L is seamless
    t = (k + 1) / (BLEND + 1); i = n - BLEND + k; fr[i] = fr[i] * (1 - t) + fr[L - BLEND + k + 1] * t if L - BLEND + k + 1 >= 0 else fr[i]
od = tempfile.mkdtemp(); OH = round(OW * 4 / 5 / 2) * 2
for i, o in enumerate(fr): Image.fromarray(o.astype(np.uint8)).resize((OW, OH), Image.LANCZOS).save(os.path.join(od, "o%04d.png" % i))
subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", str(FPS), "-i", os.path.join(od, "o%04d.png"), "-c:v", "libx264", "-preset", "veryfast", "-crf", "24",
                "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-force_key_frames", "0,%.4f" % (L / FPS), "-an", out], check=True)
print("frames", n, "loopStart", L / FPS, "size KB", os.path.getsize(out) // 1024, "out", OW, "x", OH)
