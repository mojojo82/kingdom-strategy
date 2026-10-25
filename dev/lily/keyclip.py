"""Key any Iron Lily clip into the shared 2K working space (v1430). Videos come in 2K or HD and from the 40% or 55% start frame, so every frame is
resized to 2560x1440 and, for a 55% clip, scaled about her feet point (x centre, floor y) so she stands the same ~573 px as the first clips.
Writes big<N>/NNNN.png (keyed, cropped) + bigmeta.json offsets, and f<N>/NNNN.npy (853x480 RGBA) for pose matching.
Run in the working folder: python3 keyclip.py VIDEO N SCALE   (SCALE 1 for 40% clips, 0.4/0.55 = 0.727 for 55% clips)"""
import numpy as np, cv2, json, subprocess, sys, os
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from keyfn import key4
src, n, s = sys.argv[1], sys.argv[2], float(sys.argv[3])
W, H, FLOOR = 2560, 1440, 1354
big, sm = 'big' + n, 'f' + n; os.makedirs(big, exist_ok=True); os.makedirs(sm, exist_ok=True)
w0, h0 = [int(v) for v in subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', src], capture_output=True, text=True).stdout.split(',')]
p = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', src, '-vf', 'scale=%d:%d:flags=lanczos' % (W, H), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
meta = json.load(open('bigmeta.json')) if os.path.exists('bigmeta.json') else {}
k = 0
while True:
    buf = p.stdout.read(W * H * 3)
    if len(buf) < W * H * 3: break
    rgb = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
    if abs(s - 1) > 1e-3:  # scale about (centre x, floor y): the floor stays where it is
        M = np.float32([[s, 0, (1 - s) * W / 2], [0, s, (1 - s) * FLOOR]])
        rgb = cv2.warpAffine(rgb, M, (W, H), flags=cv2.INTER_AREA, borderMode=cv2.BORDER_CONSTANT, borderValue=(4, 250, 0))
    c, al = key4(rgb)
    m = (al > 0.5).astype(np.uint8); nn, lab, st, _ = cv2.connectedComponentsWithStats(m)
    if nn > 1:
        bg = 1 + np.argmax(st[1:, 4]); keep = np.zeros_like(m)
        for i in range(1, nn):
            if st[i, 4] >= max(200, st[bg, 4] * 0.03): keep |= (lab == i)
        al = al * cv2.dilate(keep, np.ones((9, 9), np.uint8))
    A = (al * 255).astype(np.uint8); rgba = np.dstack([c, A]); ys, xs = np.where(A > 8)
    x0, y0, x1, y1 = max(xs.min() - 4, 0), max(ys.min() - 4, 0), min(xs.max() + 5, W), min(ys.max() + 5, H)
    Image.fromarray(rgba[y0:y1, x0:x1], 'RGBA').save('%s/%04d.png' % (big, k), compress_level=3); meta['%s/%04d.png' % (big, k)] = [int(x0), int(y0)]
    np.save('%s/%04d.npy' % (sm, k), cv2.resize(rgba, (853, 480), interpolation=cv2.INTER_AREA)); k += 1
json.dump(meta, open('bigmeta.json', 'w')); print(src, 'from', w0, 'x', h0, '->', k, 'frames, scale', s)
