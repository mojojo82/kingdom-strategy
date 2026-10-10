import sys; sys.path.insert(0,'/tmp/claude-0/glb')
from load import load
import numpy as np, json, base64
J,P,N,UV,I,mat,imgs=load('/tmp/claude-0/glb/ship.glb'); tl=np.load('/tmp/claude-0/glb/tl.npy')
keep=~np.isin(tl,[3,7,4,6,5,1]); I=I[keep]
tex=np.asarray(imgs[0]).astype(float); h,w=tex.shape[:2]
def sample(uv): u=np.clip((uv[...,0]%1)*w,0,w-1).astype(int); v=np.clip((uv[...,1]%1)*h,0,h-1).astype(int); return tex[v,u]
cell=float(sys.argv[1]) if len(sys.argv)>1 else 0.025
lo=P[I].reshape(-1,3).min(0)
g=np.floor((P-lo)/cell).astype(np.int64); key=g[:,0]*1000003+g[:,1]*1009+g[:,2]
uk,cid=np.unique(key,return_inverse=True); cid=cid.ravel(); nc=len(uk)
# cluster position = mean of member vertices used by kept tris
used=np.unique(I); cnt=np.bincount(cid[used],minlength=nc).astype(float)
pos=np.zeros((nc,3)); np.add.at(pos,cid[used],P[used]); pos/=np.maximum(cnt,1)[:,None]
# colour per cluster: area-weighted triangle colour (3 samples per tri)
tri=P[I]; area=np.linalg.norm(np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0]),axis=1)*0.5
tc=(sample(UV[I[:,0]])+sample(UV[I[:,1]])+sample(UV[I[:,2]])+sample(UV[I].mean(1))*2)/5
col=np.zeros((nc,3)); wsum=np.zeros(nc)
for k in range(3): np.add.at(col,cid[I[:,k]],tc*area[:,None]); np.add.at(wsum,cid[I[:,k]],area)
col/=np.maximum(wsum,1e-12)[:,None]
T=cid[I]; T=T[(T[:,0]!=T[:,1])&(T[:,1]!=T[:,2])&(T[:,0]!=T[:,2])]
T=np.unique(np.sort(T,axis=1),axis=0, return_index=False) if False else T
# drop duplicate tris (same 3 verts any order)
s=np.sort(T,axis=1); _,ix=np.unique(s,axis=0,return_index=True); T=T[np.sort(ix)]
vu=np.unique(T); remap=-np.ones(nc,int); remap[vu]=np.arange(len(vu)); T=remap[T]; pos=pos[vu]; col=col[vu]
print('cell',cell,'verts',len(pos),'tris',len(T))
np.savez('/tmp/claude-0/glb/dec.npz',pos=pos,col=col,T=T)
