"""Writes the walker rig numbers (legs, gait) into test/index.html's walkerAnim.rig line. Hull px = (composite px - (72,161)) * 1000/1422.
python3 dev/ships/walker_rig_params.py"""
import json, re, math
D = "art/originals/ships/walker/"; K = 1000 / 1422
meta = json.load(open(D + "walker_rig.json"))
def hp(X, Y): return [round((X - 72) * K, 1), round((Y - 161) * K, 1)]
def blen(n): q = meta[n]["p"]; return math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1])
def ankle_y(g, ft): f = meta[ft]; return g - (f["h"] / meta["_ss"] - f["p"][0][1])
def leg(hip, g, th, sh, ft, ph, s, ext, side, near=0):
    hx, hy = hp(*hip); gy = hp(0, g)[1]; ay = ankle_y(gy, ft); d = ext * (blen(th) + blen(sh)); dx = math.sqrt(max(0, d * d - (ay - hy) ** 2))
    L = dict(hip=[hx, hy], ax=round(hx + side * dx, 1), g=gy, th=th, sh=sh, ft=ft, ph=ph, s=s)
    if near: L["near"] = 1
    return L
legs = [  # far legs first (behind); near legs splay outward like the design
    leg((505, 545), 835, "fth", "fsh", "fft", 0.5, 1, 0.86, -1),     # v1542: far knees bend outward too, so they fold up (not into the floor) in car mode
    leg((1045, 548), 835, "fth", "fsh", "fft", 0.75, -1, 0.86, 1),
    leg((430, 543), 862, "nth", "nsh", "nft", 0.0, 1, 0.93, -1, 1),
    leg((1105, 545), 862, "nth", "nsh", "nft", 0.25, -1, 0.93, 1, 1),
]
rig = dict(parts=meta, legs=legs, belly=hp(767, 468), carDrop=146, carFeet=14, drumR=77.5, T=2.6, duty=0.75, stride=40, lift=20, bob=2.5, hh=497)
p = "test/index.html"; s = open(p).read()
s, n = re.subn(r"walkerAnim\.rig = \{.*?\}; walkerAnim\.rig\.img", lambda m: "walkerAnim.rig = " + json.dumps(rig, separators=(",", ":")) + "; walkerAnim.rig.img", s, count=1, flags=re.S)
open(p, "w").write(s); print(n, [ (l["hip"], l["ax"]) for l in legs])
