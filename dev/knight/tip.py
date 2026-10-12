# sword tip + hand positions (world: y up, z forward) over an animation in knight3.json: python3 tip.py "<Anim>" [n]
import json, base64, sys, numpy as np
d = json.load(open('knight3.json')); A = d['anims'][sys.argv[1]]; NJ = d['nj']; hand = d['hand']
F = np.frombuffer(base64.b64decode(A['frames']), dtype=np.float32).reshape(-1, NJ, 4, 3)
S = d['sword']; P = np.frombuffer(base64.b64decode(S['p']), dtype=np.float32).reshape(-1, 3)
def vrot(rx, ry, rz):
    a, b, c = np.radians([rx, ry, rz]); X = np.array([[1,0,0],[0,np.cos(a),-np.sin(a)],[0,np.sin(a),np.cos(a)]]); Y = np.array([[np.cos(b),0,np.sin(b)],[0,1,0],[-np.sin(b),0,np.cos(b)]]); Z = np.array([[np.cos(c),-np.sin(c),0],[np.sin(c),np.cos(c),0],[0,0,1]])
    return Z @ Y @ X
Rh = np.array(S['handR']).reshape(3, 3).T; tipL = P[np.argmax(P[:, 1])] * 2.43
tipB = np.array(S['handO']) + Rh @ vrot(0, 90, -90) @ tipL
n = int(sys.argv[2]) if len(sys.argv) > 2 else len(F)
for i in range(n):
    f = i * len(F) / n; M = F[int(f)][hand].T   # 3x4
    tp = M[:, :3] @ tipB + M[:, 3]; hp = M[:, :3] @ np.array(S['handO']) + M[:, 3]
    print(f"{i:2d} t={f/len(F)*A['len']:.3f}  tip y={tp[1]:.2f} z={tp[2]:.2f}   hand y={hp[1]:.2f} z={hp[2]:.2f}")
