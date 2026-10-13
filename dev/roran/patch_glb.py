# Writes roran_game.glb = art/originals/roran_rigged.glb with the same mesh fixes the preview uses (bake_roran.py):
# hair/head verts fully on the Head bone (HEADFIX) and the finger verts curled into fists (FIST). For the Blender renders.
import json, struct, numpy as np
src = open('bake_roran.py').read(); src = src[:src.index('f32=lambda')]; ns = {}; exec(src, ns)
P, N, JI, W = ns['P'], ns['N'], ns['JI'], ns['W']
b = bytearray(open('../../art/originals/roran_rigged.glb', 'rb').read()); L = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20+L]); BIN0 = 20 + L + 8
pa = j['meshes'][0]['primitives'][0]['attributes']
def put(key, arr, dt):
    a = j['accessors'][pa[key]]; bv = j['bufferViews'][a['bufferView']]; off = BIN0 + bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    raw = np.ascontiguousarray(arr, dtype=dt).tobytes(); assert bv.get('byteStride') in (None, 0) and len(raw) <= bv['byteLength']; b[off:off+len(raw)] = raw
put('POSITION', P, np.float32); put('NORMAL', N, np.float32); put('JOINTS_0', JI, np.uint8); put('WEIGHTS_0', W, np.float32)
a = j['accessors'][pa['POSITION']]; a['min'] = P.min(0).tolist(); a['max'] = P.max(0).tolist()
js = json.dumps(j, separators=(',', ':')).encode(); js += b' ' * ((4 - len(js) % 4) % 4)
out = b[:12] + struct.pack('<I4s', len(js), b'JSON') + js + b[20+L:]
out[8:12] = struct.pack('<I', len(out)); open('roran_game.glb', 'wb').write(out); print('roran_game.glb', len(out))
