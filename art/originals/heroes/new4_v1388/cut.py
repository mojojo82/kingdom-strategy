from PIL import Image;import numpy as np,cv2
A=np.asarray(Image.open('sheet.png').convert('RGB')).astype(np.float32)
cards={'vesper':3,'aurek':280,'seraphine':557,'halo7':834}
Y0,Y1=740,994
for n,x0 in cards.items():
  c=A[Y0:Y1,x0+7:x0+249].copy(); H,W,_=c.shape
  # bg model: per-row colour from side columns where they look like flat card colour; fallback to top rows
  top=np.median(c[2:14].reshape(-1,3),0)
  side=np.concatenate([c[:,:4],c[:,-4:]],1)       # H x 8 x 3
  sd=np.sqrt(((side-top)**2).sum(2))
  bgrow=np.zeros((H,3),np.float32); last=top
  for y in range(H):
    ok=side[y][sd[y]<60]
    if len(ok)>=2: last=ok.mean(0)
    bgrow[y]=last
  bgrow=cv2.GaussianBlur(bgrow[:,None,:],(1,15),0)[:,0,:]
  bg=np.repeat(bgrow[:,None,:],W,1)
  d=np.sqrt(((c-bg)**2).sum(2))
  near=(d<38).astype(np.uint8)
  ff=near.copy(); m=np.zeros((H+2,W+2),np.uint8)
  seeds=[(x,0) for x in range(0,W,3)]+[(0,y) for y in range(0,H,3)]+[(W-1,y) for y in range(0,H,3)]
  for x,y in seeds:
    if ff[y,x]==1: cv2.floodFill(ff,m,(x,y),2)
  out=(ff==2)
  # badge: rounded box top-left -> background
  r,g,b=c[...,0],c[...,1],c[...,2]
  nav=((b>r+15)&((r+g+b)/3<120)).astype(np.uint8); nav[70:,:]=0; nav[:,72:]=0
  k,lab,st,_=cv2.connectedComponentsWithStats(nav); i=1+np.argmax(st[1:,4])
  pts=np.column_stack(np.where(lab==i))[:,::-1].astype(np.int32)
  hull=cv2.convexHull(pts); badge=np.zeros((H,W),np.uint8); cv2.fillPoly(badge,[hull],1); badge=cv2.dilate(badge,np.ones((11,11),np.uint8)).astype(bool)
  out|=badge
  if n=='vesper': out|=(d<30)
  band=cv2.dilate(out.astype(np.uint8),np.ones((3,3),np.uint8)).astype(bool)&~out
  a=np.ones((H,W),np.float32); a[out]=0; a[band]=np.clip((d[band]-20)/60,0,1)
  al=a[...,None]; fg=np.where(al>0.02,(c-(1-al)*bg)/np.maximum(al,0.02),c).clip(0,255)
  im=Image.fromarray(np.dstack([fg,a*255]).astype(np.uint8),'RGBA'); im.save('cut_'+n+'.png')
  s=480/H; im2=im.resize((round(W*s),480),Image.LANCZOS)
  C=Image.new('RGBA',(360,480),(0,0,0,0)); C.paste(im2,((360-im2.width)//2,0),im2); C.save('card_'+n+'.png')
  print(n,im.size,im2.size)
W=Image.new('RGBA',(4*370,490),(60,150,60,255))
for i,n in enumerate(cards): W.alpha_composite(Image.open('card_'+n+'.png'),(i*370,5))
W.save('z.png')
