from PIL import Image;import numpy as np, cv2, json
a=np.asarray(Image.open('formations.png').convert('RGB')).astype(np.float32)
def B(x0,x1,yc,h=19): return (x0,yc-h,x1,yc+h)
boxes={'title':B(238,452,48,24),'res_name':B(254,382,152),'res_sub':B(254,592,187,12),'res_cnt':B(762,888,170),
}
cards=[(1,294,350,409,412,476,536,601),(2,707,760,816,819,882,941,1004),(3,1101,1157,1210,1213,1275,1333,1394)]
for n,t,m,inf,eq,pr,iii,bt in cards:
  k='c%d_'%n
  boxes.update({k+'name':B(236,416,t),k+'badge':B(44,78,t+26 if n==1 else t+24,16),k+'march':B(266,470,m),k+'inf':B(252,354,inf),k+'inf_n':B(664,764,inf),
   k+'eq':B(856,950,eq,16),k+'pre':B(851,917,pr,16),k+'I':B(834,862,iii,15),k+'III':B(922,970,iii,15)})
  if n==1: boxes.update({k+'pill':B(802,952,t,15),k+'save':B(204,266,bt,15),k+'sel':B(496,594,bt,15),k+'rel':B(752,944,bt,15)})
  else: boxes.update({k+'pill':B(817,950,t,15),k+'save':B(304,366,bt,15),k+'dep':B(710,800,bt,18)})
boxes.update({'add':B(248,402,1485,16),'mgr':B(772,932,1486,16)})
out=a.copy()
for k,(x0,y0,x1,y1) in boxes.items():
  r=out[y0:y1,x0:x1]; h,w,_=r.shape
  L=np.median(r[:,:4],axis=1);R=np.median(r[:,-4:],axis=1)
  L=cv2.medianBlur(L[:,None,:].astype(np.float32),5)[:,0,:] if False else L
  t=np.linspace(0,1,w)[None,:,None]
  uni=any(q in k for q in ('save','dep','pill','rel','add','mgr','sel'))
  if uni: L=R
  base=L[:,None,:]*(1-t)+R[:,None,:]*t
  mask=(np.abs(r-base).max(2)>26).astype(np.uint8)
  mask=cv2.dilate(mask,np.ones((5,5),np.uint8)); mask[:,-4:]=0
  if not uni: mask[:,:4]=0
  f=r.copy()
  for y in range(h):
    xs=np.where(mask[y]==0)[0]
    for c in range(3): f[y,:,c]=np.interp(np.arange(w),xs,r[y,xs,c])
  # light vertical blur only on filled pixels to kill streaks
  fb=cv2.GaussianBlur(f,(1,7),0)
  m3=mask[...,None].astype(np.float32)
  out[y0:y1,x0:x1]=r*(1-m3)+fb*m3
for n,t,m,inf,eq,pr,iii,bt in cards:
  col=out[eq-16:eq+17,905:906]
  out[pr-16:pr+17,852:917]=np.repeat(col,65,axis=1)
Image.fromarray(out.clip(0,255).astype(np.uint8)).save('form_clean.png')
json.dump(boxes,open('boxes.json','w'))
