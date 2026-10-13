# Roran's lance (dark wood shaft, copper collar, steel leaf blade with two side prongs - like his hero art), built in code and locked to his RIGHT hand
# (his throwing hand). Placed upright in the fist at IdleS frame 0, then it rides the hand rigidly. Written into roran.json as the held prop ('sword' slot).
import json, base64, struct, io, numpy as np
from PIL import Image
d = json.load(open('roran.json')); nj = d['nj']
b = open('../../art/originals/roran_rigged.glb', 'rb').read(); cl, _ = struct.unpack('<I4s', b[12:20]); J = json.loads(b[20:20+cl]); BIN = b[20+cl+8:]
skin = J['skins'][0]; names = [J['nodes'][j]['name'] for j in skin['joints']]
a = J['accessors'][skin['inverseBindMatrices']]; bv = J['bufferViews'][a['bufferView']]
IBM = np.frombuffer(BIN, np.float32, a['count']*16, bv.get('byteOffset', 0)+a.get('byteOffset', 0)).reshape(-1, 4, 4).transpose(0, 2, 1)
BJ = np.linalg.inv(IBM)[:, :3, 3]
up = np.array([0, 1, 0.0]); bottom = np.zeros(3); top = up*1.59; grip = up*0.48   # grip = where his fist holds it at rest (from the butt)
V, N, UV, I = [], [], [], []
def add(vs, ns, uvs, tris):
    o = len(V); V.extend(vs); N.extend(ns); UV.extend(uvs); I.extend([[o+t[0], o+t[1], o+t[2]] for t in tris])
def loft(c0, axis, prof, u, seg=12, flat=1.0):  # rings along axis: prof = [(dist, radius)], flat squashes the depth (blade)
    ax = axis / np.linalg.norm(axis); s = np.cross(ax, [0, 0, 1.0]); s /= np.linalg.norm(s); t = np.cross(ax, s); vs, ns, uvs, tr = [], [], [], []
    for r, (h, rad) in enumerate(prof):
        for k in range(seg+1):
            an = 2*np.pi*k/seg; n = np.cos(an)*s + np.sin(an)*t*flat; nn = np.cos(an)*s + np.sin(an)*t/max(flat, 1e-3)
            vs.append(c0 + ax*h + n*rad); ns.append(nn/np.linalg.norm(nn)); uvs.append([u, 0.15+0.7*r/max(1, len(prof)-1)])
    for r in range(len(prof)-1):
        for k in range(seg): q = r*(seg+1)+k; tr += [(q, q+seg+1, q+1), (q+1, q+seg+1, q+seg+2)]
    add(vs, ns, uvs, tr)
L = top[1] - bottom[1]
loft(bottom, up, [(0, 0.012), (0.03, 0.019), (L - 0.30, 0.019), (L - 0.27, 0.017)], 0.15)                     # wood shaft
loft(grip - up*0.06, up, [(0, 0.023), (0.12, 0.023)], 0.08)                                                    # leather grip wrap
loft(bottom + up*(L - 0.30), up, [(0, 0.024), (0.02, 0.03), (0.07, 0.028), (0.09, 0.022)], 0.45)               # copper collar
bl = bottom + up*(L - 0.21)
loft(bl, up, [(0, 0.022), (0.05, 0.06), (0.12, 0.05), (0.22, 0.022), (0.29, 0.0)], 0.85, seg=8, flat=0.22)     # steel leaf blade, flat toward his front
for sx in (-1, 1):                                                                                              # side prongs, swept up
    c = bl + up*0.01; dirp = np.array([sx*0.8, 0.6, 0]); loft(c, dirp, [(0, 0.012), (0.09, 0.006), (0.11, 0.0)], 0.85, seg=6)
V, N = np.array(V), np.array(N)
VB, NB = V, N
tex = np.zeros((64, 64, 3), np.uint8)
for y in range(64):
    g = 0.7 + 0.3*np.sin(y/64*np.pi)
    tex[y, :8] = np.array([70, 45, 30])*g; tex[y, 8:21] = np.array([92, 58, 34])*g          # grip wrap / wood
    tex[y, 21:42] = (np.array([196, 118, 64])*g).clip(0, 255)                               # copper
    tex[y, 42:] = (np.array([205, 214, 224])*(0.75+0.25*np.sin(y/64*np.pi))).clip(0, 255)   # steel
bb = io.BytesIO(); Image.fromarray(tex.astype(np.uint8)).save(bb, 'PNG')
f32 = lambda a: base64.b64encode(np.ascontiguousarray(a, dtype=np.float32).tobytes()).decode()
d['sword'] = {'p': f32(VB), 'n': f32(NB), 'uv': f32(np.array(UV)), 'i': base64.b64encode(np.array(I, np.uint16).ravel().tobytes()).decode(),
              'tex': 'data:image/png;base64,' + base64.b64encode(bb.getvalue()).decode(), 'handO': [0, 0, 0], 'handR': [1, 0, 0, 0, 1, 0, 0, 0, 1]}
json.dump(d, open('roran.json', 'w')); print('lance verts', len(V), 'tris', len(I))
