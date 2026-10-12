# Sword path for the game's attack row (for slash effects): blade tip + a point 35% up the blade, in game-sheet px from the feet anchor,
# 8 samples per attack frame (frame f -> the animation time listed in jobs_game.json, linear in between). Writes slash_path.json.
import json, base64, numpy as np
d = json.load(open('knight3.json')); NJ = d['nj']; hand = d['hand']; Sw = d['sword']
P = np.frombuffer(base64.b64decode(Sw['p']), dtype=np.float32).reshape(-1, 3)
def vrot(rx, ry, rz):
    a, b, c = np.radians([rx, ry, rz]); X = np.array([[1,0,0],[0,np.cos(a),-np.sin(a)],[0,np.sin(a),np.cos(a)]]); Y = np.array([[np.cos(b),0,np.sin(b)],[0,1,0],[-np.sin(b),0,np.cos(b)]]); Z = np.array([[np.cos(c),-np.sin(c),0],[np.sin(c),np.cos(c),0],[0,0,1]])
    return Z @ Y @ X
G = np.array(Sw['handR']).reshape(3, 3).T @ vrot(0, 90, -90); O = np.array(Sw['handO'])
tipL = P[np.argmax(P[:, 1])] * 2.43; tipB = O + G @ tipL; midB = O + G @ (tipL * 0.35)
PPU = (670 - 119) / 2.3; S2 = 2 * 61 / 551
A = d['anims']['Mixamo Slash']; F = np.frombuffer(base64.b64decode(A['frames']), dtype=np.float32).reshape(-1, NJ, 4, 3)
def at(t):
    x = t / A['len'] * len(F); i = int(np.floor(x)) % len(F); j = (i + 1) % len(F); u = x - np.floor(x)
    M = (F[i][hand] * (1 - u) + F[j][hand] * u).T; f = lambda p: M[:, :3] @ p + M[:, 3]
    tp, mp = f(tipB), f(midB); return [round(float(tp[2] * PPU * S2), 1), round(float(-tp[1] * PPU * S2), 1), round(float(mp[2] * PPU * S2), 1), round(float(-mp[1] * PPU * S2), 1)]
T = json.load(open('jobs_game.json'))['Mixamo Slash'] + [1.5]   # frame 11 = back to the start
pts = [at(T[int(k / 8)] * (1 - (k / 8 - int(k / 8))) + T[int(k / 8) + 1] * (k / 8 - int(k / 8))) for k in range(11 * 8)]
json.dump({'perFrame': 8, 'pts': pts}, open('slash_path.json', 'w')); print(len(pts), 'samples')
