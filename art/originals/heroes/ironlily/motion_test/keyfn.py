import numpy as np,cv2
BG=np.array([4,250,0],np.float32)
def key4(rgb):
  a=rgb.astype(np.float32); r,g,b=a[...,0],a[...,1],a[...,2]
  spill=g-np.maximum(r,b)
  al=np.clip(1-(spill-30)/140,0,1)
  al=cv2.GaussianBlur(al,(3,3),0)
  A=al[...,None]; fg=((a-(1-A)*BG)/np.maximum(A,0.25)).clip(0,255)
  fr,fg_,fb=fg[...,0],fg[...,1],fg[...,2]
  fg_=np.minimum(fg_,np.maximum(fr,fb)+8)
  red=((al<0.97)&(fr>fb+30))|((fr>120)&(fb<60)&(fg_>fb+20))
  fg_=np.where(red,np.minimum(fg_,fb+0.2*(fr-fb)),fg_)
  al=np.where(al<0.08,0,al)
  return np.dstack([fr,fg_,fb]).astype(np.uint8),al
