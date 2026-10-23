import numpy as np, cv2, glob, json
from PIL import Image
def key(rgb):
  a=rgb.astype(np.float32); r,g,b=a[...,0],a[...,1],a[...,2]
  spill=g-np.maximum(r,b)                       # >0 on green
  alpha=np.clip(1-(spill-40)/90,0,1)            # strong green -> 0
  alpha=cv2.GaussianBlur(alpha,(3,3),0)
  m=np.maximum(r,b); g2=np.minimum(g,m+10)      # despill
  out=np.dstack([r,g2,b]).clip(0,255)
  return out.astype(np.uint8), alpha
data={}
for vid in ['f1','f2']:
  fr=sorted(glob.glob(vid+'/*.png')); frames=[]
  for f in fr:
    rgb=np.asarray(Image.open(f).convert('RGB')); c,al=key(rgb)
    m=(al>0.5).astype(np.uint8)
    n,lab,st,_=cv2.connectedComponentsWithStats(m)
    if n>1:
      big=1+np.argmax(st[1:,4]); keep=np.zeros_like(m)
      for i in range(1,n):
        if st[i,4]>=max(30,st[big,4]*0.03): keep|=(lab==i)
      al=al*cv2.dilate(keep,np.ones((5,5),np.uint8))
    np.save(f.replace('.png','.npy'), np.dstack([c,(al*255).astype(np.uint8)]))
  print(vid,len(fr))
