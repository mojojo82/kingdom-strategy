# Retarget a Mixamo ASCII FBX animation (skeleton only) onto Kessa (or the knight) (same mixamorig bone names).
# usage: python3 mixamo.py <in.fbx> "<Anim Name>" [in_place]
# Each bone copies the source's world-space rotation change from its rest pose; a per-bone fix maps the knight's
# A-pose rest onto Mixamo's T-pose rest first. Hips movement is scaled by hip height.
import re, sys, os, json, base64, numpy as np
from scipy.spatial.transform import Rotation as Rot, Slerp
# TAME="spin=0.5,legs=0.4,staff=0.2,hips=0.4": keep only that share of the motion (the rest blends toward the first frame's stance).
# spin = Hips + spine + neck + head, legs = both legs, staff = the left arm (Kessa's staff hand), hips = hip travel.
TAME = dict((k, float(v)) for k, v in (p.split('=') for p in os.environ.get('TAME', '').split(',') if p))
GROUPS = {'spin': ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head'], 'legs': ['RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase'],
          'staff': ['LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand'], 'head': ['Neck', 'Head']}  # head (Roran): overrides spin for neck + head so he keeps looking at the enemy
KEEP = {b: TAME[g] for g, bs in GROUPS.items() if g in TAME for b in bs}
# AMP=2.5: exaggerate every bone's motion around the first frame's stance (idles too subtle at sprite size); hip travel too
AMP = float(os.environ.get('AMP', '1'))
# LEGREST=1: legs stand in the model's own rest stance (straight, hip-width) and are left out of AMP; hip travel is dropped so the feet stay planted
LEGREST = os.environ.get('LEGREST') == '1'
LEGS = set(GROUPS['legs'])
def blendR(A, B, f):  # rotation f of the way from A to B (f > 1 overshoots)
    ra, rb = Rot.from_matrix(A), Rot.from_matrix(B); return (ra * Rot.from_rotvec((ra.inv() * rb).as_rotvec() * f)).as_matrix()
FBX, NAME = sys.argv[1], sys.argv[2]; IN_PLACE = len(sys.argv) > 3
TXT = open(FBX).read()

def E(v):  # FBX euler XYZ (degrees) -> matrix, R = Rz Ry Rx
    x, y, z = np.radians(v); cx, sx, cy, sy, cz, sz = np.cos(x), np.sin(x), np.cos(y), np.sin(y), np.cos(z), np.sin(z)
    Rx = np.array([[1,0,0],[0,cx,-sx],[0,sx,cx]]); Ry = np.array([[cy,0,sy],[0,1,0],[-sy,0,cy]]); Rz = np.array([[cz,-sz,0],[sz,cz,0],[0,0,1]])
    return Rz @ Ry @ Rx

# ---- parse models
M = {}
for m in re.finditer(r'Model: (\d+), "Model::([^"]+)", "(\w+)" \{(.*?)\n\t\}', TXT, re.S):
    mid, name, body = int(m.group(1)), m.group(2), m.group(4)
    def P(k, d):
        r = re.search(r'P: "' + k + r'"[^\n]*",(-?[\d.e+-]+,-?[\d.e+-]+,-?[\d.e+-]+)\s*\n', body)
        return np.array([float(x) for x in r.group(1).split(',')]) if r else np.array(d, float)
    M[mid] = dict(name=name, T=P('Lcl Translation', [0,0,0]), R=P('Lcl Rotation', [0,0,0]), S=P('Lcl Scaling', [1,1,1]),
                  pre=P('PreRotation', [0,0,0]), post=P('PostRotation', [0,0,0]))
curves = {}
for m in re.finditer(r'AnimationCurve: (\d+), "AnimCurve::", "" \{.*?KeyTime: \*\d+ \{\s*a: ([^}]*)\}.*?KeyValueFloat: \*\d+ \{\s*a: ([^}]*)\}', TXT, re.S):
    curves[int(m.group(1))] = (np.array([float(x) for x in m.group(2).split(',')]) / 46186158000.0, np.array([float(x) for x in m.group(3).split(',')]))
cnode = {int(m.group(1)): m.group(2) for m in re.finditer(r'AnimationCurveNode: (\d+), "AnimCurveNode::(\w+)"', TXT)}
parent = {}; node_of = {}; chan = {}
for m in re.finditer(r'C: "(OO|OP)",(\d+),(\d+)(?:, "([^"]+)")?', TXT):
    k, a, b, p = m.group(1), int(m.group(2)), int(m.group(3)), m.group(4)
    if k == 'OO' and a in M and (b in M): parent[a] = b
    if k == 'OP' and a in cnode and b in M: node_of[a] = (b, p)
    if k == 'OP' and a in curves and b in cnode: chan.setdefault(b, {})[p] = a
anim = {}  # model id -> {'Lcl Rotation': {0:curve,1:..}, ...}
for cn, (mid, prop) in node_of.items():
    for ax, cid in chan.get(cn, {}).items(): anim.setdefault(mid, {}).setdefault(prop, {})['XYZ'.index(ax[-1])] = curves[cid]
TL = max(c[0].max() for c in curves.values())

def sample(c, t): return float(np.interp(t, c[0], c[1]))
def local(mid, t=None):
    m = M[mid]; T, R, S = m['T'].copy(), m['R'].copy(), m['S'].copy()
    if t is not None:
        for prop, arr in (('Lcl Translation', T), ('Lcl Rotation', R), ('Lcl Scaling', S)):
            for ax, c in anim.get(mid, {}).get(prop, {}).items(): arr[ax] = sample(c, t)
    L = np.eye(4); L[:3, :3] = E(m['pre']) @ E(R) @ E(m['post']).T @ np.diag(S); L[:3, 3] = T; return L
byname = {m['name']: k for k, m in M.items()}
def sglob(t):
    G = {}
    def g(i):
        if i in G: return G[i]
        L = local(i, t); G[i] = (g(parent[i]) @ L) if i in parent else L; return G[i]
    for i in M: g(i)
    return {M[i]['name']: G[i] for i in G}

# ---- target (knight) skeleton
src = open('../knight/bake.py').read(); src = src[:src.index('J,BIN,walk,Tw,nw=bake')]; ns = {}; exec(src, ns)
glb, acc, trs = ns['glb'], ns['acc'], ns['trs']
F = '../../art/originals/roran_rigged.glb'
J, BIN = glb(F); nodes = J['nodes']; skin = J['skins'][0]; joints = skin['joints']; names = {i: n.get('name', '') for i, n in enumerate(nodes)}
IBM = acc(J, BIN, skin['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)
tpar = {}
for i, n in enumerate(nodes):
    for c in n.get('children', []): tpar[c] = i
base = {i: [np.array(n.get('translation', [0,0,0]), float), np.array(n.get('rotation', [0,0,0,1]), float), np.array(n.get('scale', [1,1,1]), float)] for i, n in enumerate(nodes)}
order = []; seen = set()
def visit(i):
    if i in seen: return
    if i in tpar: visit(tpar[i])
    seen.add(i); order.append(i)
for i in range(len(nodes)): visit(i)
G0 = {}
for i in order: L = trs(*base[i]); G0[i] = (G0[tpar[i]] @ L) if i in tpar else L
tidx = {v: k for k, v in names.items()}
def unit(R): return R / np.linalg.norm(R, axis=0)
def nrm(v): return v / np.linalg.norm(v)
def align(cur, tgt):
    cur, tgt = nrm(cur), nrm(tgt); v = np.cross(cur, tgt); c = float(np.dot(cur, tgt)); s = np.linalg.norm(v)
    if s < 1e-8: return np.eye(3)
    vx = np.array([[0,-v[2],v[1]],[v[2],0,-v[0]],[-v[1],v[0],0]]); return np.eye(3) + vx + vx @ vx * ((1 - c) / s**2)

S0 = sglob(None)  # source rest pose
CH = {'Hips':'Spine','Spine':'Spine1','Spine1':'Spine2','Spine2':'Neck','Neck':'Head','Head':'HeadTop_End',
      'RightShoulder':'RightArm','RightArm':'RightForeArm','RightForeArm':'RightHand','LeftShoulder':'LeftArm','LeftArm':'LeftForeArm','LeftForeArm':'LeftHand',
      'RightUpLeg':'RightLeg','RightLeg':'RightFoot','RightFoot':'RightToeBase','RightToeBase':'RightToe_End',
      'LeftUpLeg':'LeftLeg','LeftLeg':'LeftFoot','LeftFoot':'LeftToeBase','LeftToeBase':'LeftToe_End'}
mapped = [b for b in CH] + ['RightHand', 'LeftHand']
Q = {}
for b in mapped:
    c = CH.get(b) or CH[b.replace('Hand', 'ForeArm')]
    if b in ('RightHand', 'LeftHand'): Q[b] = Q[b.replace('Hand', 'ForeArm')]; continue
    if 'mixamorig:' + c not in tidx or 'mixamorig:' + b not in tidx: Q[b] = np.eye(3); continue  # Kessa has no HeadTop_End / Toe_End: keep the rest direction
    tb, tc = G0[tidx['mixamorig:' + b]][:3, 3], G0[tidx['mixamorig:' + c]][:3, 3]
    sb, sc = S0['mixamorig:' + b][:3, 3], S0['mixamorig:' + c][:3, 3]
    Q[b] = align(tc - tb, sc - sb) if b != 'Hips' else np.eye(3)
hipS = S0['mixamorig:Hips'][1, 3]; hipT = G0[tidx['mixamorig:Hips']][1, 3]; K = hipT / hipS

def bakeAt(t):
    S = sglob(t); G = {}; D = {}; SR = S_REF
    for i in order:
        nm = names[i].replace('mixamorig:', '')
        if nm in Q:
            Ws, Ws0 = unit(S['mixamorig:' + nm][:3, :3]), unit(S0['mixamorig:' + nm][:3, :3])
            if nm in KEEP: Ws = blendR(unit(SR['mixamorig:' + nm][:3, :3]), Ws, KEEP[nm])
            if AMP != 1 and not (LEGREST and nm in LEGS): Ws = blendR(unit(SR['mixamorig:' + nm][:3, :3]), Ws, AMP)
            if os.environ.get('HEADTURN') and nm in ('Spine2', 'Neck', 'Head'):  # HEADTURN=deg: turn chest/neck/head about the vertical (Roran: body toward the camera, eyes right)
                Ws = Rot.from_euler('y', np.radians(float(os.environ['HEADTURN'])) * {'Spine2': 0.2, 'Neck': 0.3, 'Head': 0.5}[nm]).as_matrix() @ Ws
            if LEGREST and nm in LEGS: Ws = blendR(Ws0, unit(SR['mixamorig:' + nm][:3, :3]), float(os.environ.get('LEGMIX', '0')))  # LEGMIX: 0 = straight rest legs, 1 = the idle's own stance (no sway either way)
            if LEGREST and nm in LEGS and os.environ.get('LEGTURN'):  # LEGTURN="R,L" degrees: turn each whole leg out about the vertical (relaxed stance, feet angled like the cast)
                tr, tl = [float(v) for v in os.environ['LEGTURN'].split(',')]; ang = np.radians(tr if nm.startswith('Right') else tl)
                Ws = Rot.from_euler('y', ang).as_matrix() @ Ws
            Dl = Ws @ Ws0.T @ Q[nm]   # world rotation applied to this bone's rest
            Gi = np.eye(4); Gi[:3, :3] = Dl @ G0[i][:3, :3]
            if i in tpar: Gi[:3, 3] = (G[tpar[i]] @ np.append(base[i][0], 1))[:3]
            else: Gi[:3, 3] = G0[i][:3, 3]
            if nm == 'Hips':
                d = (S['mixamorig:Hips'][:3, 3] - S0['mixamorig:Hips'][:3, 3]) * K
                if AMP != 1: d = ((SR['mixamorig:Hips'][:3, 3] - S0['mixamorig:Hips'][:3, 3]) + (S['mixamorig:Hips'][:3, 3] - SR['mixamorig:Hips'][:3, 3]) * AMP) * K
                if LEGREST: d = d * 0
                if 'hips' in TAME: d = ((SR['mixamorig:Hips'][:3, 3] - S0['mixamorig:Hips'][:3, 3]) + (S['mixamorig:Hips'][:3, 3] - SR['mixamorig:Hips'][:3, 3]) * TAME['hips']) * K
                if IN_PLACE: d[0] = d[2] = 0
                Gi[:3, 3] = G0[i][:3, 3] + d
        else:
            L = trs(*base[i]); Gi = (G[tpar[i]] @ L) if i in tpar else L
        G[i] = Gi
    return np.stack([G[j] @ IBM[k] for k, j in enumerate(joints)])

S_REF = sglob(float(os.environ.get('REFT', '0')))  # the stance the tamed / exaggerated bones are measured from (REFT seconds)
T0 = float(os.environ.get('T0', '0')); T1 = float(os.environ.get('T1', str(TL)))  # T0/T1: keep only that window of the source (seconds)
fps = 30; TL = T1 - T0; nf = int(round(TL * fps))
frames = np.array([bakeAt(T0 + f / nf * TL) for f in range(nf)])
d = json.load(open('roran.json'))
pk = base64.b64encode(np.ascontiguousarray(frames[:, :, :3, :].transpose(0, 1, 3, 2), dtype=np.float32).tobytes()).decode()
a = {k: v for k, v in d['anims'].items() if k != NAME}; d['anims'] = {**{k: a[k] for k in list(a)[:1]}, NAME: {'len': TL, 'frames': pk}, **{k: a[k] for k in list(a)[1:]}}
json.dump(d, open('roran.json', 'w'))
print(NAME, 'len', round(TL, 3), 'frames', frames.shape, 'hip scale', round(K, 4), 'anims', list(d['anims']))
