# Code-built model (npz: pos = 3 corners per face, col = rgb per face) -> the game's flat-model format { c, h, p (int16 shared xyz), i (uint16), fc (rgb per face), ol: 1 }
import numpy as np, json, base64, sys
d = np.load(sys.argv[1]); P = d['pos']; C = d['col']
U, inv = np.unique(np.round(P, 6), axis=0, return_inverse=True); I = inv.reshape(-1).astype(np.uint16)
c = (U.max(0) + U.min(0)) / 2; h = (U.max(0) - U.min(0)) / 2; q = np.round((U - c) / h * 32767).astype(np.int16)
b = lambda a: base64.b64encode(a.tobytes()).decode()
M = {"c": [round(float(x), 5) for x in c], "h": [round(float(x), 5) for x in h], "p": b(q), "i": b(I), "fc": b(C.astype(np.uint8)), "ol": 1}
s = json.dumps(M, separators=(',', ':')); open(sys.argv[2], 'w').write(s); print(len(U), 'verts', len(C), 'faces', len(s), 'bytes', M['c'], M['h'])
