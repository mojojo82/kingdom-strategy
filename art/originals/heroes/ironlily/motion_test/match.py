import numpy as np, glob, cv2, json
F=[]  # (vid, idx, arr)
for vi,vid in enumerate(['f1','f2']):
  for k,f in enumerate(sorted(glob.glob(vid+'/*.npy'))): F.append((vi,k,f))
def info(f):
  a=np.load(f); al=a[...,3].astype(np.float32)/255; r,g,b=[a[...,i].astype(np.float32) for i in range(3)]
  red=((r>140)&(r>g+60)&(r>b+40)&(al>0.4)).astype(np.float32)
  body=((al>0.5)&(red<0.5)).astype(np.float32)
  ys,xs=np.where(body>0)
  if len(xs)<50: ys,xs=np.where(al>0.5)
  ax=float(np.median(xs)); ay=float(ys.max())
  return a,al,red,body,ax,ay
DESC=[];ANC=[]
for vi,k,f in F:
  a,al,red,body,ax,ay=info(f)
  M=np.float32([[1,0,140-ax],[0,1,260-ay]])
  B=cv2.warpAffine(body,M,(280,290)); Rd=cv2.warpAffine(red,M,(280,290))
  d=np.concatenate([cv2.resize(B,(28,29),interpolation=cv2.INTER_AREA).ravel(), 0.7*cv2.resize(Rd,(28,29),interpolation=cv2.INTER_AREA).ravel()])
  DESC.append(d); ANC.append((ax,ay))
DESC=np.array(DESC); N=len(F)
# motion-aware: concat with frame +2 (same video)
nxt=[i+2 if i+2<N and F[i+2][0]==F[i][0] else i for i in range(N)]
D2=np.concatenate([DESC,DESC[nxt]],1)
sq=(D2**2).sum(1); dist=np.sqrt(np.maximum(sq[:,None]+sq[None,:]-2*D2@D2.T,0))
np.save('dist.npy',dist); json.dump({'F':[[v,k,f] for v,k,f in F],'anc':ANC},open('frames.json','w'))
# candidate jumps
jumps=[]
for i in range(N):
  for j in range(N):
    same=F[i][0]==F[j][0]
    if same and abs(F[i][1]-F[j][1])<20: continue
    jumps.append((dist[i,j],i,j))
jumps.sort(); thr=np.percentile([d for d,_,_ in jumps],1.0)
print('N',N,'thr',thr, 'best',jumps[:10])
good=[(i,j,float(d)) for d,i,j in jumps if d<=thr]
cross=sum(1 for i,j,d in good if F[i][0]!=F[j][0]); print('good',len(good),'cross-video',cross)
json.dump(good,open('jumps.json','w'))
