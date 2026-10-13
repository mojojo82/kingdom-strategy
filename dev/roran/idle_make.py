# Roran's battle idle, made from scratch (Harley 13 Oct: not bent over, legs a bit apart, body toward us, head looking right).
# Starts from the rigged rest stance (feet already a little apart), brings the arms down to the sides, then loops a breath:
# chest rises/pitches back, shoulders + arms lift, a little sway; the head is turned right (HEAD yaw) and bobs slightly.
# Writes anim "IdleS" (2 s loop, 30 fps) into roran.json. Env: HEAD=deg (head/neck/chest turn to the right), BREATH=scale.
import json, base64, os, numpy as np
src = open('bake_roran.py').read(); src = src[:src.index('# Head fix')]; ns = {}; exec(src, ns)
J, names, IBM, nodes, joints, parent, base, trs = ns['J'], ns['names'], ns['IBM'], ns['nodes'], ns['joints'], ns['parent'], ns['base'], ns['trs']
HEAD = float(os.environ.get('HEAD', '25')); BR = float(os.environ.get('BREATH', '1.5'))
order = []; seen = set()
def visit(i):
    if i in seen: return
    if i in parent: visit(parent[i])
    seen.add(i); order.append(i)
for i in range(len(nodes)): visit(i)
nid = {nodes[i].get('name', ''): i for i in range(len(nodes))}
def R(axis, deg):
    a = np.radians(deg); c, s = np.cos(a), np.sin(a); x, y, z = axis
    return np.array([[c+x*x*(1-c), x*y*(1-c)-z*s, x*z*(1-c)+y*s], [y*x*(1-c)+z*s, c+y*y*(1-c), y*z*(1-c)-x*s], [z*x*(1-c)-y*s, z*y*(1-c)+x*s, c+z*z*(1-c)]])
def about(G, Rm):
    p = G[:3, 3].copy(); M = np.eye(4); M[:3, :3] = Rm; M[:3, 3] = p - Rm @ p; return M @ G
def align(cur, tgt):
    cur = cur / np.linalg.norm(cur); tgt = tgt / np.linalg.norm(tgt); v = np.cross(cur, tgt); c = float(np.dot(cur, tgt)); s = np.linalg.norm(v)
    if s < 1e-8: return np.eye(3)
    vx = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]]); return np.eye(3) + vx + vx @ vx * ((1 - c) / s**2)
X, Y, Z = (1, 0, 0), (0, 1, 0), (0, 0, 1)   # glTF: +Y up, +Z = the way he faces, +X = his left
CHILD = {'LeftArm': 'LeftForeArm', 'LeftForeArm': 'LeftHand', 'RightArm': 'RightForeArm', 'RightForeArm': 'RightHand'}
def pose(ph):
    b = np.sin(2 * np.pi * ph) * BR; b2 = np.sin(2 * np.pi * ph + 0.9) * BR   # breath, and a slightly late follow-through for arms/head
    DIR = {'LeftArm': (0.30, -1, 0.10 + 0.02 * b2), 'LeftForeArm': (0.18, -1, 0.28),
           'RightArm': (-0.30, -1, 0.10 + 0.02 * b2), 'RightForeArm': (-0.16, -1, 0.34)}
    EXTRA = {'Hips': R(Y, 1.5 * b2), 'Spine': R(X, -1.2 * b), 'Spine1': R(X, -1.5 * b), 'Spine2': R(Y, HEAD * 0.15) @ R(X, -1.5 * b),
             'Neck': R(Y, HEAD * 0.3) @ R(X, 1.2 * b), 'Head': R(Y, HEAD * 0.55) @ R(X, 1.8 * b2),
             'LeftShoulder': R(Z, 2.5 * b), 'RightShoulder': R(Z, -2.5 * b)}
    G = {}
    for i in order:
        L = trs(*base[i]); Gi = (G[parent[i]] @ L) if i in parent else L
        nm = nodes[i].get('name', '').replace('mixamorig:', '')
        if nm in EXTRA: Gi = about(Gi, EXTRA[nm])
        if nm in DIR:
            c = nid['mixamorig:' + CHILD[nm]]; Lc = trs(*base[c]); cur = (Gi @ Lc)[:3, 3] - Gi[:3, 3]
            Gi = about(Gi, align(cur, np.array(DIR[nm], float)))
        if nm == 'Hips': Gi[1, 3] += -0.004 * b    # tiny settle with each breath (feet stay within ~4 mm)
        G[i] = Gi
    return np.stack([G[j] @ IBM[k] for k, j in enumerate(joints)])
TL = 2.0; nf = 60
fr = np.array([pose(f / nf) for f in range(nf)])
d = json.load(open('roran.json'))
pk = base64.b64encode(np.ascontiguousarray(fr[:, :, :3, :].transpose(0, 1, 3, 2), dtype=np.float32).tobytes()).decode()
d['anims'] = {'IdleS': {'len': TL, 'frames': pk}, **{k: v for k, v in d['anims'].items() if k != 'IdleS'}}
json.dump(d, open('roran.json', 'w')); print('IdleS', fr.shape, list(d['anims']))
