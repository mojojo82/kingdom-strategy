# Blackwatch II as a code-built march model (Harley 18 Nov 2026: "try to do a model like blackwatch 2"). Bow -X, stern +X.
# Ref: art/originals/ships/blackwatch/blackwatch2_back.png - dark gunmetal armoured hull, wedge bow, engine drum at the stern, long octagonal
# window frame down each side, clamps on the top edge, turret, rear tower with antennas + dish + stack, cyan light strips, vents.
import sys; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from kit import Model
m = Model({'g0': '7a8089', 'g1': '5d636b', 'g2': '454a52', 'g3': '30343a', 'g4': '23262b', 'edge': '858b94', 'cyan': '6ff4ff', 'win': '0f1317', 'rust': '6b5a4a'})
# --- main hull: long, tapering to a wedge bow at -x ---
m.sections([(-1.05, 0.0, 0.0, 0.02, -0.02), (-0.80, 0.11, 0.07, 0.08, -0.14), (-0.45, 0.20, 0.15, 0.13, -0.22), (0.55, 0.22, 0.17, 0.14, -0.24), (0.80, 0.21, 0.16, 0.14, -0.23)], 'g2')
# upper band (narrower, the top deck level)
m.sections([(-0.72, 0.09, 0.11, 0.16, 0.12), (-0.40, 0.16, 0.19, 0.20, 0.13), (0.62, 0.17, 0.20, 0.21, 0.14)], 'g1')
# keel / lower armour (darker)
m.sections([(-0.85, 0.06, 0.02, -0.08, -0.14), (-0.45, 0.15, 0.08, -0.16, -0.27), (0.70, 0.17, 0.10, -0.17, -0.28)], 'g3')
# --- side armour: the long octagonal window frame (raised bars) with a dark recessed opening ---
Z = 0.205
oct_pts = [(-0.55, 0.03), (-0.45, 0.12), (0.30, 0.12), (0.40, 0.03), (0.30, -0.06), (-0.45, -0.06)]
for i in range(len(oct_pts)):
    a, b = oct_pts[i], oct_pts[(i + 1) % len(oct_pts)]; m.bar(a, b, 0.045, 0.03, Z - 0.005, 'g0', mirror=True)
m.part([[x, y, Z + 0.003] for x, y in [(-0.52, 0.03), (-0.44, 0.10), (0.29, 0.10), (0.37, 0.03), (0.29, -0.04), (-0.44, -0.04)]] + [[x, y, Z - 0.01] for x, y in [(-0.52, 0.03), (-0.44, 0.10), (0.29, 0.10), (0.37, 0.03), (0.29, -0.04), (-0.44, -0.04)]], 'win', mirror=True)
# clamps across the top edge, each with a cyan light
for x in (-0.30, -0.10, 0.10, 0.30):
    m.box([x, 0.15, Z - 0.005], [0.075, 0.10, 0.055], 'g1', bev=0.012, mirror=True)
    m.box([x, 0.13, Z + 0.016], [0.035, 0.012, 0.006], 'cyan', mirror=True)
# lower angled plates with light strips
for (x0, x1) in ((-0.62, -0.20), (-0.15, 0.30), (0.34, 0.70)):
    m.bar((x0, -0.12), (x1, -0.12), 0.06, 0.022, Z - 0.03, 'g2', mirror=True)
    m.box([(x0 + x1) / 2, -0.12, Z - 0.005], [0.10, 0.012, 0.006], 'cyan', mirror=True)
m.bar((-0.78, 0.04), (-0.58, 0.04), 0.05, 0.02, 0.13, 'g1', mirror=True)          # bow plate
m.box([-0.70, 0.0, 0.142], [0.07, 0.012, 0.006], 'cyan', mirror=True)
# stern block + vents
m.box([0.62, 0.0, 0], [0.30, 0.34, 0.42], 'g2', bev=0.03)
for i in range(4): m.part([[0.52 + i * 0.045, -0.06, 0.212], [0.55 + i * 0.045, -0.06, 0.212], [0.50 + i * 0.045, -0.18, 0.212], [0.53 + i * 0.045, -0.18, 0.212], [0.52 + i * 0.045, -0.06, 0.20], [0.55 + i * 0.045, -0.06, 0.20], [0.50 + i * 0.045, -0.18, 0.20], [0.53 + i * 0.045, -0.18, 0.20]], 'g4', mirror=True)
for y in (0.04, 0.08, 0.12): m.box([0.74, y, 0.212], [0.012, 0.025, 0.006], 'cyan', mirror=True)
# --- engine drum at the stern ---
m.cyl([0.76, -0.02, 0], [0.98, -0.02, 0], 0.17, 'g3', 14)
m.cyl([0.80, -0.02, 0], [0.86, -0.02, 0], 0.185, 'edge', 14)
m.cyl([0.92, -0.02, 0], [0.96, -0.02, 0], 0.18, 'g1', 14)
m.cyl([0.98, -0.02, 0], [1.01, -0.02, 0], 0.12, 'cyan', 14)
# --- rear tower: stepped, cyan windows, mast + antennas, dish, stack ---
m.box([0.50, 0.25, 0], [0.30, 0.10, 0.26], 'g1', bev=0.02)
m.box([0.53, 0.33, 0], [0.20, 0.08, 0.20], 'g2', bev=0.015)
m.box([0.40, 0.335, 0.101], [0.08, 0.02, 0.006], 'cyan', mirror=True); m.box([0.355, 0.25, 0], [0.006, 0.02, 0.14], 'cyan')
m.cyl([0.58, 0.37, 0.03], [0.58, 0.62, 0.03], 0.016, 'g3', 6); m.cyl([0.58, 0.45, 0.03], [0.58, 0.50, 0.03], 0.03, 'g2', 8)
m.cyl([0.52, 0.37, -0.05], [0.52, 0.55, -0.05], 0.012, 'g3', 6)
m.cyl([0.66, 0.30, 0.07], [0.66, 0.42, 0.07], 0.035, 'g3', 10); m.cyl([0.66, 0.42, 0.07], [0.66, 0.45, 0.07], 0.045, 'g2', 10)   # stack
m.cyl([0.46, 0.37, -0.06], [0.46, 0.42, -0.06], 0.012, 'g3', 6)
m.cyl([0.44, 0.44, -0.06], [0.40, 0.48, -0.06], 0.012, 'g1', 10, r2=0.07)       # dish (a shallow cone, tilted forward)
# --- turret, middle-front on the top deck ---
m.box([-0.12, 0.23, 0], [0.22, 0.05, 0.18], 'g3', bev=0.012)
m.part([[-0.22, 0.25, 0.08], [-0.22, 0.25, -0.08], [0.02, 0.25, 0.09], [0.02, 0.25, -0.09], [-0.18, 0.33, 0.06], [-0.18, 0.33, -0.06], [0.0, 0.34, 0.07], [0.0, 0.34, -0.07]], 'g1')
m.box([-0.09, 0.345, 0], [0.12, 0.012, 0.11], 'edge')
m.cyl([-0.20, 0.29, 0], [-0.45, 0.30, 0], 0.022, 'g2', 8); m.cyl([-0.43, 0.30, 0], [-0.47, 0.30, 0], 0.03, 'g4', 8)
# raised spine plate along the top, angled ends
m.part([[-0.50, 0.20, 0.10], [-0.50, 0.20, -0.10], [0.35, 0.21, 0.12], [0.35, 0.21, -0.12], [-0.42, 0.235, 0.07], [-0.42, 0.235, -0.07], [0.30, 0.245, 0.09], [0.30, 0.245, -0.09]], 'g2')
for x in (-0.36, -0.22): m.box([x, 0.24, 0.07], [0.06, 0.01, 0.006], 'cyan', mirror=True)
# layered bow plates (upper lighter wedge, lower dark wedge), like the painting's converging armour
m.part([[-1.00, 0.03, 0.0], [-0.70, 0.10, 0.10], [-0.70, 0.10, -0.10], [-0.70, 0.13, 0.08], [-0.70, 0.13, -0.08], [-0.55, 0.14, 0.15], [-0.55, 0.14, -0.15], [-0.55, 0.17, 0.12], [-0.55, 0.17, -0.12]], 'g1')
m.part([[-1.00, -0.02, 0.0], [-0.72, -0.12, 0.07], [-0.72, -0.12, -0.07], [-0.55, -0.19, 0.13], [-0.55, -0.19, -0.13], [-0.72, -0.05, 0.11], [-0.72, -0.05, -0.11], [-0.55, -0.06, 0.18], [-0.55, -0.06, -0.18]], 'g3')
# plate seams (dark vertical bars) between hull plates
for x in (-0.62, 0.45): m.bar((x, -0.10), (x, 0.11), 0.014, 0.012, 0.20, 'g4', mirror=True)
# small cyan strips on the upper band near the front
m.box([-0.50, 0.15, 0.17], [0.06, 0.01, 0.006], 'cyan', mirror=True)
print('faces', m.save(sys.argv[1]))
