# Adds the lance as an extra joint (index 23) to every animation in roran.json: the lance follows his RIGHT fist (grip point carried by the hand)
# but its direction is set here, not by the hand's twist: upright in the idle; in RThrow it swings from upright to pointing at the target
# (forward + a little up, turned with the throw's YAW) during the blend-in and holds that until the release (then render.js hides it).
# The grip also slides from GRIP0 (idle, low on the shaft) to GRIP1 (throw, about the middle). Run last (after compose.py).
import json, base64, os, numpy as np
d = json.load(open('roran.json')); nj = 23
assert d['nj'] in (23, 24)
src = open('bake_roran.py').read(); src = src[:src.index('# Head fix')]; ns = {}; exec(src, ns); IBM = ns['IBM']; names = ns['names']
BJ = np.linalg.inv(IBM)[:, :3, 3]; RH, RF = names.index('mixamorig:RightHand'), names.index('mixamorig:RightForeArm')
YAW = float(os.environ.get('YAW', '-0.95')); BIN = int(os.environ.get('BIN', '6')); G0, G1 = 0.48, 0.78
c, s = np.cos(YAW), np.sin(YAW); Ry = np.array([[c, 0, -s], [0, 1, 0], [s, 0, c]])
DTH = Ry @ (np.array([0, 0.28, 1.0]) / np.linalg.norm([0, 0.28, 1.0]))
def align(a, b):
    a = a/np.linalg.norm(a); b = b/np.linalg.norm(b); v = np.cross(a, b); cc = float(a@b); sn = np.linalg.norm(v)
    if sn < 1e-8: return np.eye(3)
    vx = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]]); return np.eye(3) + vx + vx@vx*((1-cc)/sn**2)
for k, A in d['anims'].items():
    F = np.frombuffer(base64.b64decode(A['frames']), np.float32).reshape(-1, d['nj'], 4, 3).transpose(0, 1, 3, 2)[:, :nj].astype(float)
    out = []
    for f, M in enumerate(F):
        wrist = M[RH][:, :3] @ BJ[RH] + M[RH][:, 3]; fore = M[RF][:, :3] @ BJ[RF] + M[RF][:, 3]; g = wrist + (wrist - fore) / np.linalg.norm(wrist - fore) * 0.05
        u = 0.0
        if k == 'RThrow': u = min(1.0, (f + 1) / (BIN + 1)); u = u*u*(3-2*u)
        dr = np.array([0, 1.0, 0])*(1-u) + DTH*u; R = align(np.array([0, 1.0, 0]), dr); gp = G0*(1-u) + G1*u
        J = np.zeros((3, 4)); J[:, :3] = R; J[:, 3] = g - R @ np.array([0, gp, 0]); out.append(np.vstack([M.transpose(0, 2, 1) if False else M, J[None]]))
    fr = np.array(out)
    A['frames'] = base64.b64encode(np.ascontiguousarray(fr.transpose(0, 1, 3, 2), dtype=np.float32).tobytes()).decode()
d['nj'] = 24; d['hand'] = 23
json.dump(d, open('roran.json', 'w')); print('lance joint added to', list(d['anims']))
