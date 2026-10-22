from PIL import Image;import numpy as np,cv2
A=np.asarray(Image.open('orig.png').convert('RGB')).astype(np.float32); H,W,_=A.shape
bg=np.median(np.concatenate([A[:8].reshape(-1,3),A[-8:].reshape(-1,3),A[:,:8].reshape(-1,3),A[:,-8:].reshape(-1,3)]),0); print('bg',bg)
d=np.sqrt(((A-bg)**2).sum(2))
near=(d<70).astype(np.uint8)
ff=near.copy(); m=np.zeros((H+2,W+2),np.uint8)
for x in range(0,W,5):
  for y in (0,H-1):
    if ff[y,x]==1: cv2.floodFill(ff,m,(x,y),2)
for y in range(0,H,5):
  for x in (0,W-1):
    if ff[y,x]==1: cv2.floodFill(ff,m,(x,y),2)
outside=(ff==2)
# soft alpha in a band around the outside region
band=cv2.dilate(outside.astype(np.uint8),np.ones((5,5),np.uint8)).astype(bool)&~outside
a=np.ones((H,W),np.float32); a[outside]=0
soft=np.clip((d-30)/120,0,1); a[band]=soft[band]
# unmix bg from fringe
al=a[...,None]; fg=np.where(al>0.02,(A-(1-al)*bg)/np.maximum(al,0.02),A).clip(0,255)
# despill on fringe: limit magenta tint (r and b both high vs g) only on band pixels
f=fg.copy(); spill=band&(f[...,0]>f[...,1]+40)&(f[...,2]>f[...,1]+40)
mx=np.maximum(f[...,1],np.minimum(f[...,0],f[...,2])*0.6)
f[spill,0]=np.minimum(f[spill,0],mx[spill]+40); f[spill,2]=np.minimum(f[spill,2],mx[spill]+40)
out=np.dstack([f,a*255]).clip(0,255).astype(np.uint8)
ys,xs=np.where(out[...,3]>8); im=Image.fromarray(out,'RGBA').crop((xs.min(),ys.min(),xs.max()+1,ys.max()+1)); im.save('caelum_cut.png'); print(im.size)
for c,n in [((40,40,60,255),'z_dark.png'),((255,255,255,255),'z_white.png')]:
  B=Image.new('RGBA',im.size,c); B.alpha_composite(im); B.resize((im.width//2,im.height//2)).save(n)
