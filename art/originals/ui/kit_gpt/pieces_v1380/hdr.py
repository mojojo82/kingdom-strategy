from PIL import Image;import numpy as np,cv2,math
A=np.asarray(Image.open('../hp2/sheet.png').convert('RGB')).astype(np.float32)
def fitbg(x0,y0,x1,y1,ring=5):
  ys,xs=np.mgrid[y0:y1,x0:x1]; m=np.zeros((y1-y0,x1-x0),bool); m[:ring]=1;m[-ring:]=1;m[:,:ring]=1;m[:,-ring:]=1
  X=np.stack([np.ones(m.sum()),xs[m],ys[m],xs[m]**2,ys[m]**2,xs[m]*ys[m]],1); out=np.zeros((y1-y0,x1-x0,3),np.float32)
  Xa=np.stack([np.ones(xs.size),xs.ravel(),ys.ravel(),xs.ravel()**2,ys.ravel()**2,(xs*ys).ravel()],1)
  for c in range(3):
    coef,*_=np.linalg.lstsq(X,A[y0:y1,x0:x1,c][m],rcond=None); out[...,c]=(Xa@coef).reshape(out.shape[:2])
  return out
x0,y0,x1,y1=762,34,1516,188
c=A[y0:y1,x0:x1]; bg=fitbg(x0,y0,x1,y1); d=np.sqrt(((c-bg)**2).sum(2)); a=np.clip((d-10)/45,0,1)
solid=(a>0.6).astype(np.uint8); n,lab,st,_=cv2.connectedComponentsWithStats(solid); k=1+np.argmax(st[1:,4]); keep=(lab==k).astype(np.uint8)
hh,ww=keep.shape; ff=keep.copy(); fm=np.zeros((hh+2,ww+2),np.uint8); cv2.floodFill(ff,fm,(0,0),2); inside=cv2.erode((ff!=2).astype(np.float32),np.ones((3,3),np.uint8))
al=np.maximum(inside,a*cv2.dilate(keep,np.ones((3,3),np.uint8)))
fg=np.where(al[...,None]>0.02,(c-(1-al[...,None])*bg)/np.maximum(al[...,None],0.02),c).clip(0,255)
ys,xs=np.where(al>0.05); im=Image.fromarray(np.dstack([fg,al*255]).astype(np.uint8),'RGBA').crop((xs.min(),ys.min(),xs.max()+1,ys.max()+1)); im.save('bar.png'); print('bar',im.size)
h=np.asarray(Image.open('../kit/p/header_clean.png').convert('RGBA')).astype(np.float32)
cx,cy=169.5,68.5; R=72.5
pts=[(cx+R*math.cos(math.radians(22.5+45*k))/math.cos(math.radians(22.5)),cy+R*math.sin(math.radians(22.5+45*k))/math.cos(math.radians(22.5))) for k in range(8)]
m=np.zeros(h.shape[:2],np.uint8); cv2.fillPoly(m,[np.array([(round(x*4),round(y*4)) for x,y in pts],np.int32)],1,lineType=cv2.LINE_AA,shift=2)
h[...,3]=np.minimum(h[...,3],cv2.GaussianBlur(m.astype(np.float32),(3,3),0.7)*255)
ys,xs=np.where(h[...,3]>5); im=Image.fromarray(h.clip(0,255).astype(np.uint8),'RGBA').crop((xs.min(),ys.min(),xs.max()+1,ys.max()+1)); im.save('badge.png'); print('badge',im.size)
