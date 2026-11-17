# Shared shape kit for code-built march models: every part is a convex shape (hull of points) with one flat colour. Bow points -X, up = +Y.
import numpy as np
from scipy.spatial import ConvexHull
class Model:
    def __init__(self, palette): self.P = []; self.C = []; self.pal = {k: self.hx(v) for k, v in palette.items()}
    @staticmethod
    def hx(h): h = h.lstrip('#'); return [int(h[i:i + 2], 16) for i in (0, 2, 4)]
    def part(self, pts, col, mirror=False):
        pts = np.asarray(pts, float)
        for P in ([pts] + ([pts * [1, 1, -1]] if mirror else [])):
            h = ConvexHull(P); c = P.mean(0)
            for s in h.simplices:
                a, b, d = P[s]; n = np.cross(b - a, d - a)
                if np.dot(n, a - c) < 0: b, d = d, b
                self.P.append([a, b, d]); self.C.append(self.pal[col])
    def box(self, c, s, col, bev=0.0, mirror=False):
        c = np.array(c, float); s = np.array(s, float) / 2; pts = []
        for sx in (-1, 1):
            for sy in (-1, 1):
                for sz in (-1, 1):
                    v = s * [sx, sy, sz]
                    if bev <= 0: pts.append(c + v); continue
                    for k in range(3):
                        w = v.copy(); w[(k + 1) % 3] -= np.sign(w[(k + 1) % 3]) * bev; w[(k + 2) % 3] -= np.sign(w[(k + 2) % 3]) * bev; pts.append(c + w)
        self.part(pts, col, mirror)
    def cyl(self, a, b, r, col, seg=10, r2=None, mirror=False):
        a = np.array(a, float); b = np.array(b, float); ax = b - a; ax /= np.linalg.norm(ax)
        u = np.cross(ax, [0, 1, 0] if abs(ax[1]) < 0.9 else [1, 0, 0]); u /= np.linalg.norm(u); v = np.cross(ax, u); r2 = r if r2 is None else r2
        pts = [p + (u * np.cos(t) + v * np.sin(t)) * rr for p, rr in ((a, r), (b, r2)) for t in np.linspace(0, 2 * np.pi, seg, endpoint=False)]
        self.part(pts, col, mirror)
    def sections(self, secs, col, mirror=False):
        pts = []
        for x, wt, wb, yt, yb in secs: pts += [[x, yt, wt], [x, yt, -wt], [x, yb, wb], [x, yb, -wb]]
        self.part(pts, col, mirror)
    def bar(self, a, b, th, dep, z, col, mirror=False):
        """a flat bar on the side of the ship (plane z), from 2D point a to b (x,y), thickness th, standing out dep from z"""
        a = np.array(a, float); b = np.array(b, float); d = b - a; n = np.array([-d[1], d[0]]) / (np.linalg.norm(d) + 1e-9) * th / 2; pts = []
        for p in (a + n, a - n, b + n, b - n):
            pts += [[p[0], p[1], z], [p[0], p[1], z + dep]]
        self.part(pts, col, mirror)
    def save(self, path):
        P = np.array(self.P); C = np.array(self.C, np.uint8); np.savez(path, pos=P.reshape(-1, 3), col=C, n=len(P)); return len(P)
