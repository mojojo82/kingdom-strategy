import sys, json, io, base64, numpy as np; sys.dont_write_bytecode=True
sys.path.insert(0,'../glb')
import importlib.util
src=open('bake.py').read(); src=src[:src.index('J,BIN,walk,Tw,nw=bake')]   # reuse glb/acc/bake functions only
ns={}; exec(src,ns); glb,acc,bake=ns['glb'],ns['acc'],ns['bake']
from load import load
from PIL import Image
files=[('Sword Slash','../../art/originals/knight_rigged.glb')]   # Meshy's own walk/run were dropped for Mixamo's
anims={}; 
for name,f in files:
    J,BIN,fr,T,_=bake(f); anims[name]=(fr,T)
J,BIN=glb(files[0][1]); skin=J['skins'][0]; joints=skin['joints']; names=[J['nodes'][j]['name'] for j in joints]
hand=names.index('mixamorig:RightHand'); IBM=acc(J,BIN,skin['inverseBindMatrices']).reshape(-1,4,4).transpose(0,2,1)
Hinv=np.linalg.inv(IBM[hand]); O=Hinv[:3,3]; Rs=Hinv[:3,:3]; sc=np.linalg.norm(Rs,axis=0); Rh=Rs/sc
print('hand idx',hand,'bind origin (mesh space)',O.round(3),'bone scale',sc.round(4))
print('hand axes in mesh space (cols X,Y,Z):\n',Rh.round(2))
p=J['meshes'][0]['primitives'][0]; A=p['attributes']
P=acc(J,BIN,A['POSITION']).astype(np.float32); N=acc(J,BIN,A['NORMAL']).astype(np.float32); UV=acc(J,BIN,A['TEXCOORD_0']).astype(np.float32)
JI=acc(J,BIN,A['JOINTS_0']).astype(np.uint8); W=acc(J,BIN,A['WEIGHTS_0']).astype(np.float32); I=acc(J,BIN,p['indices']).astype(np.uint16).ravel()
def texof(J,BIN,mat):
    img=J['images'][J['textures'][mat['pbrMetallicRoughness']['baseColorTexture']['index']]['source']]; bv=J['bufferViews'][img['bufferView']]
    im=Image.open(io.BytesIO(BIN[bv.get('byteOffset',0):bv.get('byteOffset',0)+bv['byteLength']])).convert('RGB').resize((1024,1024),Image.LANCZOS); b=io.BytesIO(); im.save(b,'WEBP',quality=86,method=6)
    return 'data:image/webp;base64,'+base64.b64encode(b.getvalue()).decode()
ktex=texof(J,BIN,J['materials'][0])
# ---- the sword: the 2nd + 3rd biggest pieces of the sword-holding model ----
J2,P2,N2,UV2,I2,mat2,imgs2=load('../../art/originals/knight_with_sword.glb'); tr=np.load('troot.npy'); u,cnt=np.unique(tr,return_counts=True); order=u[np.argsort(-cnt)]
m=np.isin(tr,order[1:3]); Is=I2[m]; used=np.unique(Is); rm=-np.ones(len(P2),int); rm[used]=np.arange(len(used))
SP=P2[used]; SN=N2[used]; SUV=UV2[used]; SI=rm[Is].astype(np.uint16).ravel()
handle=P2[np.unique(I2[tr==order[1]])]                        # red handle piece
ax=np.linalg.svd(SP-SP.mean(0))[2][0]; ax=ax if np.dot(ax,[0,1,0])>0 else -ax  # blade direction (pointing up, away from the handle)
grip=handle[(handle-handle.mean(0))@ax > np.percentile((handle-handle.mean(0))@ax,55)].mean(0)  # upper part of the handle = where the fist is
L=SP-grip
# sword local frame: +Y = blade direction, X/Z = the two widths
y=ax; x=np.cross([0,0,1],y); x/=np.linalg.norm(x); z=np.cross(x,y); Rsw=np.stack([x,y,z],1)
SL=L@Rsw; SNl=SN@Rsw
print('sword tris',len(SI)//3,'length',round(float(SL[:,1].max()-SL[:,1].min()),3),'grip->tip',round(float(SL[:,1].max()),3))
stex=texof(J2['images'] and J2 or J2, None, mat2) if False else None
import struct
b=open('../../art/originals/knight_with_sword.glb','rb').read(); off=12; ch=[]
while off<len(b):
    cl,ct=struct.unpack('<I4s',b[off:off+8]); ch.append(b[off+8:off+8+cl]); off+=8+cl
stex=texof(J2,ch[1],mat2)
f32=lambda a: base64.b64encode(np.ascontiguousarray(a,dtype=np.float32).tobytes()).decode()
out={'p':f32(P),'n':f32(N),'uv':f32(UV),'j':base64.b64encode(JI.tobytes()).decode(),'w':f32(W),'i':base64.b64encode(I.tobytes()).decode(),'tex':ktex,'nj':len(joints),'hand':hand,
     'anims':{k:{'len':float(T),'frames':f32(fr[:,:,:3,:].transpose(0,1,3,2))} for k,(fr,T) in anims.items()},
     'sword':{'p':f32(SL),'n':f32(SNl),'uv':f32(SUV),'i':base64.b64encode(SI.tobytes()).decode(),'tex':stex,'handO':O.tolist(),'handR':Rh.T.ravel().tolist()}}
open('knight2.json','w').write(json.dumps(out)); print('json KB',len(json.dumps(out))//1024)
