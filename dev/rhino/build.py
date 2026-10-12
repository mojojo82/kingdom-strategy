# rigid parts for the mech rhino: per-triangle part id, pivots, texture -> rhino.json
import sys, io, json, base64, numpy as np
sys.path.insert(0,'/home/claude/kingdom-strategy/dev/glb')
from load import load
from PIL import Image
J,P,N,UV,I,mat,imgs=load(sys.argv[1] if len(sys.argv)>1 else '../../art/originals/rhino_mech_lowpoly.glb'); T=I.reshape(-1,3); C=P[T].mean(1); x,y,z=C[:,0],C[:,1],C[:,2]
NAMES=['body','cannonL','cannonR','head','FLup','FLlo','FRup','FRlo','BLup','BLlo','BRup','BRlo']
lab=np.zeros(len(T),int)
can=(z<-0.33)&(y>0.2); lab[can&(x<-0.05)]=1; lab[can&(x>=-0.05)]=2
lab[(z>0.42)&(lab==0)]=3
low=y<-0.28
for side,(fu,bu) in ((x>0,(4,8)),(x<=0,(6,10))):
    for zz,b in (((z>-0.25)&(z<0.42),fu),((z<-0.35),bu)):
        m=low&side&zz&(lab==0); lab[m&(y>=-0.44)]=b; lab[m&(y<-0.44)]=b+1
def pv(mask, how):
    pts=P[T[mask]].reshape(-1,3)
    if how=='top': return [float(pts[:,0].mean()), float(pts[:,1].max()), float(pts[:,2].mean())]
    if how=='bottom': return [float(pts[:,0].mean()), float(pts[:,1].min()), float(pts[:,2].mean())]
piv={'body':[0,0,0]}
for i,nm in enumerate(NAMES[1:],1):
    m=lab==i
    if nm.startswith('cannon'): piv[nm]=pv(m,'bottom')
    elif nm=='head': piv[nm]=[0.0, 0.0, 0.42]
    elif nm.endswith('up'): piv[nm]=pv(m,'top')
    else: piv[nm]=pv(m,'top')
foot={}
for nm in ['FL','FR','BL','BR']:
    pts=P[T[lab==NAMES.index(nm+'lo')]].reshape(-1,3); lo=pts[pts[:,1]<pts[:,1].min()+0.04]; foot[nm]=[float(lo[:,0].mean()),float(pts[:,1].min()),float(lo[:,2].mean())]
parent={'cannonL':'body','cannonR':'body','head':'body','FLup':'body','FRup':'body','BLup':'body','BRup':'body','FLlo':'FLup','FRlo':'FRup','BLlo':'BLup','BRlo':'BRup'}
ti=mat['pbrMetallicRoughness']['baseColorTexture']['index']; tex=imgs[J['textures'][ti]['source']].convert('RGB').resize((2048,2048),Image.LANCZOS)
b=io.BytesIO(); tex.save(b,'JPEG',quality=88); texs='data:image/jpeg;base64,'+base64.b64encode(b.getvalue()).decode()
Pv=P[T].reshape(-1,3).astype(np.float32); UVv=UV[T].reshape(-1,2).astype(np.float32); Nf=np.cross(P[T[:,1]]-P[T[:,0]],P[T[:,2]]-P[T[:,0]]); Nf/=np.linalg.norm(Nf,axis=1,keepdims=True)+1e-12
Nv=(N[T].reshape(-1,3) if N is not None else np.repeat(Nf,3,0)).astype(np.float32); Pid=np.repeat(lab,3).astype(np.float32)
f32=lambda a: base64.b64encode(np.ascontiguousarray(a,dtype=np.float32).tobytes()).decode()
json.dump({'p':f32(Pv),'n':f32(Nv),'uv':f32(UVv),'part':f32(Pid),'tex':texs,'names':NAMES,'piv':piv,'parent':parent,'foot':foot},open('rhino.json','w'))
print({n:int((lab==i).sum()) for i,n in enumerate(NAMES)}); print(piv)
