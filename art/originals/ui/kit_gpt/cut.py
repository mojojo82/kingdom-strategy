from PIL import Image;import numpy as np,cv2,sys
A=np.asarray(Image.open('sheet.png').convert('RGB')).astype(np.float32)
P={'panel':(14,28,754,650),'close':(1048,176,1210,320),'card':(752,312,1003,563),'card_sel':(1005,310,1262,566),'card_lock':(1260,312,1520,563),
'b_shield':(1008,583,1126,700),'b_gem':(1130,583,1248,700),'b_bow':(1252,583,1372,700),'b_crown':(1377,583,1497,700),
'starbar':(1024,703,1472,803),'btn_red':(18,830,558,978),'btn_blue':(560,830,1100,978),'slot':(752,560,993,795)}
def fitbg(x0,y0,x1,y1,ring=5):
  ys,xs=np.mgrid[y0:y1,x0:x1]; m=np.zeros((y1-y0,x1-x0),bool); m[:ring]=1;m[-ring:]=1;m[:,:ring]=1;m[:,-ring:]=1
  X=np.stack([np.ones(m.sum()),xs[m],ys[m],xs[m]**2,ys[m]**2,xs[m]*ys[m]],1); out=np.zeros((y1-y0,x1-x0,3),np.float32)
  Xa=np.stack([np.ones(xs.size),xs.ravel(),ys.ravel(),xs.ravel()**2,ys.ravel()**2,(xs*ys).ravel()],1)
  for c in range(3):
    v=A[y0:y1,x0:x1,c][m]; coef,*_=np.linalg.lstsq(X,v,rcond=None); out[...,c]=(Xa@coef).reshape(out.shape[:2])
  return out
for n,(x0,y0,x1,y1) in P.items():
  c=A[y0:y1,x0:x1]; bg=fitbg(x0,y0,x1,y1)
  d=np.sqrt(((c-bg)**2).sum(2)); a=np.clip((d-10)/45,0,1)
  solid=(a>0.6).astype(np.uint8)
  nl,lab,st,_=cv2.connectedComponentsWithStats(solid); 
  keep=np.zeros_like(solid)
  big=np.argsort(-st[1:,cv2.CC_STAT_AREA])[:1]+1
  for k in big: keep|=(lab==k).astype(np.uint8)
  h,w=keep.shape; ff=keep.copy(); fm=np.zeros((h+2,w+2),np.uint8); cv2.floodFill(ff,fm,(0,0),2); inside=(ff!=2).astype(np.float32)
  inside=cv2.erode(inside,np.ones((3,3),np.uint8))
  # alpha: inside=1, edge softness from a, but only near the kept component
  near=cv2.dilate(keep,np.ones((3,3),np.uint8)).astype(np.float32)
  al=np.maximum(inside,a*near)
  fg=np.where(al[...,None]>0.02,(c-(1-al[...,None])*bg)/np.maximum(al[...,None],0.02),c).clip(0,255)
  ys,xs=np.where(al>0.05); bx=(xs.min(),ys.min(),xs.max()+1,ys.max()+1)
  im=Image.fromarray(np.dstack([fg,al*255]).astype(np.uint8),'RGBA').crop(bx); im.save('p_'+n+'.png'); print(n,im.size)
