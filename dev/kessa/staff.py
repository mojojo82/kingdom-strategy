# Kessa's staff (gold shaft, gold claw ring, green orb - like her sprite), built in code and locked to her LEFT hand.
# It is placed upright in the hand at a reference moment (REF anim/time) and then rides the hand bone rigidly. Writes it into kessa.json as the held prop.
import json, base64, struct, io, sys, numpy as np
from PIL import Image
REF = (sys.argv[1] if len(sys.argv) > 1 else '1H Magic Attack (tamed)', float(sys.argv[2]) if len(sys.argv) > 2 else 0.0)
d = json.load(open('kessa.json')); nj = d['nj']
b = open('../../art/originals/kessa_rigged.glb', 'rb').read(); cl, _ = struct.unpack('<I4s', b[12:20]); J = json.loads(b[20:20+cl]); BIN = b[20+cl+8:]
skin = J['skins'][0]; names = [J['nodes'][j]['name'] for j in skin['joints']]
a = J['accessors'][skin['inverseBindMatrices']]; bv = J['bufferViews'][a['bufferView']]
IBM = np.frombuffer(BIN, np.float32, a['count']*16, bv.get('byteOffset', 0)+a.get('byteOffset', 0)).reshape(-1, 4, 4).transpose(0, 2, 1)
BJ = np.linalg.inv(IBM)[:, :3, 3]                               # joint positions in bind space
LH, LF = names.index('mixamorig:LeftHand'), names.index('mixamorig:LeftForeArm')
A = d['anims'][REF[0]]; F = np.frombuffer(base64.b64decode(A['frames']), np.float32).reshape(-1, nj, 4, 3).transpose(0, 1, 3, 2)
fi = min(len(F)-1, int(round(REF[1] / A['len'] * len(F)))); M = F[fi]
P = lambda j, p: M[j][:, :3] @ p + M[j][:, 3]
wrist, fore = P(LH, BJ[LH]), P(LF, BJ[LF]); hdir = (wrist - fore) / np.linalg.norm(wrist - fore)
grip = wrist + hdir * 0.045                                      # middle of the fist
H = 1.4; L = 0.95 * H; up = np.array([0, 1, 0.0]); bottom = grip - up * L * 0.42
# ---- mesh (posed space), texture atlas: u<0.5 gold, u>0.5 green
V, N, UV, I = [], [], [], []
def add(vs, ns, uvs, tris):
    o = len(V); V.extend(vs); N.extend(ns); UV.extend(uvs); I.extend([[o+t[0], o+t[1], o+t[2]] for t in tris])
def tube(c0, c1, r0, r1, seg=14, u=0.25):
    ax = (c1-c0)/np.linalg.norm(c1-c0); s = np.cross(ax, [0, 0, 1.0]); s /= np.linalg.norm(s); t = np.cross(ax, s); vs, ns, uvs, tr = [], [], [], []
    for k in range(seg+1):
        a = 2*np.pi*k/seg; n = np.cos(a)*s + np.sin(a)*t
        vs += [c0+n*r0, c1+n*r1]; ns += [n, n]; uvs += [[u, 0.2+0.6*k/seg]]*2
    for k in range(seg): q = 2*k; tr += [(q, q+1, q+2), (q+1, q+3, q+2)]
    add(vs, ns, uvs, tr)
def sphere(c, r, u, seg=16):
    vs, ns, uvs, tr = [], [], [], []
    for i in range(seg+1):
        th = np.pi*i/seg
        for k in range(seg+1):
            ph = 2*np.pi*k/seg; n = np.array([np.sin(th)*np.cos(ph), np.cos(th), np.sin(th)*np.sin(ph)]); vs.append(c+n*r); ns.append(n); uvs.append([u, 0.15+0.7*i/seg])
    for i in range(seg):
        for k in range(seg): q = i*(seg+1)+k; tr += [(q, q+seg+1, q+1), (q+1, q+seg+1, q+seg+2)]
    add(vs, ns, uvs, tr)
def torus(c, R, r, axis, u=0.25, seg=24, ring=8, arc=2*np.pi):
    axis = axis/np.linalg.norm(axis); s = np.cross(axis, [0, 1.0, 0]) if abs(axis[1]) < 0.9 else np.array([1.0, 0, 0]); s /= np.linalg.norm(s); t = np.cross(axis, s); vs, ns, uvs, tr = [], [], [], []
    for k in range(seg+1):
        a = arc*k/seg - arc/2; d0 = np.cos(a)*t + np.sin(a)*s
        for j in range(ring+1):
            b2 = 2*np.pi*j/ring; n = np.cos(b2)*d0 + np.sin(b2)*axis; vs.append(c+d0*R+n*r); ns.append(n); uvs.append([u, 0.2+0.6*j/ring])
    for k in range(seg):
        for j in range(ring): q = k*(ring+1)+j; tr += [(q, q+ring+1, q+1), (q+1, q+ring+1, q+ring+2)]
    add(vs, ns, uvs, tr)
top = bottom + up*L
tube(bottom, top - up*0.02, 0.016, 0.019)                       # shaft
tube(bottom - up*0.03, bottom + up*0.01, 0.012, 0.022, u=0.2)    # foot cap
tube(grip - up*0.07, grip + up*0.07, 0.023, 0.023, u=0.15)       # leather-ish grip band (darker gold)
tube(top - up*0.05, top + up*0.02, 0.022, 0.034, u=0.3)         # collar under the claw
orb = top + up*0.11
torus(orb, 0.085, 0.014, np.array([0, 0, 1.0]), arc=1.75*np.pi)   # open claw ring around the orb (gap at the top), facing the camera
sphere(orb, 0.062, 0.78)                                         # emerald orb
sphere(orb + up*0.105, 0.016, 0.3, seg=8)                        # small gold tip
V, N = np.array(V), np.array(N)
# posed -> bind space through the hand's skin matrix at the reference moment
R, T = M[LH][:, :3], M[LH][:, 3]; Ri = np.linalg.inv(R)
VB = (V - T) @ Ri.T; NB = N @ R          # R is a rotation: inverse-transpose of Ri = R
tex = np.zeros((64, 64, 3), np.uint8)
for y in range(64):
    g = 0.65 + 0.35*np.sin(y/64*np.pi)
    tex[y, :32] = (np.array([226, 182, 72])*g).clip(0, 255); tex[y, :12] = (np.array([150, 112, 48])*g).clip(0, 255)   # gold, darker band at u<0.19
    tex[y, 32:] = (np.array([70, 230, 150])*(0.55+0.45*np.sin(y/64*np.pi))).clip(0, 255)
bb = io.BytesIO(); Image.fromarray(tex).save(bb, 'PNG')
f32 = lambda a: base64.b64encode(np.ascontiguousarray(a, dtype=np.float32).tobytes()).decode()
d['sword'] = {'p': f32(VB), 'n': f32(NB), 'uv': f32(np.array(UV)), 'i': base64.b64encode(np.array(I, np.uint16).ravel().tobytes()).decode(),
              'tex': 'data:image/png;base64,' + base64.b64encode(bb.getvalue()).decode(), 'handO': [0, 0, 0], 'handR': [1, 0, 0, 0, 1, 0, 0, 0, 1]}
d['hand'] = LH
json.dump(d, open('kessa.json', 'w')); print('staff verts', len(V), 'tris', len(I), 'ref', REF, 'frame', fi, 'grip', grip.round(3))
