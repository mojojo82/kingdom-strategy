from PIL import Image;import numpy as np, cv2
A=np.asarray(Image.open('form_clean.png').convert('RGB')).astype(np.float32)
base=A[247:659].copy()
def rowfill(img,x0,x1,y0,y1):
  L=img[y0:y1,x0-2:x0+1].mean(1);R=img[y0:y1,x1:x1+3].mean(1)
  t=np.linspace(0,1,x1-x0)[None,:,None]
  img[y0:y1,x0:x1]=L[:,None]*(1-t)+R[:,None]*t
# slider wipe
rowfill(base,368,642,140,183)
def banner(top):
  src=A[top+1:top+1+412]
  d=np.abs(src[:240,:216]-base[:240,:216]).max(2)
  m=(d>40).astype(np.uint8)
  P=np.zeros_like(m); P[:130,:211]=1; P[130:183,:200]=1; P[183:240,:152]=1; m*=P
  m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((7,7),np.uint8)); m*=P
  m=cv2.dilate(m,np.ones((3,3),np.uint8))
  # keep largest component
  n,lab,stats,_=cv2.connectedComponentsWithStats(m)
  k=1+np.argmax(stats[1:,cv2.CC_STAT_AREA]); m=(lab==k).astype(np.float32)
  # fill holes
  ff=m.astype(np.uint8).copy(); h,w=ff.shape; fm=np.zeros((h+2,w+2),np.uint8); cv2.floodFill(ff,fm,(0,0),2); m=np.maximum(m,(ff==0).astype(np.float32))
  m=cv2.GaussianBlur(m,(3,3),0)[...,None]
  out=base.copy(); out[:240,:216]=src[:240,:216]*m+base[:240,:216]*(1-m)
  return out,m
red,mr=banner(659); pur,mp=banner(1054)
for n,im in [('card_blue',base),('card_red',red),('card_purple',pur)]:
  Image.fromarray(im.clip(0,255).astype(np.uint8)).save('fs/'+n+'.png')
Image.fromarray((mr[...,0]*255).astype(np.uint8)).save('fs/mask_red.png')
# blue select button from red card deploy (abs y 1004)
b=A[1004-34:1004+34,520:921].copy()
rowfill(b,140,200,0,68)
Image.fromarray(b.clip(0,255).astype(np.uint8)).save('fs/btn_blue.png')
# brown pill from red card
p=A[659+18:659+82,750:975].copy()
Image.fromarray(p.clip(0,255).astype(np.uint8)).save('fs/pill_brown.png')
# guard patch
g=base[128:266,770:995].copy(); rowfill(g,8,215,0,138)
Image.fromarray(g.clip(0,255).astype(np.uint8)).save('fs/guard_patch.png')
