# npz from bake_textured.py -> json for prev_tex.js.  python3 dev/glb/prev_tex.py IN.npz OUT.json
import numpy as np, json, sys
d = np.load(sys.argv[1]); json.dump({'pos': d['pos'].astype(np.float32).ravel().round(4).tolist(), 'uv': d['uv'].astype(np.float32).ravel().round(5).tolist()}, open(sys.argv[2], 'w'))
