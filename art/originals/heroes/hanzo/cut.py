from PIL import Image;import numpy as np,cv2
S=Image.open('sheet.png').convert('RGB'); print(S.size)
A=np.asarray(S).astype(np.float32)[:, 1532:2024]; H,W,_=A.shape
lum=A.mean(2); sat=A.max(2)-A.min(2)
bgl=cv2.GaussianBlur(lum,(0,0),25)
cand=((lum>118)&(sat<40)).astype(np.uint8)
ff=cand.copy(); m=np.zeros((H+2,W+2),np.uint8)
for x in range(0,W,3):
  for y in (0,H-1):
    if ff[y,x]==1: cv2.floodFill(ff,m,(x,y),2)
for y in range(0,H,3):
  for x in (0,W-1):
    if ff[y,x]==1: cv2.floodFill(ff,m,(x,y),2)
out=(ff==2)
# shadow under feet: light grey, keep as bg
band=cv2.dilate(out.astype(np.uint8),np.ones((3,3),np.uint8)).astype(bool)&~out
a=np.ones((H,W),np.float32); a[out]=0; a[band]=np.clip((150-lum[band])/60,0,1)
# estimate bg colour for unmix: inpaint bg from outside
bgimg=cv2.inpaint(A.astype(np.uint8),(~out).astype(np.uint8),5,cv2.INPAINT_TELEA).astype(np.float32)
al=a[...,None]; fg=np.where(al>0.02,(A-(1-al)*bgimg)/np.maximum(al,0.02),A).clip(0,255)
im=Image.fromarray(np.dstack([fg,a*255]).astype(np.uint8),'RGBA')
ys,xs=np.where(a>0.05); im=im.crop((xs.min(),ys.min(),xs.max()+1,ys.max()+1)); im.save('hanzo_cut.png'); print(im.size)
for c,n in [((240,190,60,255),'z1.png'),((60,200,60,255),'z2.png')]:
  B=Image.new('RGBA',im.size,c); B.alpha_composite(im); B.save(n)
