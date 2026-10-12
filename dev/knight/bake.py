import struct, json, io, base64, sys, numpy as np
from PIL import Image
def glb(path):
    b=open(path,'rb').read(); off=12; ch=[]
    while off<len(b):
        cl,ct=struct.unpack('<I4s',b[off:off+8]); ch.append(b[off+8:off+8+cl]); off+=8+cl
    return json.loads(ch[0]), ch[1]
def acc(J,BIN,i):
    a=J['accessors'][i]; bv=J['bufferViews'][a['bufferView']]; o=bv.get('byteOffset',0)+a.get('byteOffset',0)
    dt={5126:np.float32,5125:np.uint32,5123:np.uint16,5121:np.uint8}[a['componentType']]; n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
    stride=bv.get('byteStride'); itemsz=np.dtype(dt).itemsize*n
    if stride and stride!=itemsz:
        raw=np.frombuffer(BIN,dtype=np.uint8,count=stride*a['count'],offset=o).reshape(a['count'],stride)[:,:itemsz].copy()
        arr=raw.view(dt).reshape(a['count'],n)
    else: arr=np.frombuffer(BIN,dtype=dt,count=a['count']*n,offset=o).reshape(a['count'],n)
    if a.get('normalized') and dt!=np.float32: arr=arr.astype(np.float32)/np.iinfo(dt).max
    return arr
def qmat(q):
    x,y,z,w=q; return np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])
def trs(t,r,s):
    M=np.eye(4); M[:3,:3]=qmat(r)*np.array(s)[None,:]; M[:3,3]=t; return M
def slerp(a,b,u):
    d=np.dot(a,b)
    if d<0: b=-b; d=-d
    if d>0.9995: r=a+(b-a)*u; return r/np.linalg.norm(r)
    th=np.arccos(d); return (np.sin((1-u)*th)*a+np.sin(u*th)*b)/np.sin(th)
def bake(path, fps=30):
    J,BIN=glb(path); nodes=J['nodes']; skin=J['skins'][0]; joints=skin['joints']
    IBM=acc(J,BIN,skin['inverseBindMatrices']).reshape(-1,4,4).transpose(0,2,1)  # column-major -> row-major
    parent={}
    for i,n in enumerate(nodes):
        for c in n.get('children',[]): parent[c]=i
    base={i:(np.array(n.get('translation',[0,0,0]),float),np.array(n.get('rotation',[0,0,0,1]),float),np.array(n.get('scale',[1,1,1]),float)) for i,n in enumerate(nodes)}
    an=J['animations'][0]; samp=[]
    for ch in an['channels']:
        s=an['samplers'][ch['sampler']]; samp.append((ch['target']['node'],ch['target']['path'],acc(J,BIN,s['input']).ravel(),acc(J,BIN,s['output']),s.get('interpolation','LINEAR')))
    T=max(s[2].max() for s in samp); nf=max(2,int(round(T*fps)))
    frames=[]
    for f in range(nf):
        t=f/nf*T; loc={i:[v.copy() for v in base[i]] for i in base}
        for node,path,inp,out,ip in samp:
            k=np.searchsorted(inp,t,side='right')-1; k=max(0,min(k,len(inp)-2)); u=0 if inp[k+1]==inp[k] else np.clip((t-inp[k])/(inp[k+1]-inp[k]),0,1)
            idx={'translation':0,'rotation':1,'scale':2}[path]
            if ip=='CUBICSPLINE': a=out[3*k+1]; bb=out[3*(k+1)+1]
            else: a=out[k]; bb=out[k+1]
            loc[node][idx]=slerp(a.astype(float),bb.astype(float),u) if path=='rotation' else a+(bb-a)*u
        G={}
        def glob(i):
            if i in G: return G[i]
            M=trs(*loc[i]); G[i]=(glob(parent[i])@M) if i in parent else M; return G[i]
        frames.append(np.stack([glob(j)@IBM[k] for k,j in enumerate(joints)]))
    return J,BIN,np.array(frames),T,an['name']
J,BIN,walk,Tw,nw=bake(sys.argv[1]); _,_,run,Tr,nr=bake(sys.argv[2])
p=J['meshes'][0]['primitives'][0]; A=p['attributes']
P=acc(J,BIN,A['POSITION']).astype(np.float32); N=acc(J,BIN,A['NORMAL']).astype(np.float32); UV=acc(J,BIN,A['TEXCOORD_0']).astype(np.float32)
JI=acc(J,BIN,A['JOINTS_0']).astype(np.uint8); W=acc(J,BIN,A['WEIGHTS_0']).astype(np.float32); I=acc(J,BIN,p['indices']).astype(np.uint16).ravel()
# rest-pose frame 0 of walking, to frame the camera
def skin(M):
    Mv=np.einsum('vk,vkij->vij',W,M[JI]); return np.einsum('vij,vj->vi',Mv[:,:3,:3],P)+Mv[:,:3,3]
S=skin(walk[0]); lo,hi=S.min(0),S.max(0); print('posed bbox',lo.round(3),hi.round(3))
mat=J['materials'][0]; img=J['images'][J['textures'][mat['pbrMetallicRoughness']['baseColorTexture']['index']]['source']]
bv=J['bufferViews'][img['bufferView']]; im=Image.open(io.BytesIO(BIN[bv.get('byteOffset',0):bv.get('byteOffset',0)+bv['byteLength']])).convert('RGB').resize((1024,1024),Image.LANCZOS)
b=io.BytesIO(); im.save(b,'WEBP',quality=86,method=6)
f32=lambda a: base64.b64encode(np.ascontiguousarray(a,dtype=np.float32).tobytes()).decode()
out={'p':f32(P),'n':f32(N),'uv':f32(UV),'j':base64.b64encode(JI.tobytes()).decode(),'w':f32(W),'i':base64.b64encode(I.tobytes()).decode(),
     'tex':'data:image/webp;base64,'+base64.b64encode(b.getvalue()).decode(),'nj':int(walk.shape[1]),'bbox':[lo.tolist(),hi.tolist()],
     'anims':{nw:{'len':float(Tw),'frames':f32(walk[:,:,:3,:].transpose(0,1,3,2))},nr:{'len':float(Tr),'frames':f32(run[:,:,:3,:].transpose(0,1,3,2))}}}
open('knight.json','w').write(json.dumps(out)); print('frames',walk.shape,run.shape,'json KB',len(json.dumps(out))//1024)
