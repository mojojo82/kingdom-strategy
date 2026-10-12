# Packs game_frames/ into the in-game Gareth assets (phone size = 2x the old pixel sheet) and prints the numbers for test/index.html.
# Outputs: gareth_game.webp (sheet), gareth_lunge.webp (HERO_CHARGE image), gareth_game.json (all numbers).
import glob, json, base64, numpy as np
from PIL import Image, ImageOps
W, AX, AY = 1052, 526, 670                 # render width, feet anchor in the render (world x=0 -> centre, feet on the ground line)
PPU = (670 - 119) / 2.3                     # render px per world unit (feet to helmet top)
S2 = 2 * 61 / 551                           # render px -> sheet px (old pixel Gareth's figure was ~61 px; new is 2x that)
ROWS = [('idle', 'Idleready', 8), ('run', 'MixamoRun', 16), ('attack', 'MixamoSlash', 11), ('hit', 'MixamoHit', 10), ('charge', 'Charge', 2), ('hop', 'Hop', 9)]
def mir(f): return ImageOps.mirror(Image.open(f).convert('RGBA'))
bb = None
for _, n, k in ROWS:
    for i in range(k):
        b = mir(f'game_frames/{n}_{i:02d}.png').getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
        bb = b if bb is None else (min(bb[0], b[0]), min(bb[1], b[1]), max(bb[2], b[2]), max(bb[3], b[3]))
L, U, R, D = bb[0] - 4, bb[1] - 4, bb[2] + 4, max(bb[3], AY) + 3
cw, ch = round((R - L) * S2), round((D - U) * S2)
sheet = Image.new('RGBA', (cw * 16, ch * len(ROWS)))
for r, (_, n, k) in enumerate(ROWS):
    for i in range(k):
        sheet.paste(mir(f'game_frames/{n}_{i:02d}.png').crop((L, U, R, D)).resize((cw, ch), Image.LANCZOS), (i * cw, r * ch))
sheet.save('gareth_game.webp', quality=84, method=6)
ax, ay = (AX - L) * S2, (AY - U) * S2
FIG = 551 * S2                                          # figure height in sheet px
SIZE_MUL = 0.75; OLD_FIG_UNITS = 61 / 65.62 * 34.8 * 0.75   # old figure height on screen (game units at scale 1)
dispH = OLD_FIG_UNITS * ch / (FIG * SIZE_MUL)           # same on-screen height as the old Gareth
# lunge (charge pose) on its own
lf = mir('game_frames/Charge_02.png'); lb = lf.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
lL, lU, lR, lD = lb[0] - 4, lb[1] - 4, lb[2] + 4, lb[3] + 4
lunge = lf.crop((lL, lU, lR, lD)); lw, lh = round((lR - lL) * S2), round((lD - lU) * S2); lunge.resize((lw, lh), Image.LANCZOS).save('gareth_lunge.webp', quality=86, method=6)
# sword tip from the 3D data (world y up, z forward -> sheet px right / up of the feet anchor)
d = json.load(open('knight3.json')); NJ = d['nj']; hand = d['hand']; Sw = d['sword']
P = np.frombuffer(base64.b64decode(Sw['p']), dtype=np.float32).reshape(-1, 3)
def vrot(rx, ry, rz):
    a, b, c = np.radians([rx, ry, rz]); X = np.array([[1,0,0],[0,np.cos(a),-np.sin(a)],[0,np.sin(a),np.cos(a)]]); Y = np.array([[np.cos(b),0,np.sin(b)],[0,1,0],[-np.sin(b),0,np.cos(b)]]); Z = np.array([[np.cos(c),-np.sin(c),0],[np.sin(c),np.cos(c),0],[0,0,1]])
    return Z @ Y @ X
tipB = np.array(Sw['handO']) + np.array(Sw['handR']).reshape(3, 3).T @ vrot(0, 90, -90) @ (P[np.argmax(P[:, 1])] * 2.43)
def tip(anim, t):
    A = d['anims'][anim]; F = np.frombuffer(base64.b64decode(A['frames']), dtype=np.float32).reshape(-1, NJ, 4, 3)
    M = F[min(len(F) - 1, int(round(t / A['len'] * len(F))))][hand].T; p = M[:, :3] @ tipB + M[:, 3]
    return np.array([p[2] * PPU * S2, -p[1] * PPU * S2])   # sheet px from the feet anchor (x right = forward, y down)
lt = tip('Charge', 0.5)
# slash swoosh: circle through the tip's path over the strike (attack frames 3 -> 6, t 0.44 -> 0.70)
ts = np.linspace(0.44, 0.70, 9); pts = np.array([tip('Mixamo Slash', t) for t in ts])
Aq = np.c_[2 * pts, np.ones(len(pts))]; bq = (pts ** 2).sum(1); cx, cy, c0 = np.linalg.lstsq(Aq, bq, rcond=None)[0]; Rr = np.sqrt(c0 + cx * cx + cy * cy)
ang = np.unwrap(np.arctan2(pts[:, 1] - cy, pts[:, 0] - cx))
out = {'cw': cw, 'ch': ch, 'ax': round(ax, 2), 'ay': round(ay, 2), 'dispH': round(dispH, 2), 'sizeMul': SIZE_MUL,
       'rows': {k: [r, n] for r, (k, _, n) in enumerate(ROWS)},
       'slash': {'from': 3, 'to': 6.6, 'cx': round(cx, 1), 'cy': round(cy, 1), 'R': round(Rr * 0.92, 1), 'w': round(11 * FIG / 61, 1), 'a0': round(ang[0], 2), 'a1': round(ang[-1], 2)},
       'lunge': {'w': lw, 'h': lh, 'ax': round((AX - lL) * S2, 1), 'ay': round((AY - lU) * S2, 1), 'tipx': round(lt[0], 1), 'tipy': round(lt[1], 1), 'k': round(dispH / ch, 4)}}
json.dump(out, open('gareth_game.json', 'w'), indent=1); print(json.dumps(out))
import os; print('sheet', sheet.size, os.path.getsize('gareth_game.webp'), 'bytes; lunge', (lw, lh), os.path.getsize('gareth_lunge.webp'))
