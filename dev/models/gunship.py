# Code-built march ship (Harley 17 Nov 2026: "Are you able to create that level of detail model just in code" -> "Yes make it").
# Hard-surface style: every part is a convex shape (hull of points), one flat colour per part. Bow points -X (game convention), up = +Y.
# Output: npz { pos (corners, 3 per face), col (rgb 0-255 per face) }.  python3 dev/models/gunship.py OUT.npz
import numpy as np, sys
from scipy.spatial import ConvexHull
F_P = []; F_C = []
def hex2(h): h = h.lstrip('#'); return [int(h[i:i + 2], 16) for i in (0, 2, 4)]
C = { 'navy': hex2('2b3a78'), 'navy2': hex2('3c4fa0'), 'navyD': hex2('1b2552'), 'gold': hex2('e0a640'), 'goldD': hex2('a8711f'), 'bronze': hex2('c98a3a'),
      'steel': hex2('8e98ad'), 'steelD': hex2('4f586b'), 'cyan': hex2('5ff2ff'), 'glass': hex2('2fb7d6'), 'red': hex2('d8423a'), 'white': hex2('e9eef6'), 'black': hex2('151a26') }
def part(pts, col, mirror=False):
    pts = np.asarray(pts, float)
    for P in ([pts] + ([pts * [1, 1, -1]] if mirror else [])):
        h = ConvexHull(P); c = P.mean(0)
        for s in h.simplices:
            a, b, d = P[s]; n = np.cross(b - a, d - a)
            if np.dot(n, a - c) < 0: b, d = d, b
            F_P.append([a, b, d]); F_C.append(C[col] if isinstance(col, str) else col)
def box(c, s, col, bev=0.0, mirror=False):
    c = np.array(c, float); s = np.array(s, float) / 2; pts = []
    for sx in (-1, 1):
        for sy in (-1, 1):
            for sz in (-1, 1):
                if bev <= 0: pts.append(c + s * [sx, sy, sz]); continue
                for k in range(3):
                    v = s * [sx, sy, sz]; v[k] -= np.sign(v[k]) * bev; v2 = s * [sx, sy, sz]; v2[(k + 1) % 3] -= np.sign(v2[(k + 1) % 3]) * bev; v2[(k + 2) % 3] -= np.sign(v2[(k + 2) % 3]) * bev
                    pts.append(c + v2)
    part(pts, col, mirror)
def cyl(a, b, r, col, seg=10, r2=None, mirror=False):
    a = np.array(a, float); b = np.array(b, float); ax = b - a; ax /= np.linalg.norm(ax)
    u = np.cross(ax, [0, 1, 0] if abs(ax[1]) < 0.9 else [1, 0, 0]); u /= np.linalg.norm(u); v = np.cross(ax, u); r2 = r if r2 is None else r2
    pts = [p + (u * np.cos(t) + v * np.sin(t)) * rr for p, rr in ((a, r), (b, r2)) for t in np.linspace(0, 2 * np.pi, seg, endpoint=False)]
    part(pts, col, mirror)
def sections(secs, col):
    # secs: [(x, half-width top, half-width bottom, y top, y bottom)] - a tapered hull piece through these cross-sections
    pts = []
    for x, wt, wb, yt, yb in secs: pts += [[x, yt, wt], [x, yt, -wt], [x, yb, wb], [x, yb, -wb]]
    part(pts, col)
# ---------------- the ship ----------------
# lower hull (keel), navy, pointed bow at -x
sections([(-0.95, 0.02, 0.0, 0.02, -0.10), (-0.70, 0.17, 0.08, 0.06, -0.20), (-0.30, 0.27, 0.15, 0.08, -0.26), (0.40, 0.29, 0.17, 0.08, -0.26), (0.78, 0.25, 0.14, 0.08, -0.20)], 'navy')
# gold armour belt along both sides (3 plates each, slightly proud of the hull)
for x0, x1 in ((-0.62, -0.30), (-0.26, 0.14), (0.18, 0.62)):
    sections([(x0, 0.0, 0.0, 0, 0)], 'gold') if False else None
    xs = (x0, x1); w0 = 0.17 + (x0 + 0.95) * 0.12 if x0 < -0.3 else 0.285; w1 = min(0.30, 0.17 + (x1 + 0.95) * 0.12) if x1 < -0.3 else 0.30
    part([[x0, 0.07, w0 - 0.01], [x1, 0.07, w1 - 0.01], [x0, -0.10, w0 - 0.04], [x1, -0.10, w1 - 0.04], [x0 + 0.02, 0.06, w0 + 0.025], [x1 - 0.02, 0.06, w1 + 0.025], [x0 + 0.02, -0.08, w0], [x1 - 0.02, -0.08, w1]], 'gold', mirror=True)
# ram prow: gold wedge + steel spikes
part([[-1.05, -0.02, 0], [-0.80, 0.06, 0.10], [-0.80, 0.06, -0.10], [-0.80, -0.14, 0.06], [-0.80, -0.14, -0.06], [-0.70, 0.08, 0.14], [-0.70, 0.08, -0.14]], 'gold')
cyl([-0.86, 0.02, 0.09], [-1.0, 0.0, 0.16], 0.025, 'steel', 6, r2=0.003, mirror=True)
# main deck plate
sections([(-0.70, 0.16, 0.16, 0.10, 0.07), (-0.30, 0.26, 0.26, 0.11, 0.07), (0.45, 0.28, 0.28, 0.11, 0.07), (0.80, 0.24, 0.24, 0.10, 0.07)], 'navy2')
# superstructure: stepped citadel
box([0.18, 0.20, 0], [0.62, 0.18, 0.34], 'navy', bev=0.025)
part([[0.10, 0.29, 0.13], [0.10, 0.29, -0.13], [0.52, 0.29, 0.14], [0.52, 0.29, -0.14], [0.20, 0.45, 0.11], [0.20, 0.45, -0.11], [0.50, 0.45, 0.12], [0.50, 0.45, -0.12]], 'navy2')
part([[0.22, 0.45, 0.10], [0.22, 0.45, -0.10], [0.48, 0.45, 0.11], [0.48, 0.45, -0.11], [0.27, 0.53, 0.08], [0.27, 0.53, -0.08], [0.46, 0.53, 0.09], [0.46, 0.53, -0.09]], 'gold')
box([0.37, 0.545, 0], [0.16, 0.03, 0.15], 'goldD', bev=0.01)
# bridge windows (glowing cyan strip) front + sides
part([[0.145, 0.33, 0.115], [0.145, 0.33, -0.115], [0.195, 0.43, 0.10], [0.195, 0.43, -0.10], [0.155, 0.33, 0.115], [0.155, 0.33, -0.115], [0.205, 0.43, 0.10], [0.205, 0.43, -0.10]], 'glass')
box([0.34, 0.39, 0.128], [0.24, 0.04, 0.012], 'glass', mirror=True)
box([-0.08, 0.21, 0.172], [0.06, 0.05, 0.012], 'cyan', mirror=True); box([0.06, 0.21, 0.172], [0.06, 0.05, 0.012], 'cyan', mirror=True)
# gold trim lines on the citadel
box([0.18, 0.293, 0.172], [0.62, 0.012, 0.01], 'gold', mirror=True)
# mast + antenna + red beacon
cyl([0.42, 0.56, 0], [0.42, 0.80, 0], 0.013, 'steel', 6); box([0.42, 0.72, 0], [0.02, 0.012, 0.18], 'steel'); box([0.42, 0.815, 0], [0.035, 0.035, 0.035], 'red'); cyl([0.30, 0.56, 0], [0.30, 0.64, 0], 0.035, 'steelD', 8, r2=0.05)
# front turret: base, housing, twin barrels
cyl([-0.38, 0.11, 0], [-0.38, 0.17, 0], 0.125, 'steelD', 14)
part([[-0.50, 0.17, 0.11], [-0.50, 0.17, -0.11], [-0.25, 0.17, 0.12], [-0.25, 0.17, -0.12], [-0.46, 0.28, 0.085], [-0.46, 0.28, -0.085], [-0.28, 0.29, 0.10], [-0.28, 0.29, -0.10]], 'gold')
box([-0.35, 0.295, 0], [0.12, 0.012, 0.17], 'goldD')
for z in (0.05, -0.05): cyl([-0.48, 0.225, z], [-0.78, 0.235, z], 0.028, 'steel', 8); cyl([-0.74, 0.234, z], [-0.80, 0.236, z], 0.037, 'navyD', 8)
# side cannon sponsons (gold housings with short barrels), both sides
for x in (-0.12, 0.52):
    box([x, 0.06, 0.30], [0.12, 0.08, 0.06], 'goldD', bev=0.012, mirror=True); cyl([x - 0.03, 0.06, 0.33], [x - 0.03, 0.06, 0.40], 0.018, 'steel', 6, mirror=True)
# rear engines: twin nacelles + glowing exhausts
for z in (0.17, -0.17):
    cyl([0.50, 0.04, z], [0.98, 0.05, z], 0.085, 'navy', 12); cyl([0.62, 0.04, z], [0.92, 0.05, z], 0.092, 'gold', 12, r2=0.090)
    cyl([0.98, 0.05, z], [1.02, 0.05, z], 0.07, 'cyan', 12)
    cyl([0.55, 0.04, z], [0.60, 0.04, z], 0.095, 'steelD', 12)
# tail fins (red with gold edge), angled outwards
for s in (1, -1):
    part([[0.62, 0.30, 0.12 * s], [0.86, 0.30, 0.15 * s], [0.92, 0.52, 0.22 * s], [0.80, 0.52, 0.20 * s], [0.62, 0.30, 0.10 * s], [0.86, 0.30, 0.13 * s], [0.92, 0.52, 0.20 * s], [0.80, 0.52, 0.18 * s]], 'red')
    part([[0.80, 0.52, 0.20 * s], [0.92, 0.52, 0.22 * s], [0.80, 0.55, 0.20 * s], [0.93, 0.55, 0.22 * s], [0.80, 0.52, 0.18 * s], [0.92, 0.52, 0.20 * s]], 'gold')
box([0.72, 0.18, 0], [0.30, 0.14, 0.26], 'navy2', bev=0.02)   # engine block between the fins
# hover skirt glow under the hull (cyan rim, sits at the waterline)
sections([(-0.55, 0.13, 0.11, -0.24, -0.27), (0.60, 0.22, 0.19, -0.24, -0.27)], 'cyan')
# gold rail along the deck edge
for (xa, wa), (xb, wb) in zip([(-0.70, 0.16), (-0.30, 0.26), (0.45, 0.28)], [(-0.30, 0.26), (0.45, 0.28), (0.80, 0.24)]):
    part([[xa, 0.11, wa], [xb, 0.11, wb], [xa, 0.135, wa], [xb, 0.135, wb], [xa, 0.11, wa - 0.02], [xb, 0.11, wb - 0.02], [xa, 0.135, wa - 0.02], [xb, 0.135, wb - 0.02]], 'gold', mirror=True)
# dark waterline stripe
sections([(-0.62, 0.155, 0.15, -0.12, -0.17), (0.70, 0.235, 0.23, -0.12, -0.17)], 'navyD')
# deck vents + hatches
for x in (-0.16, -0.06): box([x, 0.125, 0.10], [0.06, 0.02, 0.07], 'navyD', mirror=True)
box([-0.62, 0.115, 0], [0.08, 0.015, 0.10], 'goldD')
# missile pod on the engine block (4 tubes)
box([0.74, 0.30, 0], [0.16, 0.08, 0.16], 'steelD', bev=0.012)
for dz in (-0.04, 0.04):
    for dy in (0.28, 0.32): cyl([0.66, dy, dz], [0.65, dy, dz], 0.016, 'red', 6)
# side hull portholes (cyan)
for x in (-0.40, -0.25, 0.30, 0.45): box([x, 0.0, 0.285], [0.035, 0.03, 0.012], 'cyan', mirror=True)
P = np.array(F_P); Cc = np.array(F_C, np.uint8)
np.savez(sys.argv[1], pos=P.reshape(-1, 3), col=Cc, n=len(P)); print('faces', len(P))
