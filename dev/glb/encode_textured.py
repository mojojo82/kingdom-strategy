# Textured march model -> game files: art/models/<name>.json { c, h, p (int16 xyz per corner, b64), uv (uint16 per corner, b64), n } + <name>.webp
# python3 dev/glb/encode_textured.py IN.npz IN_tex.png NAME
import numpy as np, json, base64, sys, os
from PIL import Image
d = np.load(sys.argv[1]); P = d['pos'].astype(np.float64); UV = d['uv']; name = sys.argv[3]; O = '/home/claude/kingdom-strategy/art/models/'; os.makedirs(O, exist_ok=True)
lo, hi = P.min(0), P.max(0); c = (lo + hi) / 2; h = (hi - lo) / 2
q = np.round((P - c) / h * 32767).astype(np.int16); uvq = np.round(np.clip(UV, 0, 1) * 65535).astype(np.uint16)
json.dump({'c': c.round(5).tolist(), 'h': h.round(5).tolist(), 'p': base64.b64encode(q.tobytes()).decode(), 'uv': base64.b64encode(uvq.tobytes()).decode(), 'n': int(len(P) // 3)}, open(O + name + '.json', 'w'))
Image.open(sys.argv[2]).convert('RGB').save(O + name + '.webp', 'WEBP', quality=88)
print(name, 'c', c.round(4), 'h', h.round(4), 'json KB', os.path.getsize(O + name + '.json') // 1024, 'webp KB', os.path.getsize(O + name + '.webp') // 1024)
