import numpy as np, cv2, glob, json, subprocess, sys
from PIL import Image
from keyfn import key4
def key_old(rgb):
  a=rgb.astype(np.float32); r,g,b=a[...,0],a[...,1],a[...,2]
  spill=g-np.maximum(r,b); alpha=np.clip(1-(spill-40)/90,0,1)
  alpha=cv2.GaussianBlur(alpha,(5,5),0)
  m=np.maximum(r,b); g2=np.minimum(g,m+10)
  return np.dstack([r,g2,b]).clip(0,255).astype(np.uint8), alpha
meta={}
for vid,src,big in [('f1','demo.mp4','big1'),('f2','combo.mp4','big2')]:
  W,H=2560,1440
  p=subprocess.Popen(['ffmpeg','-v','error','-i',src,'-f','rawvideo','-pix_fmt','rgb24','-'],stdout=subprocess.PIPE)
  k=0
  while True:
    buf=p.stdout.read(W*H*3)
    if len(buf)<W*H*3: break
    rgb=np.frombuffer(buf,np.uint8).reshape(H,W,3); c,al=key4(rgb)
    m=(al>0.5).astype(np.uint8); n,lab,st,_=cv2.connectedComponentsWithStats(m)
    if n>1:
      bg=1+np.argmax(st[1:,4]); keep=np.zeros_like(m)
      for i in range(1,n):
        if st[i,4]>=max(200,st[bg,4]*0.03): keep|=(lab==i)
      al=al*cv2.dilate(keep,np.ones((9,9),np.uint8))
    A=(al*255).astype(np.uint8); rgba=np.dstack([c,A])
    ys,xs=np.where(A>8); x0,y0,x1,y1=max(xs.min()-4,0),max(ys.min()-4,0),min(xs.max()+5,W),min(ys.max()+5,H)
    Image.fromarray(rgba[y0:y1,x0:x1],'RGBA').save(f'{big}/{k:04d}.png',optimize=False,compress_level=3)
    meta[f'{big}/{k:04d}.png']=[int(x0),int(y0)]
    small=cv2.resize(rgba,(853,480),interpolation=cv2.INTER_AREA)
    np.save(f'{vid}/{k:04d}.npy',small); k+=1
  print(vid,k,flush=True)
json.dump(meta,open('bigmeta.json','w'))
