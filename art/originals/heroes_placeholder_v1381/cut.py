from PIL import Image;import numpy as np,cv2
A=np.asarray(Image.open('sheet.png').convert('RGBA')).astype(np.float32); H,W,_=A.shape
names=[['gareth','lyra','roran','kessa'],['sera','torvald','hanzo',None]]
cw=W/4; ch=H/2
for r in range(2):
  for c in range(4):
    n=names[r][c]
    if not n: continue
    x0,x1=int(c*cw),int((c+1)*cw); y0,y1=int(r*ch),int((r+1)*ch)
    t=A[y0:y1,x0:x1].copy(); al=t[...,3]
    solid=(al>40).astype(np.uint8)
    k,lab,st,_=cv2.connectedComponentsWithStats(solid,8)
    big=st[1:,cv2.CC_STAT_AREA].max()
    keep=np.zeros_like(solid)
    for i in range(1,k):
      if st[i,cv2.CC_STAT_AREA]>big*0.02: keep|=(lab==i).astype(np.uint8)
    keep=cv2.dilate(keep,np.ones((5,5),np.uint8))
    t[...,3]=al*keep
    # defringe: semi-transparent edge pixels -> pull colour toward nearby solid colour, drop red halo
    edge=(t[...,3]>0)&(t[...,3]<230)
    rgb=t[...,:3].astype(np.uint8); m=(edge).astype(np.uint8)
    fill=cv2.inpaint(rgb,m,3,cv2.INPAINT_TELEA).astype(np.float32)
    t[...,:3]=np.where(edge[...,None],fill,t[...,:3])
    ys,xs=np.where(t[...,3]>8); t=t[ys.min():ys.max()+1,xs.min():xs.max()+1]
    im=Image.fromarray(t.clip(0,255).astype(np.uint8),'RGBA')
    im.save('fig_'+n+'.png')
    # 3:4 card: fit inside 360x480, bottom aligned, centred
    s=min(360/im.width,480/im.height); im2=im.resize((round(im.width*s),round(im.height*s)),Image.LANCZOS)
    C=Image.new('RGBA',(360,480),(0,0,0,0)); C.alpha_composite(im2,((360-im2.width)//2,480-im2.height)); C.save('card_'+n+'.png')
    print(n,im.size,'->',im2.size)
