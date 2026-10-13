# Roran's game throw: blends from the idle (IdleS frame 0, body toward the camera) into the Mixamo throw window, turned side-on
# so the spear flies screen-right when viewed at the idle's camera angle, then blends back to the idle. Writes anim "RThrow" (30 fps).
# Env: YAW (rad, extra turn for the throw; ANG_throw - ANG_idle = 1.3 - 0.35), T0/T1 (window of the "Throw" anim), BIN/BOUT (blend frames).
import json, base64, os, numpy as np
from scipy.spatial.transform import Rotation as Rot, Slerp
d = json.load(open('roran.json')); nj = d['nj']
def frames(k): A = d['anims'][k]; return np.frombuffer(base64.b64decode(A['frames']), np.float32).reshape(-1, nj, 4, 3).transpose(0, 1, 3, 2).astype(float), A['len']
I, _ = frames('IdleS'); Th, TL = frames('Throw')
YAW = float(os.environ.get('YAW', '-0.95')); T0 = float(os.environ.get('T0', '1.8')); T1 = float(os.environ.get('T1', '3.0'))
BIN = int(os.environ.get('BIN', '6')); BOUT = int(os.environ.get('BOUT', '9'))
def at(t): x = t / TL * len(Th); i = int(np.clip(np.floor(x), 0, len(Th) - 2)); u = x - i; return blend(Th[i], Th[i+1], u)
def blend(A, B, u):
    out = np.empty_like(A)
    for j in range(nj):
        r = Slerp([0, 1], Rot.from_matrix([A[j][:, :3], B[j][:, :3]]))([u]).as_matrix()[0]; out[j][:, :3] = r; out[j][:, 3] = A[j][:, 3]*(1-u) + B[j][:, 3]*u
    return out
def yaw(M, y):
    c, s = np.cos(y), np.sin(y); R = np.array([[c, 0, -s], [0, 1, 0], [s, 0, c]])   # same form as the viewer's turn, so viewer(ang) + yaw = viewer(ang + yaw)
    return np.stack([np.hstack([R @ m[:, :3], (R @ m[:, 3])[:, None]]) for m in M])
ease = lambda u: u*u*(3-2*u)
seq = []
idle0 = I[0]; first = yaw(at(T0), YAW); last = yaw(at(T1), YAW)
for f in range(BIN): u = ease((f+1) / (BIN+1)); seq.append(blend(idle0, yaw(at(T0), YAW*u) if False else first, u))
nmid = int(round((T1 - T0) * 30))
for f in range(nmid): seq.append(yaw(at(T0 + f / 30), YAW))
for f in range(BOUT): u = ease((f+1) / (BOUT+1)); seq.append(blend(last, idle0, u))
fr = np.array(seq); rel = BIN + int(round((float(os.environ.get('REL', '2.5')) - T0) * 30))
pk = base64.b64encode(np.ascontiguousarray(fr.transpose(0, 1, 3, 2), dtype=np.float32).tobytes()).decode()
d['anims'] = {'RThrow': {'len': len(fr) / 30, 'frames': pk}, **{k: v for k, v in d['anims'].items() if k != 'RThrow'}}
json.dump(d, open('roran.json', 'w')); print('RThrow frames', len(fr), 'len', round(len(fr) / 30, 3), 'release frame', rel)
