import sys; sys.path.insert(0,'/tmp/claude-0/glb')
from load import load
import numpy as np
J,P,N,UV,I,mat,imgs=load('/tmp/claude-0/glb/ship.glb'); tl=np.load('/tmp/claude-0/glb/tl.npy')
I=I[~np.isin(tl,[3,7,4,6,5,1])]
tex=np.asarray(imgs[0]).astype(float); h,w=tex.shape[:2]
def sample(uv): u=np.clip((uv[...,0]%1)*w,0,w-1).astype(int); v=np.clip((uv[...,1]%1)*h,0,h-1).astype(int); return tex[v,u]
cell=float(sys.argv[1]); out=sys.argv[2]
lo=P[I].reshape(-1,3).min(0); g=np.floor((P-lo)/cell).astype(np.int64); key=g[:,0]*1000003+g[:,1]*1009+g[:,2]
uk,cid=np.unique(key,return_inverse=True); cid=cid.ravel(); nc=len(uk)
used=np.unique(I); cnt=np.bincount(cid[used],minlength=nc).astype(float); pos=np.zeros((nc,3)); np.add.at(pos,cid[used],P[used]); pos/=np.maximum(cnt,1)[:,None]
tri=P[I]; area=np.linalg.norm(np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0]),axis=1)*0.5
tc=(sample(UV[I[:,0]])+sample(UV[I[:,1]])+sample(UV[I[:,2]])+sample(UV[I].mean(1))*3)/6
T=cid[I]; ok=(T[:,0]!=T[:,1])&(T[:,1]!=T[:,2])&(T[:,0]!=T[:,2]); T=T[ok]; tc=tc[ok]; area=area[ok]
s=np.sort(T,axis=1); fk=s[:,0]*(nc*nc)+s[:,1]*nc+s[:,2]; uf,first,fid=np.unique(fk,return_index=True,return_inverse=True); fid=fid.ravel()
F=T[first]; fc=np.zeros((len(F),3)); fw=np.zeros(len(F)); np.add.at(fc,fid,tc*area[:,None]); np.add.at(fw,fid,area); fc/=np.maximum(fw,1e-12)[:,None]
# unshare vertices: 3 per face, one colour per face (flat)
V=pos[F].reshape(-1,3); C=np.repeat(fc,3,axis=0); T2=np.arange(len(V)).reshape(-1,3)
print('cell',cell,'faces',len(F),'verts',len(V))
np.savez(out,pos=V,col=C,T=T2)
