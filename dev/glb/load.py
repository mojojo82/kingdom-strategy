import struct, json, numpy as np, io
from PIL import Image
def load(path):
    b=open(path,'rb').read(); off=12; ch=[]
    while off<len(b):
        cl,ct=struct.unpack('<I4s',b[off:off+8]); ch.append(b[off+8:off+8+cl]); off+=8+cl
    J=json.loads(ch[0]); BIN=ch[1]
    def acc(i):
        a=J['accessors'][i]; bv=J['bufferViews'][a['bufferView']]; o=bv.get('byteOffset',0)+a.get('byteOffset',0)
        dt={5126:np.float32,5125:np.uint32,5123:np.uint16,5121:np.uint8}[a['componentType']]; n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
        return np.frombuffer(BIN,dtype=dt,count=a['count']*n,offset=o).reshape(a['count'],n) if n>1 else np.frombuffer(BIN,dtype=dt,count=a['count'],offset=o)
    p=J['meshes'][0]['primitives'][0]
    P=acc(p['attributes']['POSITION']).astype(np.float64); N=acc(p['attributes']['NORMAL']); UV=acc(p['attributes']['TEXCOORD_0']); I=acc(p['indices']).astype(np.int64).reshape(-1,3)
    mat=J['materials'][0]; imgs=[]
    for im in J['images']:
        bv=J['bufferViews'][im['bufferView']]; o=bv.get('byteOffset',0); imgs.append(Image.open(io.BytesIO(BIN[o:o+bv['byteLength']])).convert('RGB'))
    return J,P,N,UV,I,mat,imgs
